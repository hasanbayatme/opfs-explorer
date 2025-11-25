import type { FileEntry, StorageEstimate, FileReadResult } from "../types";
export type { FileEntry, StorageEstimate, FileReadResult };

/**
 * Helper to execute async code in the inspected page context.
 * Uses a polling mechanism to handle async operations since inspectedWindow.eval
 * doesn't natively await Promises.
 */
function evalInPage<T>(code: string): Promise<T> {
  return new Promise((resolve, reject) => {
    if (!chrome?.devtools?.inspectedWindow) {
      // Mock for local dev
      console.log("[Mock eval]", code.slice(0, 100) + "...");
      reject(new Error("DevTools not available in development mode"));
      return;
    }

    // Generate a unique ID for this operation
    const opId = `__opfs_${Date.now()}_${Math.random().toString(36).slice(2)}`;

    // Wrap the async code to store result in a global variable
    const wrappedCode = `
      (function() {
        window["${opId}"] = { status: "pending" };
        (async function() {
          try {
            const result = await (async function() {
              ${code}
            })();
            window["${opId}"] = { status: "done", result: result };
          } catch (err) {
            window["${opId}"] = { status: "error", error: err.message || String(err) };
          }
        })();
        return window["${opId}"];
      })()
    `;

    // First, start the async operation
    chrome.devtools.inspectedWindow.eval(
      wrappedCode,
      { useContentScriptContext: false },
      (initialResult, exceptionInfo) => {
        if (exceptionInfo) {
          const errorMsg = exceptionInfo.isError
            ? exceptionInfo.value
            : exceptionInfo.description || exceptionInfo.code || "Unknown error";
          reject(new Error(String(errorMsg)));
          return;
        }

        // Poll for the result
        const pollForResult = () => {
          chrome.devtools.inspectedWindow.eval(
            `window["${opId}"]`,
            { useContentScriptContext: false },
            (pollResult: { status: string; result?: T; error?: string }, pollException) => {
              if (pollException) {
                reject(new Error(pollException.description || "Polling error"));
                return;
              }

              if (!pollResult) {
                reject(new Error("No result from eval"));
                return;
              }

              if (pollResult.status === "pending") {
                // Still pending, poll again
                setTimeout(pollForResult, 10);
              } else if (pollResult.status === "done") {
                // Clean up and resolve
                chrome.devtools.inspectedWindow.eval(
                  `delete window["${opId}"]`,
                  { useContentScriptContext: false }
                );
                resolve(pollResult.result as T);
              } else if (pollResult.status === "error") {
                // Clean up and reject
                chrome.devtools.inspectedWindow.eval(
                  `delete window["${opId}"]`,
                  { useContentScriptContext: false }
                );
                reject(new Error(pollResult.error || "Unknown error"));
              }
            }
          );
        };

        // If already done (synchronous), resolve immediately
        if (initialResult && typeof initialResult === "object") {
          const typedResult = initialResult as { status: string; result?: T; error?: string };
          if (typedResult.status === "done") {
            chrome.devtools.inspectedWindow.eval(
              `delete window["${opId}"]`,
              { useContentScriptContext: false }
            );
            resolve(typedResult.result as T);
            return;
          } else if (typedResult.status === "error") {
            chrome.devtools.inspectedWindow.eval(
              `delete window["${opId}"]`,
              { useContentScriptContext: false }
            );
            reject(new Error(typedResult.error || "Unknown error"));
            return;
          }
        }

        // Start polling
        setTimeout(pollForResult, 10);
      }
    );
  });
}

/**
 * Escapes a string for safe inclusion in JavaScript code
 */
function escapeString(str: string): string {
  return str
    .replace(/\\/g, "\\\\")
    .replace(/'/g, "\\'")
    .replace(/"/g, '\\"')
    .replace(/\n/g, "\\n")
    .replace(/\r/g, "\\r")
    .replace(/\t/g, "\\t");
}

// Helper functions that will be injected into the page
const OPFS_HELPERS = `
// Resolve a path string to a DirectoryHandle
async function __opfs_resolvePath(path) {
  const root = await navigator.storage.getDirectory();
  if (!path || path === "") return root;
  const parts = path.split("/").filter(p => p.length > 0);
  let current = root;
  for (const part of parts) {
    current = await current.getDirectoryHandle(part);
  }
  return current;
}

// Check if file is text-based
function __opfs_isTextFile(file) {
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

// Check if file is an image
function __opfs_isImageFile(file) {
  const imageExtensions = [".jpg", ".jpeg", ".png", ".gif", ".webp", ".svg", ".ico", ".bmp", ".avif"];
  const name = file.name.toLowerCase();
  return file.type.startsWith("image/") || imageExtensions.some(ext => name.endsWith(ext));
}

// Get MIME type
function __opfs_getMimeType(file) {
  if (file.type) return file.type;
  const name = file.name.toLowerCase();
  const ext = name.split('.').pop();
  const mimeMap = {
    jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', gif: 'image/gif',
    webp: 'image/webp', svg: 'image/svg+xml', ico: 'image/x-icon', bmp: 'image/bmp',
    avif: 'image/avif', json: 'application/json', js: 'application/javascript',
    html: 'text/html', css: 'text/css', xml: 'application/xml', md: 'text/markdown',
    txt: 'text/plain'
  };
  return mimeMap[ext || ''] || 'application/octet-stream';
}
`;

export const opfsApi = {
  /**
   * List files and directories at the given path
   */
  list: async (path: string): Promise<FileEntry[]> => {
    const safePath = escapeString(path);
    const code = `
      ${OPFS_HELPERS}

      if (!isSecureContext) throw new Error("OPFS requires a Secure Context (HTTPS or localhost).");
      if (!navigator.storage?.getDirectory) throw new Error("OPFS API not supported in this browser.");

      const dirHandle = await __opfs_resolvePath("${safePath}");
      const files = [];
      for await (const [name, handle] of dirHandle.entries()) {
        const entry = {
          name: name,
          kind: handle.kind,
          path: "${safePath}" ? "${safePath}/" + name : name
        };
        if (handle.kind === "file") {
          try {
            const file = await handle.getFile();
            entry.size = file.size;
            entry.lastModified = file.lastModified;
          } catch (e) {}
        }
        files.push(entry);
      }
      return files.sort((a, b) => {
        if (a.kind === b.kind) return a.name.localeCompare(b.name);
        return a.kind === "directory" ? -1 : 1;
      });
    `;
    return evalInPage<FileEntry[]>(code);
  },

  /**
   * Read file content as text
   */
  read: async (path: string): Promise<string> => {
    const safePath = escapeString(path);
    const code = `
      ${OPFS_HELPERS}

      if (!isSecureContext) throw new Error("OPFS requires a Secure Context (HTTPS or localhost).");
      if (!navigator.storage?.getDirectory) throw new Error("OPFS API not supported in this browser.");

      const parts = "${safePath}".split("/");
      const fileName = parts.pop();
      const dirPath = parts.join("/");

      const dirHandle = await __opfs_resolvePath(dirPath);
      const fileHandle = await dirHandle.getFileHandle(fileName);
      const file = await fileHandle.getFile();

      if (file.size > 1024 * 1024) {
        return "[BINARY_OR_LARGE] File is too large to preview (" + (file.size / 1024 / 1024).toFixed(2) + " MB). Please download to view.";
      }

      if (__opfs_isTextFile(file)) {
        return await file.text();
      } else {
        return "[BINARY_OR_LARGE] Type: " + file.type + ", Size: " + file.size + " bytes.";
      }
    `;
    return evalInPage<string>(code);
  },

  /**
   * Read file with metadata (supports images as base64)
   */
  readWithMeta: async (path: string): Promise<FileReadResult> => {
    const safePath = escapeString(path);
    const code = `
      ${OPFS_HELPERS}

      if (!isSecureContext) throw new Error("OPFS requires a Secure Context (HTTPS or localhost).");
      if (!navigator.storage?.getDirectory) throw new Error("OPFS API not supported in this browser.");

      const parts = "${safePath}".split("/");
      const fileName = parts.pop();
      const dirPath = parts.join("/");

      const dirHandle = await __opfs_resolvePath(dirPath);
      const fileHandle = await dirHandle.getFileHandle(fileName);
      const file = await fileHandle.getFile();
      const mimeType = __opfs_getMimeType(file);

      // For images, return as base64 (up to 5MB)
      if (__opfs_isImageFile(file)) {
        if (file.size > 5 * 1024 * 1024) {
          return {
            content: "[TOO_LARGE] Image is too large to preview (" + (file.size / 1024 / 1024).toFixed(2) + " MB)",
            mimeType: mimeType,
            size: file.size,
            isBase64: false
          };
        }
        const arrayBuffer = await file.arrayBuffer();
        const base64 = btoa(
          new Uint8Array(arrayBuffer).reduce((data, byte) => data + String.fromCharCode(byte), '')
        );
        return {
          content: "data:" + mimeType + ";base64," + base64,
          mimeType: mimeType,
          size: file.size,
          isBase64: true
        };
      }

      // For text files (up to 1MB)
      if (__opfs_isTextFile(file)) {
        if (file.size > 1024 * 1024) {
          return {
            content: "[TOO_LARGE] File is too large to preview (" + (file.size / 1024 / 1024).toFixed(2) + " MB)",
            mimeType: mimeType,
            size: file.size,
            isBase64: false
          };
        }
        return {
          content: await file.text(),
          mimeType: mimeType,
          size: file.size,
          isBase64: false
        };
      }

      // Binary files
      return {
        content: "[BINARY] Type: " + mimeType + ", Size: " + file.size + " bytes",
        mimeType: mimeType,
        size: file.size,
        isBase64: false
      };
    `;
    return evalInPage<FileReadResult>(code);
  },

  /**
   * Write content to a file
   */
  write: async (path: string, content: string, isBinary: boolean = false): Promise<void> => {
    const safePath = escapeString(path);
    const safeContent = escapeString(content);
    const code = `
      ${OPFS_HELPERS}

      if (!isSecureContext) throw new Error("OPFS requires a Secure Context (HTTPS or localhost).");
      if (!navigator.storage?.getDirectory) throw new Error("OPFS API not supported in this browser.");

      const parts = "${safePath}".split("/");
      const fileName = parts.pop();
      const dirPath = parts.join("/");

      const dirHandle = await __opfs_resolvePath(dirPath);
      const fileHandle = await dirHandle.getFileHandle(fileName, { create: true });
      const writable = await fileHandle.createWritable();

      ${isBinary ? `
        const binaryString = atob("${safeContent}");
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }
        await writable.write(bytes);
      ` : `
        await writable.write("${safeContent}");
      `}

      await writable.close();
      return true;
    `;
    await evalInPage<boolean>(code);
  },

  /**
   * Rename a file or directory
   */
  rename: async (path: string, newName: string): Promise<void> => {
    const safePath = escapeString(path);
    const safeNewName = escapeString(newName);
    const code = `
      ${OPFS_HELPERS}

      if (!isSecureContext) throw new Error("OPFS requires a Secure Context (HTTPS or localhost).");
      if (!navigator.storage?.getDirectory) throw new Error("OPFS API not supported in this browser.");

      const parts = "${safePath}".split("/");
      const oldName = parts.pop();
      const dirPath = parts.join("/");

      const dirHandle = await __opfs_resolvePath(dirPath);

      let handle;
      try {
        handle = await dirHandle.getFileHandle(oldName);
      } catch (e) {
        handle = await dirHandle.getDirectoryHandle(oldName);
      }

      if ("move" in handle) {
        await handle.move("${safeNewName}");
      } else {
        throw new Error("Rename (move) not supported in this browser version.");
      }
      return true;
    `;
    await evalInPage<boolean>(code);
  },

  /**
   * Move a file or directory to a new location
   */
  move: async (oldPath: string, newPath: string): Promise<void> => {
    const safeOldPath = escapeString(oldPath);
    const safeNewPath = escapeString(newPath);
    const code = `
      ${OPFS_HELPERS}

      if (!isSecureContext) throw new Error("OPFS requires a Secure Context (HTTPS or localhost).");
      if (!navigator.storage?.getDirectory) throw new Error("OPFS API not supported in this browser.");

      // Resolve source
      const oldParts = "${safeOldPath}".split("/");
      const oldName = oldParts.pop();
      const oldDirPath = oldParts.join("/");
      const oldDirHandle = await __opfs_resolvePath(oldDirPath);

      let handle;
      try {
        handle = await oldDirHandle.getFileHandle(oldName);
      } catch (e) {
        handle = await oldDirHandle.getDirectoryHandle(oldName);
      }

      // Resolve destination
      const newParts = "${safeNewPath}".split("/");
      const newName = newParts.pop();
      const newDirPath = newParts.join("/");
      const newDirHandle = await __opfs_resolvePath(newDirPath);

      if ("move" in handle) {
        await handle.move(newDirHandle, newName);
      } else {
        throw new Error("Move API not supported in this browser.");
      }
      return true;
    `;
    await evalInPage<boolean>(code);
  },

  /**
   * Create a new file or directory
   */
  create: async (path: string, kind: "file" | "directory"): Promise<void> => {
    const safePath = escapeString(path);
    const code = `
      ${OPFS_HELPERS}

      if (!isSecureContext) throw new Error("OPFS requires a Secure Context (HTTPS or localhost).");
      if (!navigator.storage?.getDirectory) throw new Error("OPFS API not supported in this browser.");

      const parts = "${safePath}".split("/");
      const name = parts.pop();
      const dirPath = parts.join("/");

      const dirHandle = await __opfs_resolvePath(dirPath);

      ${kind === "directory" ? `
        await dirHandle.getDirectoryHandle(name, { create: true });
      ` : `
        await dirHandle.getFileHandle(name, { create: true });
      `}
      return true;
    `;
    await evalInPage<boolean>(code);
  },

  /**
   * Delete a file or directory
   */
  delete: async (path: string): Promise<void> => {
    const safePath = escapeString(path);
    const code = `
      ${OPFS_HELPERS}

      if (!isSecureContext) throw new Error("OPFS requires a Secure Context (HTTPS or localhost).");
      if (!navigator.storage?.getDirectory) throw new Error("OPFS API not supported in this browser.");

      const parts = "${safePath}".split("/");
      const name = parts.pop();
      const dirPath = parts.join("/");

      const dirHandle = await __opfs_resolvePath(dirPath);
      await dirHandle.removeEntry(name, { recursive: true });
      return true;
    `;
    await evalInPage<boolean>(code);
  },

  /**
   * Download a file from OPFS
   */
  download: async (path: string): Promise<void> => {
    const safePath = escapeString(path);
    const code = `
      ${OPFS_HELPERS}

      if (!isSecureContext) throw new Error("OPFS requires a Secure Context (HTTPS or localhost).");
      if (!navigator.storage?.getDirectory) throw new Error("OPFS API not supported in this browser.");

      const parts = "${safePath}".split("/");
      const fileName = parts.pop();
      const dirPath = parts.join("/");

      const dirHandle = await __opfs_resolvePath(dirPath);
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
      return true;
    `;
    await evalInPage<boolean>(code);
  },

  /**
   * Get storage estimate
   */
  getStorageEstimate: async (): Promise<StorageEstimate> => {
    const code = `
      if (!isSecureContext) throw new Error("OPFS requires a Secure Context (HTTPS or localhost).");
      if (!navigator.storage?.estimate) throw new Error("Storage API not supported.");

      const estimate = await navigator.storage.estimate();
      return {
        usage: estimate.usage || 0,
        quota: estimate.quota || 0
      };
    `;
    return evalInPage<StorageEstimate>(code);
  },

  /**
   * Check if a path exists
   */
  exists: async (path: string): Promise<boolean> => {
    const safePath = escapeString(path);
    const code = `
      ${OPFS_HELPERS}

      if (!isSecureContext) return false;
      if (!navigator.storage?.getDirectory) return false;

      if (!("${safePath}")) return true; // Root always exists

      const parts = "${safePath}".split("/");
      const name = parts.pop();
      const dirPath = parts.join("/");

      try {
        const dirHandle = await __opfs_resolvePath(dirPath);
        if (!name) return true;

        try {
          await dirHandle.getFileHandle(name);
          return true;
        } catch (e) {
          try {
            await dirHandle.getDirectoryHandle(name);
            return true;
          } catch (e2) {
            return false;
          }
        }
      } catch (e) {
        return false;
      }
    `;
    return evalInPage<boolean>(code);
  },
};
