import type { FileEntry, StorageEstimate, FileReadResult } from "../types";
export type { FileEntry, StorageEstimate, FileReadResult };

// Declare browser namespace for Safari/Firefox compatibility
declare const browser: typeof chrome | undefined;

/**
 * Detect if we're running in Safari
 */
const isSafari = (() => {
  try {
    return (
      /^((?!chrome|android).)*safari/i.test(navigator.userAgent) ||
      (typeof browser !== "undefined" && !!(browser as typeof chrome)?.devtools)
    );
  } catch {
    return false;
  }
})();

/**
 * Get the devtools API (supports both chrome.* and browser.* namespaces)
 */
function getDevtools(): typeof chrome.devtools | null {
  // Safari/Firefox use browser.* namespace
  if (typeof browser !== "undefined") {
    const b = browser as typeof chrome;
    if (b?.devtools?.inspectedWindow) {
      return b.devtools;
    }
  }
  // Chrome uses chrome.* namespace
  if (typeof chrome !== "undefined" && chrome?.devtools?.inspectedWindow) {
    return chrome.devtools;
  }
  return null;
}

/**
 * Execute eval in the inspected window.
 * Safari uses Promise-based API, Chrome uses callback-based API.
 */
function executeEval(
  devtools: typeof chrome.devtools,
  code: string
): Promise<
  [unknown, chrome.devtools.inspectedWindow.EvaluationExceptionInfo | undefined]
> {
  return new Promise((resolve) => {
    try {
      // In Safari, eval returns a Promise. In Chrome, it uses callbacks.
      // We need to handle both cases.

      // First, try with a callback (Chrome style)
      let callbackCalled = false;

      const maybePromise = devtools.inspectedWindow.eval(
        code,
        (
          evalResult: unknown,
          exceptionInfo:
            | chrome.devtools.inspectedWindow.EvaluationExceptionInfo
            | undefined
        ) => {
          callbackCalled = true;
          resolve([evalResult, exceptionInfo]);
        }
      );

      // Check if it returned a Promise (Safari style) - cast to any to check
      const result = maybePromise as unknown;
      if (
        result &&
        typeof result === "object" &&
        typeof (result as { then?: unknown }).then === "function"
      ) {
        // It's a Promise (Safari)
        (
          result as Promise<
            [
              unknown,
              (
                | chrome.devtools.inspectedWindow.EvaluationExceptionInfo
                | undefined
              )
            ]
          >
        )
          .then((res) => {
            if (!callbackCalled) {
              // Safari returns [result, exceptionInfo] or just result
              if (Array.isArray(res)) {
                resolve(
                  res as [
                    unknown,
                    (
                      | chrome.devtools.inspectedWindow.EvaluationExceptionInfo
                      | undefined
                    )
                  ]
                );
              } else {
                resolve([res, undefined]);
              }
            }
          })
          .catch((err) => {
            if (!callbackCalled) {
              resolve([
                undefined,
                {
                  isError: true,
                  code: String(err),
                  description: String(err),
                  details: [],
                  isException: false,
                  value: String(err),
                },
              ]);
            }
          });
      }
    } catch (err) {
      resolve([
        undefined,
        {
          isError: true,
          code: String(err),
          description: String(err),
          details: [],
          isException: false,
          value: String(err),
        },
      ]);
    }
  });
}

/**
 * Helper to execute async code in the inspected page context.
 * Uses a polling mechanism to handle async operations since inspectedWindow.eval
 * doesn't natively await Promises.
 *
 * Safari has known issues with inspectedWindow.eval() that can crash DevTools.
 * This implementation includes Safari-specific workarounds:
 * - Slower polling interval to reduce rapid eval() calls
 * - Simplified code structure to avoid WebKit parsing issues
 * - Better error handling to prevent crashes
 * - Support for both Promise-based (Safari) and callback-based (Chrome) APIs
 */
function evalInPage<T>(code: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const devtools = getDevtools();

    if (!devtools) {
      // Mock for local dev
      console.log("[Mock eval]", code.slice(0, 100) + "...");
      reject(new Error("DevTools not available in development mode"));
      return;
    }

    // Generate a unique ID for this operation - use simpler format for Safari
    const opId =
      "__opfs_" + Date.now() + "_" + Math.random().toString(36).slice(2);

    // Polling interval - Safari needs slower polling to avoid crashes
    const pollInterval = isSafari ? 100 : 10;

    // Maximum polling attempts to prevent infinite loops
    const maxAttempts = 300; // 30 seconds at 100ms, 3 seconds at 10ms
    let attempts = 0;

    // Wrap the async code to store result in a global variable
    // Use string concatenation instead of template literals for Safari compatibility
    const wrappedCode =
      "(function() {" +
      "window['" +
      opId +
      "'] = { status: 'pending' };" +
      "(async function() {" +
      "try {" +
      "var result = await (async function() {" +
      code +
      "})();" +
      "window['" +
      opId +
      "'] = { status: 'done', result: result };" +
      "} catch (err) {" +
      "window['" +
      opId +
      "'] = { status: 'error', error: err.message || String(err) };" +
      "}" +
      "})();" +
      "return window['" +
      opId +
      "'];" +
      "})()";

    // First, start the async operation
    executeEval(devtools, wrappedCode)
      .then(([initialResult, exceptionInfo]) => {
        if (exceptionInfo) {
          const errorMsg = exceptionInfo.isError
            ? exceptionInfo.value ||
              exceptionInfo.description ||
              exceptionInfo.code
            : exceptionInfo.description ||
              exceptionInfo.code ||
              "Unknown error";
          reject(new Error(String(errorMsg)));
          return;
        }

        // Poll for the result
        const pollForResult = () => {
          attempts++;

          if (attempts > maxAttempts) {
            // Clean up and timeout
            executeEval(devtools, "delete window['" + opId + "']").catch(
              () => {}
            );
            reject(new Error("Operation timed out"));
            return;
          }

          executeEval(devtools, "window['" + opId + "']")
            .then(([pollResult, pollException]) => {
              if (pollException) {
                // Don't immediately reject on polling errors in Safari - may be transient
                if (isSafari && attempts < 3) {
                  setTimeout(pollForResult, pollInterval * 2);
                  return;
                }
                reject(new Error(pollException.description || "Polling error"));
                return;
              }

              const result = pollResult as {
                status: string;
                result?: T;
                error?: string;
              } | null;

              if (!result) {
                // In Safari, null result may be transient
                if (isSafari && attempts < 5) {
                  setTimeout(pollForResult, pollInterval);
                  return;
                }
                reject(new Error("No result from eval"));
                return;
              }

              if (result.status === "pending") {
                // Still pending, poll again
                setTimeout(pollForResult, pollInterval);
              } else if (result.status === "done") {
                // Clean up and resolve
                executeEval(devtools, "delete window['" + opId + "']").catch(
                  () => {}
                );
                resolve(result.result as T);
              } else if (result.status === "error") {
                // Clean up and reject
                executeEval(devtools, "delete window['" + opId + "']").catch(
                  () => {}
                );
                reject(new Error(result.error || "Unknown error"));
              }
            })
            .catch((err) => {
              if (isSafari && attempts < 3) {
                setTimeout(pollForResult, pollInterval * 2);
                return;
              }
              reject(err);
            });
        };

        // If already done (synchronous), resolve immediately
        if (initialResult && typeof initialResult === "object") {
          const typedResult = initialResult as {
            status: string;
            result?: T;
            error?: string;
          };
          if (typedResult.status === "done") {
            executeEval(devtools, "delete window['" + opId + "']").catch(
              () => {}
            );
            resolve(typedResult.result as T);
            return;
          } else if (typedResult.status === "error") {
            executeEval(devtools, "delete window['" + opId + "']").catch(
              () => {}
            );
            reject(new Error(typedResult.error || "Unknown error"));
            return;
          }
        }

        // Start polling
        setTimeout(pollForResult, pollInterval);
      })
      .catch(reject);
  });
}

/**
 * Escapes a string for safe inclusion in JavaScript code.
 * Handles all characters that would break a JS string literal, including
 * null bytes and Unicode line/paragraph separators (\u2028/\u2029) which
 * are valid in JSON but illegal inside JS string literals.
 */
function escapeString(str: string): string {
  return str
    .replace(/\\/g, "\\\\")
    .replace(/'/g, "\\'")
    .replace(/"/g, '\\"')
    .replace(/\n/g, "\\n")
    .replace(/\r/g, "\\r")
    .replace(/\t/g, "\\t")
    .replace(/\0/g, "\\x00")
    .replace(/\u2028/g, "\\u2028")
    .replace(/\u2029/g, "\\u2029");
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
  // Known text MIME types take precedence.
  if (
    file.type.startsWith("text/") ||
    file.type === "application/json" ||
    file.type === "application/javascript" ||
    file.type === "application/xml"
  ) return true;
  // If the file has a non-empty MIME type that is NOT a known text type,
  // treat it as binary (e.g. application/octet-stream, application/wasm,
  // application/vnd.apache.arrow.file, etc.).
  // IMPORTANT: OPFS does not preserve MIME types — files uploaded as binary
  // (arrow, sqlite, parquet, wasm, pb …) will have file.type === "".  We must
  // NOT classify those as text just because the type is empty; instead we rely
  // solely on the file extension to make that determination.
  if (file.type !== "") return false;
  // No MIME type at all — fall back to extension matching only.
  return textExtensions.some(ext => name.endsWith(ext));
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

// Polyfill for recursive copy (used when move() is not supported)
async function __opfs_copyEntry(sourceHandle, destParentHandle, newName) {
  if (sourceHandle.kind === 'file') {
    const destFile = await destParentHandle.getFileHandle(newName || sourceHandle.name, { create: true });
    const srcFile = await sourceHandle.getFile();
    const writable = await destFile.createWritable();
    await writable.write(await srcFile.arrayBuffer());
    await writable.close();
  } else if (sourceHandle.kind === 'directory') {
    const destDir = await destParentHandle.getDirectoryHandle(newName || sourceHandle.name, { create: true });
    for await (const [name, handle] of sourceHandle.entries()) {
      await __opfs_copyEntry(handle, destDir, name);
    }
  }
}
`;

/**
 * Stages base64-encoded binary data into the inspected page's sessionStorage
 * using 64 KB chunks so that no single eval() call embeds an unbounded
 * string literal. Returns the base key and the number of chunks stored.
 *
 * This avoids data corruption that can occur when very large base64 payloads
 * are inlined directly into an eval'd code string.
 */
async function stageBinaryData(
  base64: string
): Promise<{ key: string; chunks: number }> {
  const key =
    "__opfs_bin_" + Date.now() + "_" + Math.random().toString(36).slice(2);
  const CHUNK = 65536; // 64 KB of base64 ≈ 48 KB binary
  const totalChunks = Math.ceil(base64.length / CHUNK) || 1;
  let staged = 0;

  try {
    for (let i = 0; i < totalChunks; i++) {
      const chunk = base64.slice(i * CHUNK, (i + 1) * CHUNK);
      const safeChunk = escapeString(chunk);
      // Each individual eval only contains one ~64 KB chunk
      await evalInPage<void>(
        `sessionStorage.setItem('${key}_${i}', '${safeChunk}'); undefined`
      );
      staged++;
    }
  } catch (err) {
    // Clean up any chunks that were already staged so we don't leave orphaned
    // data in the inspected page's sessionStorage.
    for (let i = 0; i < staged; i++) {
      await evalInPage<void>(
        `sessionStorage.removeItem('${key}_${i}'); undefined`
      ).catch(() => {});
    }
    throw err;
  }

  return { key, chunks: totalChunks };
}

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
        // Build the binary string in 8 KB chunks to avoid call-stack overflow
        // that occurs when using Array.reduce + String.fromCharCode on large buffers.
        // Pass the TypedArray subarray directly to apply() — it is array-like so
        // no intermediate Array.from() copy is needed.
        const bytes = new Uint8Array(arrayBuffer);
        let binary = '';
        const CHUNK = 8192;
        for (let i = 0; i < bytes.length; i += CHUNK) {
          binary += String.fromCharCode.apply(null, bytes.subarray(i, i + CHUNK));
        }
        const base64 = btoa(binary);
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
  write: async (
    path: string,
    content: string,
    isBinary: boolean = false
  ): Promise<void> => {
    const safePath = escapeString(path);

    if (isBinary) {
      // Stage the base64 payload into the inspected page's sessionStorage in
      // 64 KB chunks so that no single eval() call embeds an unbounded string
      // literal — large inline base64 strings can corrupt or fail silently.
      const { key, chunks } = await stageBinaryData(content);

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

        // Reassemble chunks from sessionStorage
        let base64 = '';
        for (let i = 0; i < ${chunks}; i++) {
          base64 += sessionStorage.getItem('${key}_' + i) || '';
        }
        // Clean up staged chunks
        for (let i = 0; i < ${chunks}; i++) {
          sessionStorage.removeItem('${key}_' + i);
        }

        const binaryString = atob(base64);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }
        await writable.write(bytes);
        await writable.close();
        return true;
      `;
      await evalInPage<boolean>(code);
    } else {
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
        await writable.write("${safeContent}");
        await writable.close();
        return true;
      `;
      await evalInPage<boolean>(code);
    }
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
        // Polyfill for browsers that don't support move() (e.g. Firefox, Safari)
        await __opfs_copyEntry(handle, dirHandle, "${safeNewName}");
        await dirHandle.removeEntry(oldName, { recursive: true });
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
        // Polyfill for browsers that don't support move() (e.g. Firefox, Safari)
        await __opfs_copyEntry(handle, newDirHandle, newName);
        await oldDirHandle.removeEntry(oldName, { recursive: true });
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

      ${
        kind === "directory"
          ? `
        await dirHandle.getDirectoryHandle(name, { create: true });
      `
          : `
        await dirHandle.getFileHandle(name, { create: true });
      `
      }
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
      // Delay revocation so the browser has time to read the object URL and
      // initiate the download. Revoking synchronously after click() causes the
      // browser to see a revoked (empty) URL, resulting in a 0-byte or
      // corrupted file — especially noticeable with binary files like Arrow.
      setTimeout(function() { URL.revokeObjectURL(url); }, 30000);
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
