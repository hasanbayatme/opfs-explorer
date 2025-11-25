import type { OpfsMessage, FileEntry, StorageEstimate, FileReadResult } from "../types";

// Content script that bridges the DevTools panel and the page's OPFS

console.log("OPFS Explorer Content Script Loaded");

chrome.runtime.onMessage.addListener(
  (
    request: unknown,
    _sender: chrome.runtime.MessageSender,
    sendResponse: (response?: unknown) => void
  ) => {
    const handleRequest = async () => {
      try {
        // Environment Checks
        if (!isSecureContext) {
          throw new Error(
            "OPFS requires a Secure Context (HTTPS or localhost)."
          );
        }
        if (!navigator.storage || !navigator.storage.getDirectory) {
          throw new Error(
            "OPFS API (navigator.storage.getDirectory) is not supported in this browser/context."
          );
        }

        const msg = request as OpfsMessage;

        switch (msg.type) {
          case "OPFS_List": {
            const files = await listOPFS(msg.path);
            sendResponse({ success: true, data: files });
            break;
          }
          case "OPFS_Read": {
            const content = await readFileOPFS(msg.path);
            sendResponse({ success: true, data: content });
            break;
          }
          case "OPFS_ReadWithMeta": {
            const result = await readFileWithMeta(msg.path);
            sendResponse({ success: true, data: result });
            break;
          }
          case "OPFS_Write": {
            await writeFileOPFS(msg.path, msg.content, msg.isBinary);
            sendResponse({ success: true });
            break;
          }
          case "OPFS_Rename": {
            await renameOPFS(msg.path, msg.newPath);
            sendResponse({ success: true });
            break;
          }
          case "OPFS_Move": {
            await moveOPFS(msg.oldPath, msg.newPath);
            sendResponse({ success: true });
            break;
          }
          case "OPFS_Create": {
            if (msg.kind === "directory") {
              await createDirectoryOPFS(msg.path);
            } else {
              await createFileOPFS(msg.path);
            }
            sendResponse({ success: true });
            break;
          }
          case "OPFS_Delete": {
            await deleteOPFS(msg.path);
            sendResponse({ success: true });
            break;
          }
          case "OPFS_Download": {
            await downloadOPFS(msg.path);
            sendResponse({ success: true });
            break;
          }
          case "OPFS_GetStorageEstimate": {
            const estimate = await getStorageEstimate();
            sendResponse({ success: true, data: estimate });
            break;
          }
          case "OPFS_Exists": {
            const exists = await checkExists(msg.path);
            sendResponse({ success: true, data: exists });
            break;
          }
          default:
            sendResponse({
              success: false,
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              error: `Unknown command: ${(msg as any).type}`,
            });
        }
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        console.error("OPFS Explorer Error:", message);
        sendResponse({ success: false, error: message });
      }
    };

    handleRequest();
    return true; // Async response
  }
);

// Helper to resolve a path string (e.g., "folder/subfolder") to a DirectoryHandle
async function resolvePath(path: string): Promise<FileSystemDirectoryHandle> {
  const root = await navigator.storage.getDirectory();
  if (!path || path === "") return root;

  const parts = path.split("/").filter((p) => p.length > 0);
  let current = root;
  for (const part of parts) {
    current = await current.getDirectoryHandle(part);
  }
  return current;
}

async function listOPFS(path = ""): Promise<FileEntry[]> {
  try {
    const dirHandle = await resolvePath(path);
    const files: FileEntry[] = [];
    // @ts-expect-error - iterating over async iterator
    for await (const [name, handle] of dirHandle.entries()) {
      const entry: FileEntry = {
        name,
        kind: handle.kind,
        path: path ? `${path}/${name}` : name,
      };

      // Get file metadata for files
      if (handle.kind === "file") {
        try {
          const file = await (handle as FileSystemFileHandle).getFile();
          entry.size = file.size;
          entry.lastModified = file.lastModified;
        } catch {
          // Ignore if we can't get file info
        }
      }

      files.push(entry);
    }
    return files.sort((a, b) => {
      if (a.kind === b.kind) return a.name.localeCompare(b.name);
      return a.kind === "directory" ? -1 : 1;
    });
  } catch (e) {
    console.error("Failed to list path:", path, e);
    throw new Error(`Could not list directory: ${path}`);
  }
}

// Helper to determine if a file is previewable as text
function isTextFile(file: File): boolean {
  const textExtensions = [
    ".txt", ".json", ".js", ".jsx", ".ts", ".tsx", ".css", ".scss", ".sass",
    ".html", ".htm", ".md", ".xml", ".yaml", ".yml", ".toml", ".ini", ".cfg",
    ".env", ".gitignore", ".sh", ".bash", ".zsh", ".fish", ".py", ".rb", ".php",
    ".java", ".c", ".cpp", ".h", ".hpp", ".rs", ".go", ".swift", ".kt", ".sql",
    ".graphql", ".vue", ".svelte", ".astro"
  ];
  const name = file.name.toLowerCase();
  return (
    file.type.startsWith("text/") ||
    file.type === "" ||
    file.type === "application/json" ||
    file.type === "application/javascript" ||
    file.type === "application/xml" ||
    textExtensions.some(ext => name.endsWith(ext))
  );
}

// Helper to determine if file is an image
function isImageFile(file: File): boolean {
  const imageExtensions = [".jpg", ".jpeg", ".png", ".gif", ".webp", ".svg", ".ico", ".bmp", ".avif"];
  const name = file.name.toLowerCase();
  return (
    file.type.startsWith("image/") ||
    imageExtensions.some(ext => name.endsWith(ext))
  );
}

// Helper to get MIME type
function getMimeType(file: File): string {
  if (file.type) return file.type;
  const name = file.name.toLowerCase();
  const ext = name.split('.').pop();
  const mimeMap: Record<string, string> = {
    jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', gif: 'image/gif',
    webp: 'image/webp', svg: 'image/svg+xml', ico: 'image/x-icon', bmp: 'image/bmp',
    avif: 'image/avif', json: 'application/json', js: 'application/javascript',
    html: 'text/html', css: 'text/css', xml: 'application/xml', md: 'text/markdown',
    txt: 'text/plain'
  };
  return mimeMap[ext || ''] || 'application/octet-stream';
}

async function readFileOPFS(path: string) {
  if (!path) throw new Error("File path required");
  const parts = path.split("/");
  const fileName = parts.pop();
  const dirPath = parts.join("/");

  const dirHandle = await resolvePath(dirPath);
  if (!fileName) throw new Error("Invalid file path");

  const fileHandle = await dirHandle.getFileHandle(fileName);
  const file = await fileHandle.getFile();

  // Check size (Limit to 1MB for text preview)
  if (file.size > 1024 * 1024) {
    return `[BINARY_OR_LARGE] File is too large to preview (${(
      file.size /
      1024 /
      1024
    ).toFixed(2)} MB). Please download to view.`;
  }

  // Check if text or binary
  if (isTextFile(file)) {
    return await file.text();
  } else {
    return `[BINARY_OR_LARGE] Type: ${file.type}, Size: ${file.size} bytes.`;
  }
}

async function readFileWithMeta(path: string): Promise<FileReadResult> {
  if (!path) throw new Error("File path required");
  const parts = path.split("/");
  const fileName = parts.pop();
  const dirPath = parts.join("/");

  const dirHandle = await resolvePath(dirPath);
  if (!fileName) throw new Error("Invalid file path");

  const fileHandle = await dirHandle.getFileHandle(fileName);
  const file = await fileHandle.getFile();
  const mimeType = getMimeType(file);

  // For images, return as base64 data URL (up to 5MB for images)
  if (isImageFile(file)) {
    if (file.size > 5 * 1024 * 1024) {
      return {
        content: `[TOO_LARGE] Image is too large to preview (${(file.size / 1024 / 1024).toFixed(2)} MB)`,
        mimeType,
        size: file.size,
        isBase64: false
      };
    }
    const arrayBuffer = await file.arrayBuffer();
    const base64 = btoa(
      new Uint8Array(arrayBuffer).reduce((data, byte) => data + String.fromCharCode(byte), '')
    );
    return {
      content: `data:${mimeType};base64,${base64}`,
      mimeType,
      size: file.size,
      isBase64: true
    };
  }

  // For text files (up to 1MB)
  if (isTextFile(file)) {
    if (file.size > 1024 * 1024) {
      return {
        content: `[TOO_LARGE] File is too large to preview (${(file.size / 1024 / 1024).toFixed(2)} MB)`,
        mimeType,
        size: file.size,
        isBase64: false
      };
    }
    return {
      content: await file.text(),
      mimeType,
      size: file.size,
      isBase64: false
    };
  }

  // Binary files - return metadata only
  return {
    content: `[BINARY] Type: ${mimeType}, Size: ${file.size} bytes`,
    mimeType,
    size: file.size,
    isBase64: false
  };
}

async function writeFileOPFS(
  path: string,
  content: string,
  isBinary: boolean = false
) {
  if (!path) throw new Error("Path required");
  const parts = path.split("/");
  const fileName = parts.pop();
  const dirPath = parts.join("/");

  const dirHandle = await resolvePath(dirPath);
  if (!fileName) throw new Error("Invalid file path");

  const fileHandle = await dirHandle.getFileHandle(fileName, { create: true });
  const writable = await fileHandle.createWritable();

  if (isBinary) {
    // Convert base64 to Uint8Array
    const binaryString = atob(content);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    await writable.write(bytes);
  } else {
    await writable.write(content);
  }

  await writable.close();
}

async function renameOPFS(oldPath: string, newName: string) {
  // Simple rename in same directory
  if (!oldPath || !newName) throw new Error("Path and new name required");

  const parts = oldPath.split("/");
  const oldName = parts.pop();
  const dirPath = parts.join("/");

  const dirHandle = await resolvePath(dirPath);
  if (!oldName) throw new Error("Invalid path");

  let handle: FileSystemHandle;
  try {
    handle = await dirHandle.getFileHandle(oldName);
  } catch {
    handle = await dirHandle.getDirectoryHandle(oldName);
  }

  if ("move" in handle) {
    await handle.move(newName);
  } else {
    throw new Error("Rename (move) not supported in this browser version.");
  }
}

async function moveOPFS(oldPath: string, newPath: string) {
  if (!oldPath || !newPath) throw new Error("Old path and new path required");

  // Resolve Source Handle
  const oldParts = oldPath.split("/");
  const oldName = oldParts.pop();
  const oldDirPath = oldParts.join("/");
  const oldDirHandle = await resolvePath(oldDirPath);

  if (!oldName) throw new Error("Invalid old path");

  let handle: FileSystemHandle;
  try {
    handle = await oldDirHandle.getFileHandle(oldName);
  } catch {
    handle = await oldDirHandle.getDirectoryHandle(oldName);
  }

  // Resolve Destination Directory
  const newParts = newPath.split("/");
  const newName = newParts.pop();
  const newDirPath = newParts.join("/");
  const newDirHandle = await resolvePath(newDirPath);

  if (!newName) throw new Error("Invalid new path");

  if ("move" in handle) {
    await handle.move(newDirHandle, newName);
  } else {
    throw new Error("Move API not supported.");
  }
}

async function createDirectoryOPFS(path: string) {
  // Path includes the new folder name
  // e.g. "folder/newFolder"
  const parts = path.split("/");
  const newFolderName = parts.pop();
  const dirPath = parts.join("/");

  const dirHandle = await resolvePath(dirPath);
  if (!newFolderName) throw new Error("Invalid path");
  await dirHandle.getDirectoryHandle(newFolderName, { create: true });
}

async function createFileOPFS(path: string) {
  const parts = path.split("/");
  const newFileName = parts.pop();
  const dirPath = parts.join("/");

  const dirHandle = await resolvePath(dirPath);
  if (!newFileName) throw new Error("Invalid path");
  await dirHandle.getFileHandle(newFileName, { create: true });
}

async function deleteOPFS(path: string) {
  if (!path) throw new Error("Path required");
  const parts = path.split("/");
  const name = parts.pop();
  const dirPath = parts.join("/");

  const dirHandle = await resolvePath(dirPath);
  if (!name) throw new Error("Invalid path");

  await dirHandle.removeEntry(name, { recursive: true });
}

async function downloadOPFS(path: string) {
  if (!path) throw new Error("Path required");
  const parts = path.split("/");
  const fileName = parts.pop();
  const dirPath = parts.join("/");

  const dirHandle = await resolvePath(dirPath);
  if (!fileName) throw new Error("Invalid file path");

  const fileHandle = await dirHandle.getFileHandle(fileName);
  const file = await fileHandle.getFile();

  const url = URL.createObjectURL(file);
  const a = document.createElement("a");
  a.href = url;
  a.download = file.name;
  a.style.display = "none";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

async function getStorageEstimate(): Promise<StorageEstimate> {
  const estimate = await navigator.storage.estimate();
  return {
    usage: estimate.usage || 0,
    quota: estimate.quota || 0,
  };
}

async function checkExists(path: string): Promise<boolean> {
  if (!path) return true; // Root always exists

  const parts = path.split("/");
  const name = parts.pop();
  const dirPath = parts.join("/");

  try {
    const dirHandle = await resolvePath(dirPath);
    if (!name) return true;

    // Try to get as file first
    try {
      await dirHandle.getFileHandle(name);
      return true;
    } catch {
      // Try as directory
      try {
        await dirHandle.getDirectoryHandle(name);
        return true;
      } catch {
        return false;
      }
    }
  } catch {
    return false;
  }
}
