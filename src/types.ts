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
}

export interface StorageEstimate {
  usage: number;
  quota: number;
}
