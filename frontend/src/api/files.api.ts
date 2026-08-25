import { apiClient } from "../lib/apiClient";
import type { FileRecord, StorageStats, Visibility } from "../types/file";

export interface CreateFileResponse {
  fileId: string;
  uploadUrl: string;
  uploadFields: Record<string, string>;
}

export async function requestUpload(params: {
  originalName: string;
  mimeType: string;
  sizeBytes: number;
}): Promise<CreateFileResponse> {
  const res = await apiClient.post<CreateFileResponse>("/api/files", params);
  return res.data;
}

export async function confirmUpload(fileId: string): Promise<FileRecord> {
  const res = await apiClient.patch<{ file: FileRecord }>(`/api/files/${fileId}/confirm`);
  return res.data.file;
}

export async function listFiles(): Promise<FileRecord[]> {
  const res = await apiClient.get<{ files: FileRecord[] }>("/api/files");
  return res.data.files;
}

export async function getDownloadUrl(fileId: string): Promise<string> {
  const res = await apiClient.get<{ url: string }>(`/api/files/${fileId}/download`);
  return res.data.url;
}

export async function setVisibility(fileId: string, visibility: Visibility): Promise<FileRecord> {
  const res = await apiClient.patch<{ file: FileRecord }>(`/api/files/${fileId}/visibility`, {
    visibility,
  });
  return res.data.file;
}

export async function deleteFile(fileId: string): Promise<void> {
  await apiClient.delete(`/api/files/${fileId}`);
}

export async function getStats(): Promise<StorageStats> {
  const res = await apiClient.get<StorageStats>("/api/files/stats");
  return res.data;
}
