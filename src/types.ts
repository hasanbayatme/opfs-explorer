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
