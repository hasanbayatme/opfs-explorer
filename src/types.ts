export interface FileEntry {
  name: string;
  kind: "file" | "directory";
  path: string;
  size?: number;
  lastModified?: number;
  mimeType?: string;
}

export interface FileReadResult {
  content: string;
  mimeType: string;
  size: number;
  isBase64: boolean;
  /** Result of multi-strategy type detection: text / binary / image / unknown */
  detectedType?: 'text' | 'binary' | 'unknown' | 'image';
  /** True when the file is text and exceeds 1 MB (still readable, shown with a warning) */
  isLargeText?: boolean;
}

export interface StorageEstimate {
  usage: number;
  quota: number;
}

export interface DirectorySizeResult {
  size: number;
  fileCount: number;
  folderCount: number;
  /** Whether subdirectories' contents were included in the total */
  recursive: boolean;
}

export type AutoDirSizeMode = 'off' | 'shallow' | 'recursive';

export interface AppSettings {
  /** Number of spaces to indent formatted JSON; use "tab" for tab-indentation */
  jsonIndent: 2 | 4 | 'tab';
  /** Recursively sort object keys alphabetically when formatting JSON */
  jsonSortKeys: boolean;
  /** Whether folder sizes are calculated automatically when a folder is expanded */
  autoDirSize: AutoDirSizeMode;
}
