export type Visibility = "PRIVATE" | "PUBLIC";
export type UploadStatus = "PENDING" | "COMPLETED" | "FAILED";

export interface FileRecord {
  id: string;
  originalName: string;
  mimeType: string;
  sizeBytes: number;
  visibility: Visibility;
  shareToken: string | null;
  status: UploadStatus;
  viewCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface StorageStats {
  usedBytes: number;
  fileCount: number;
}
