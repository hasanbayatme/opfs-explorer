import { describe, it, expect, vi, beforeEach, type Mock } from "vitest";
import { opfsApi } from "../panel/api";

describe("opfsApi", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Object.assign(chrome.runtime, { lastError: undefined });
  });

  it("should list files successfully", async () => {
    const mockFiles = [{ name: "test.txt", kind: "file", path: "test.txt" }];
    (chrome.tabs.sendMessage as Mock).mockImplementation(
      (_tabId, _msg, callback) => {
        callback({ success: true, data: mockFiles });
      }
    );

    const result = await opfsApi.list("");
    expect(result).toEqual(mockFiles);
    expect(chrome.tabs.sendMessage).toHaveBeenCalledWith(
      123,
      { type: "OPFS_List", path: "" },
      expect.any(Function)
    );
  });

  it("should handle API errors", async () => {
    (chrome.tabs.sendMessage as Mock).mockImplementation(
      (_tabId, _msg, callback) => {
        callback({ success: false, error: "Failed to list" });
      }
    );

    await expect(opfsApi.list("")).rejects.toThrow("Failed to list");
  });

  it("should handle chrome runtime errors", async () => {
    (chrome.tabs.sendMessage as Mock).mockImplementation(
      (_tabId, _msg, callback) => {
        Object.assign(chrome.runtime, {
          lastError: { message: "Connection failed" },
        });
        callback(null);
      }
    );

    await expect(opfsApi.list("")).rejects.toThrow("Connection failed");
  });
});
