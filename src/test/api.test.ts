import { describe, it, expect, vi, beforeEach, type Mock } from "vitest";

// Since the new api.ts uses a complex polling mechanism, we'll test the evalInPage behavior
// at a higher level by mocking chrome.devtools.inspectedWindow.eval to return sync results

describe("opfsApi", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  it("should reject when inspectedWindow.eval returns an exception", async () => {
    // Mock eval to return an exception (2 argument callback: result, exceptionInfo)
    (chrome.devtools.inspectedWindow.eval as Mock).mockImplementation(
      (_code, callback) => {
        callback(undefined, { isError: true, value: "Test error" });
      }
    );

    // Import after mocking
    const { opfsApi } = await import("../panel/api");

    await expect(opfsApi.list("")).rejects.toThrow("Test error");
  });

  it("should reject when inspectedWindow.eval returns exception description", async () => {
    (chrome.devtools.inspectedWindow.eval as Mock).mockImplementation(
      (_code, callback) => {
        callback(undefined, {
          isError: false,
          description: "Description error",
        });
      }
    );

    const { opfsApi } = await import("../panel/api");

    await expect(opfsApi.list("")).rejects.toThrow("Description error");
  });

  it("should resolve immediately when result is already done", async () => {
    const mockFiles = [{ name: "test.txt", kind: "file", path: "test.txt" }];

    (chrome.devtools.inspectedWindow.eval as Mock).mockImplementation(
      (code, callback) => {
        // Return done status immediately
        if (code.includes("delete window")) {
          callback?.(undefined, undefined);
        } else {
          callback({ status: "done", result: mockFiles }, undefined);
        }
      }
    );

    const { opfsApi } = await import("../panel/api");

    const result = await opfsApi.list("");
    expect(result).toEqual(mockFiles);
  });

  it("should escape special characters in paths", async () => {
    let capturedCode = "";

    (chrome.devtools.inspectedWindow.eval as Mock).mockImplementation(
      (code, callback) => {
        if (!capturedCode && !code.includes("delete window")) {
          capturedCode = code;
        }
        if (code.includes("delete window")) {
          callback?.(undefined, undefined);
        } else {
          callback({ status: "done", result: [] }, undefined);
        }
      }
    );

    const { opfsApi } = await import("../panel/api");

    await opfsApi.list('test"file');
    expect(capturedCode).toContain('test\\"file');
  });

  it("delete() should use the self-healing removal helper to recover from corrupted/ghost OPFS entries", async () => {
    let capturedCode = "";

    (chrome.devtools.inspectedWindow.eval as Mock).mockImplementation(
      (code, callback) => {
        if (!capturedCode && !code.includes("delete window")) {
          capturedCode = code;
        }
        if (code.includes("delete window")) {
          callback?.(undefined, undefined);
        } else {
          callback({ status: "done", result: true }, undefined);
        }
      }
    );

    const { opfsApi } = await import("../panel/api");

    await opfsApi.delete("some/dir");
    // Regression guard: delete() must route through the robust helper that
    // repairs "ghost" entries (visible in listings but not resolvable) by
    // recreating them before removal, rather than calling removeEntry directly.
    expect(capturedCode).toContain("__opfs_removeEntryRobust");
    expect(capturedCode).toContain("await __opfs_removeEntryRobust(dirHandle, name)");
  });

  it("rename() should surface a clear error for entries that can't be resolved as a file or directory", async () => {
    let capturedCode = "";

    (chrome.devtools.inspectedWindow.eval as Mock).mockImplementation(
      (code, callback) => {
        if (!capturedCode && !code.includes("delete window")) {
          capturedCode = code;
        }
        if (code.includes("delete window")) {
          callback?.(undefined, undefined);
        } else {
          callback({ status: "done", result: true }, undefined);
        }
      }
    );

    const { opfsApi } = await import("../panel/api");

    await opfsApi.rename("some/dir", "renamed");
    expect(capturedCode).toContain("corrupted");
    expect(capturedCode).toContain("__opfs_removeEntryRobust(dirHandle, oldName)");
  });
});
