"use client";

import { FormEvent, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { FolderLock, Plus, Download, Loader2, Eye, X, CheckCircle2, AlertCircle, Clock } from "lucide-react";
import type { MedicalFile } from "@prisma/client";
import { Card, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { Badge } from "@/components/ui/Badge";

const CATEGORY_SUGGESTIONS = ["Lab Report", "Imaging", "Discharge Summary", "Referral", "Other"];

interface PortalDocumentsProps {
  patientId: string;
  patientName: string;
  dateOfBirth: string; // pre-formatted, e.g. "Jul 19, 1953"
  files: MedicalFile[];
}

type Result =
  | { kind: "accepted" }
  | { kind: "bounced"; reason: string }
  | { kind: "needs_clearer"; reason: string }
  | { kind: "error"; reason: string };

const STATUS_META: Record<string, { label: string; tone: "green" | "amber" | "red" | "neutral"; icon: typeof Clock }> = {
  ACCEPTED: { label: "Added to your records", tone: "green", icon: CheckCircle2 },
  PENDING: { label: "Checking…", tone: "neutral", icon: Clock },
  NEEDS_CLEARER_COPY: { label: "Needs a clearer copy", tone: "amber", icon: AlertCircle },
  BOUNCED: { label: "Not added", tone: "red", icon: AlertCircle },
};

export function PortalDocuments({ patientId, patientName, dateOfBirth, files }: PortalDocumentsProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [category, setCategory] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [result, setResult] = useState<Result | null>(null);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [previewingId, setPreviewingId] = useState<string | null>(null);
  const [preview, setPreview] = useState<{ file: MedicalFile; url: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function onUpload(e: FormEvent) {
    e.preventDefault();
    const file = fileInputRef.current?.files?.[0];
    if (!file || !category.trim()) {
      setFormError("Choose a file and a category.");
      return;
    }
    if (!confirmed) {
      setFormError("Please confirm this document is yours.");
      return;
    }

    setFormError(null);
    setResult(null);
    setBusy(true);
    try {
      const presignRes = await fetch("/api/files", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fileName: file.name,
          mimeType: file.type || "application/octet-stream",
          sizeBytes: file.size,
        }),
      });
      if (!presignRes.ok) {
        const data = await presignRes.json().catch(() => null);
        throw new Error(data?.error ?? "Could not start upload.");
      }
      const { url, fields, storageKey } = await presignRes.json();

      const formData = new FormData();
      Object.entries(fields as Record<string, string>).forEach(([k, v]) => formData.append(k, v));
      formData.append("file", file);
      const uploadRes = await fetch(url, { method: "POST", body: formData });
      if (!uploadRes.ok) throw new Error("Upload failed. Please try again.");

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
        }),
      });
      if (confirmRes.status === 409) {
        setResult({ kind: "error", reason: "You've already uploaded this document." });
        return;
      }
      if (!confirmRes.ok) throw new Error("Could not save the document.");
      const { fileId } = await confirmRes.json();

      const checkRes = await fetch(`/api/files/${fileId}/check`, { method: "POST" });
      const check = await checkRes.json().catch(() => null);
      if (!checkRes.ok || !check) {
        setResult({ kind: "error", reason: "We couldn't check the document. Please try again." });
        return;
      }
      if (check.status === "ACCEPTED") setResult({ kind: "accepted" });
      else if (check.status === "BOUNCED") setResult({ kind: "bounced", reason: check.bounceReason ?? "" });
      else setResult({ kind: "needs_clearer", reason: check.bounceReason ?? "" });

      setOpen(false);
      setCategory("");
      setConfirmed(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
      router.refresh();
    } catch (err) {
      setResult({ kind: "error", reason: err instanceof Error ? err.message : "Upload failed." });
    } finally {
      setBusy(false);
    }
  }

  async function openSignedUrl(fileId: string, mode: "download" | "preview", file?: MedicalFile) {
    const setter = mode === "download" ? setDownloadingId : setPreviewingId;
    setter(fileId);
    try {
      const res = await fetch(`/api/files/${fileId}/download`);
      if (!res.ok) return;
      const { url } = await res.json();
      if (mode === "download") window.open(url, "_blank", "noopener,noreferrer");
      else if (file) setPreview({ file, url });
    } finally {
      setter(null);
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

      {result && (
        <div
          className={`mb-3 rounded-lg px-3 py-2 text-sm ${
            result.kind === "accepted"
              ? "bg-green-50 text-green-800"
              : result.kind === "bounced" || result.kind === "error"
                ? "bg-red-50 text-red-700"
                : "bg-amber-50 text-amber-800"
          }`}
        >
          {result.kind === "accepted"
            ? "Added to your records."
            : result.kind === "needs_clearer"
              ? `${result.reason} You can upload a clearer copy.`
              : result.reason}
        </div>
      )}

      {files.length === 0 ? (
        <p className="py-6 text-center text-sm text-slate-400">No documents yet.</p>
      ) : (
        <div className="flex flex-col gap-2">
          {files.map((f) => {
            const meta = STATUS_META[f.status] ?? STATUS_META.ACCEPTED;
            const Icon = meta.icon;
            return (
              <div key={f.id} className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2 text-sm">
                <div className="min-w-0">
                  <p className="truncate font-medium text-slate-900">{f.fileName}</p>
                  <div className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                    <span>{f.category}</span>
                    <span>{format(f.createdAt, "MMM d, yyyy")}</span>
                    <Badge tone={meta.tone}>
                      <Icon size={10} className="mr-1 inline" />
                      {meta.label}
                    </Badge>
                  </div>
                  {f.bounceReason && f.status !== "ACCEPTED" && (
                    <p className="mt-1 text-xs text-slate-500">{f.bounceReason}</p>
                  )}
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  <button
                    onClick={() => openSignedUrl(f.id, "preview", f)}
                    disabled={previewingId === f.id}
                    className="flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-slate-600 hover:bg-slate-100"
                  >
                    {previewingId === f.id ? <Loader2 size={13} className="animate-spin" /> : <Eye size={13} />}
                    Preview
                  </button>
                  <button
                    onClick={() => openSignedUrl(f.id, "download")}
                    disabled={downloadingId === f.id}
                    className="flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-blue-700 hover:bg-blue-50"
                  >
                    {downloadingId === f.id ? <Loader2 size={13} className="animate-spin" /> : <Download size={13} />}
                    Download
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Modal open={open} onClose={() => setOpen(false)} title="Upload Document">
        <form onSubmit={onUpload} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-slate-700">File (PDF or image)</label>
            <input
              ref={fileInputRef}
              type="file"
              required
              accept="application/pdf,image/png,image/jpeg"
              className="text-sm text-slate-700 file:mr-3 file:rounded-lg file:border-0 file:bg-blue-50 file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-blue-700"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Input
              id="doc-category"
              label="What is this?"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              required
              placeholder="e.g. Lab Report"
              list="doc-category-suggestions"
            />
            <datalist id="doc-category-suggestions">
              {CATEGORY_SUGGESTIONS.map((c) => (
                <option key={c} value={c} />
              ))}
            </datalist>
          </div>
          <label className="flex items-start gap-2 rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-600">
            <input
              type="checkbox"
              checked={confirmed}
              onChange={(e) => setConfirmed(e.target.checked)}
              className="mt-0.5"
            />
            This will be added to {patientName}&apos;s records (DOB {dateOfBirth}). I confirm this
            document is mine.
          </label>
          {formError && <p className="text-sm text-red-600">{formError}</p>}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={busy}>
              {busy ? "Checking your document…" : "Upload"}
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
              <button
                onClick={() => setPreview(null)}
                aria-label="Close preview"
                className="flex h-7 w-7 items-center justify-center rounded-md text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              >
                <X size={16} />
              </button>
            </div>
            <div className="min-h-0 flex-1 bg-slate-50">
              {preview.file.mimeType === "application/pdf" || preview.file.mimeType.startsWith("text/") ? (
                <iframe src={preview.url} title={preview.file.fileName} className="h-full w-full" />
              ) : preview.file.mimeType.startsWith("image/") ? (
                <div className="flex h-full items-center justify-center p-4">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={preview.url} alt={preview.file.fileName} className="max-h-full max-w-full object-contain" />
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
