import { describe, it, expect, vi, beforeEach, type Mock } from "vitest";

// Since the new api.ts uses a complex polling mechanism, we'll test the evalInPage behavior
// at a higher level by mocking chrome.devtools.inspectedWindow.eval to return sync results

describe("opfsApi", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should reject when inspectedWindow.eval returns an exception", async () => {
    // Mock eval to return an exception
    (chrome.devtools.inspectedWindow.eval as Mock).mockImplementation(
      (_code, _options, callback) => {
        callback(undefined, { isError: true, value: "Test error" });
      }
    );

    // Import after mocking
    const { opfsApi } = await import("../panel/api");

    await expect(opfsApi.list("")).rejects.toThrow("Test error");
  });

  it("should reject when inspectedWindow.eval returns exception description", async () => {
    (chrome.devtools.inspectedWindow.eval as Mock).mockImplementation(
      (_code, _options, callback) => {
        callback(undefined, { isError: false, description: "Description error" });
      }
    );

    const { opfsApi } = await import("../panel/api");

    await expect(opfsApi.list("")).rejects.toThrow("Description error");
  });

  it("should resolve immediately when result is already done", async () => {
    const mockFiles = [{ name: "test.txt", kind: "file", path: "test.txt" }];

    (chrome.devtools.inspectedWindow.eval as Mock).mockImplementation(
      (code, _options, callback) => {
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
      (code, _options, callback) => {
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
});
