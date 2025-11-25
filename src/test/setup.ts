import "@testing-library/jest-dom";
import { vi } from "vitest";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type DeepPartial<T> = T extends (...args: any[]) => any
  ? T
  : T extends object
  ? {
      [P in keyof T]?: DeepPartial<T[P]>;
    }
  : T;

// Mock Chrome API for inspectedWindow.eval
const mockChrome = {
  devtools: {
    inspectedWindow: {
      tabId: 123,
      eval: vi.fn(),
      reload: vi.fn(),
    },
  },
  runtime: {
    lastError: undefined,
  },
} satisfies DeepPartial<typeof chrome>;

vi.stubGlobal("chrome", mockChrome);
