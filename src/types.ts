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

export interface OpfsResponse<T = void> {
  success: boolean;
  data?: T;
  error?: string;
}

export type OpfsMessage =
  | { type: "OPFS_List"; path: string }
  | { type: "OPFS_Read"; path: string }
  | { type: "OPFS_ReadWithMeta"; path: string }
  | { type: "OPFS_Write"; path: string; content: string; isBinary: boolean }
  | { type: "OPFS_Rename"; path: string; newPath: string }
  | { type: "OPFS_Move"; oldPath: string; newPath: string }
  | { type: "OPFS_Create"; path: string; kind: "file" | "directory" }
  | { type: "OPFS_Delete"; path: string }
  | { type: "OPFS_Download"; path: string }
  | { type: "OPFS_GetStorageEstimate" }
  | { type: "OPFS_Exists"; path: string };
