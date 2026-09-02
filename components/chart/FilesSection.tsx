"use client";

import { FormEvent, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { FolderLock, Plus, Download, Loader2, Eye, X } from "lucide-react";
import type { Department, MedicalFile } from "@prisma/client";
import { Card, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Modal } from "@/components/ui/Modal";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/chart/UnifiedChartView";

const DEPARTMENT_OPTIONS: Department[] = ["RADIOLOGY", "OPD", "CARDIOLOGY", "EMERGENCY"];
const CATEGORY_SUGGESTIONS = ["Lab Report", "Imaging", "Discharge Summary", "Referral", "Other"];

interface FilesSectionProps {
  patientId: string;
  files: MedicalFile[];
  defaultDepartment?: Department | null;
  allowDepartment?: boolean;
}

export function FilesSection({ patientId, files, defaultDepartment, allowDepartment = true }: FilesSectionProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [category, setCategory] = useState("");
  const [department, setDepartment] = useState<Department | "">(defaultDepartment ?? "");
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [previewingId, setPreviewingId] = useState<string | null>(null);
  const [preview, setPreview] = useState<{ file: MedicalFile; url: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function onUpload(e: FormEvent) {
    e.preventDefault();
    const file = fileInputRef.current?.files?.[0];
    if (!file || !category.trim()) {
      setError("Choose a file and a category.");
      return;
    }

    setError(null);
    setUploading(true);
    try {
      const presignRes = await fetch("/api/files", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fileName: file.name,
          mimeType: file.type || "application/octet-stream",
          sizeBytes: file.size,
          department: department || undefined,
        }),
      });
      if (!presignRes.ok) {
        const data = await presignRes.json().catch(() => null);
        throw new Error(data?.error ?? "Could not start upload.");
      }
      const { url, fields, storageKey } = await presignRes.json();

      const formData = new FormData();
      Object.entries(fields as Record<string, string>).forEach(([key, value]) => formData.append(key, value));
      formData.append("file", file);

      const uploadRes = await fetch(url, { method: "POST", body: formData });
      if (!uploadRes.ok) {
        throw new Error("Upload to storage failed.");
      }

      const confirmRes = await fetch("/api/files/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          patientId,
          storageKey,
          fileName: file.name,
          mimeType: file.type || "application/octet-stream",
          sizeBytes: file.size,
          category: category.trim(),
          department: department || undefined,
        }),
      });
      if (!confirmRes.ok) {
        const data = await confirmRes.json().catch(() => null);
        throw new Error(data?.error ?? "Could not save the uploaded file.");
      }

      setOpen(false);
      setCategory("");
      if (fileInputRef.current) fileInputRef.current.value = "";
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed.");
    } finally {
      setUploading(false);
    }
  }

  async function onDownload(fileId: string) {
    setDownloadingId(fileId);
    try {
      const res = await fetch(`/api/files/${fileId}/download`);
      if (!res.ok) return;
      const { url } = await res.json();
      window.open(url, "_blank", "noopener,noreferrer");
    } finally {
      setDownloadingId(null);
    }
  }

  async function onPreview(file: MedicalFile) {
    setPreviewingId(file.id);
    try {
      const res = await fetch(`/api/files/${file.id}/download`);
      if (!res.ok) return;
      const { url } = await res.json();
      setPreview({ file, url });
    } finally {
      setPreviewingId(null);
    }
  }

  return (
    <Card>
      <div className="mb-3 flex items-center justify-between">
        <CardTitle className="flex items-center gap-1.5">
          <FolderLock size={14} /> Documents
        </CardTitle>
        <Button size="sm" variant="outline" onClick={() => setOpen(true)}>
          <Plus size={14} /> Upload
        </Button>
      </div>

      {files.length === 0 ? (
        <EmptyState label="No documents on file." />
      ) : (
        <div className="flex flex-col gap-2">
          {files.map((f) => (
            <div key={f.id} className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2 text-sm">
              <div>
                <p className="font-medium text-slate-900">
                  {f.fileName}
                  <span className="ml-2 text-xs font-normal text-slate-400">v{f.version}</span>
                </p>
                <div className="mt-0.5 flex items-center gap-2 text-xs text-slate-500">
                  <span>{f.category}</span>
                  {f.department && <Badge tone="blue">{f.department}</Badge>}
                  <span>{format(f.createdAt, "MMM d, yyyy")}</span>
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-1">
                <button
                  onClick={() => onPreview(f)}
                  disabled={previewingId === f.id}
                  className="flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-slate-600 hover:bg-slate-100"
                >
                  {previewingId === f.id ? <Loader2 size={13} className="animate-spin" /> : <Eye size={13} />}
                  Preview
                </button>
                <button
                  onClick={() => onDownload(f.id)}
                  disabled={downloadingId === f.id}
                  className="flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-blue-700 hover:bg-blue-50"
                >
                  {downloadingId === f.id ? <Loader2 size={13} className="animate-spin" /> : <Download size={13} />}
                  Download
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal open={open} onClose={() => setOpen(false)} title="Upload Document">
        <form onSubmit={onUpload} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-slate-700">File</label>
            <input
              ref={fileInputRef}
              type="file"
              required
              className="text-sm text-slate-700 file:mr-3 file:rounded-lg file:border-0 file:bg-blue-50 file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-blue-700"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Input
              id="file-category"
              label="Category"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              required
              placeholder="e.g. Discharge Summary"
              list="category-suggestions"
            />
            <datalist id="category-suggestions">
              {CATEGORY_SUGGESTIONS.map((c) => (
                <option key={c} value={c} />
              ))}
            </datalist>
          </div>
          {allowDepartment && (
            <Select
              id="file-department"
              label="Department (optional)"
              value={department}
              onChange={(e) => setDepartment(e.target.value as Department | "")}
            >
              <option value="">No department restriction</option>
              {DEPARTMENT_OPTIONS.map((d) => (
                <option key={d} value={d}>
                  {d.charAt(0) + d.slice(1).toLowerCase()}
                </option>
              ))}
            </Select>
          )}
          {error && <p className="text-sm text-red-600">{error}</p>}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={uploading}>
              {uploading ? "Uploading…" : "Upload"}
            </Button>
          </div>
        </form>
      </Modal>

      {preview && (
        <div
          className="fixed inset-0 z-50 flex flex-col bg-slate-900/60 p-4 sm:p-8"
          onClick={() => setPreview(null)}
        >
          <div
            className="mx-auto flex h-full w-full max-w-4xl flex-col overflow-hidden rounded-xl bg-white shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-4 py-3">
              <p className="truncate text-sm font-medium text-slate-900">{preview.file.fileName}</p>
              <div className="flex shrink-0 items-center gap-1">
                <a
                  href={preview.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-blue-700 hover:bg-blue-50"
                >
                  <Download size={13} /> Download
                </a>
                <button
                  onClick={() => setPreview(null)}
                  aria-label="Close preview"
                  className="flex h-7 w-7 items-center justify-center rounded-md text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                >
                  <X size={16} />
                </button>
              </div>
            </div>
            <div className="min-h-0 flex-1 bg-slate-50">
              {preview.file.mimeType === "application/pdf" || preview.file.mimeType.startsWith("text/") ? (
                <iframe src={preview.url} title={preview.file.fileName} className="h-full w-full" />
              ) : preview.file.mimeType.startsWith("image/") ? (
                <div className="flex h-full items-center justify-center p-4">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={preview.url}
                    alt={preview.file.fileName}
                    className="max-h-full max-w-full object-contain"
                  />
                </div>
              ) : (
                <div className="flex h-full items-center justify-center p-8 text-center text-sm text-slate-500">
                  Preview isn&apos;t available for this file type. Use Download to open it.
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </Card>
  );
}
