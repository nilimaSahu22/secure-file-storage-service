import axios from "axios";

const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:4000";

export interface SharedFile {
  originalName: string;
  mimeType: string;
  sizeBytes: number;
  viewCount: number;
}

export async function getSharedFile(token: string): Promise<{ file: SharedFile; url: string }> {
  const res = await axios.get<{ file: SharedFile; url: string }>(`${API_URL}/api/share/${token}`);
  return res.data;
}
