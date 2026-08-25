import { useState } from "react";
import { Download, Eye, Link2, Trash2, FileText } from "lucide-react";
import type { FileRecord } from "../../types/file";
import { Badge } from "../ui/Badge";
import { IconButton } from "../ui/IconButton";
import { showToast } from "../ui/Toast";
import { formatBytes } from "../../lib/formatBytes";
import * as filesApi from "../../api/files.api";

interface FileCardProps {
  file: FileRecord;
  onDeleted: (fileId: string) => void;
  onVisibilityChanged: (file: FileRecord) => void;
}

export function FileCard({ file, onDeleted, onVisibilityChanged }: FileCardProps) {
  const [busy, setBusy] = useState(false);

  async function handleDownload() {
    try {
      const url = await filesApi.getDownloadUrl(file.id);
      window.open(url, "_blank", "noopener,noreferrer");
    } catch {
      showToast.error("Could not generate download link");
    }
  }

  async function handleCopyLink() {
    if (!file.shareToken) return;
    const link = `${window.location.origin}/share/${file.shareToken}`;
    try {
      await navigator.clipboard.writeText(link);
      showToast.success("Link copied to clipboard");
    } catch {
      showToast.error("Could not copy link");
    }
  }

  async function handleToggleVisibility() {
    setBusy(true);
    try {
      const next = file.visibility === "PUBLIC" ? "PRIVATE" : "PUBLIC";
      const updated = await filesApi.setVisibility(file.id, next);
      onVisibilityChanged(updated);
      showToast.success(next === "PUBLIC" ? "File is now public" : "File is now private");
    } catch {
      showToast.error("Could not update visibility");
    } finally {
      setBusy(false);
    }
  }

  async function handleDelete() {
    setBusy(true);
    try {
      await filesApi.deleteFile(file.id);
      onDeleted(file.id);
    } catch {
      showToast.error("Could not delete file");
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-gray-100 p-4">
      <div className="flex items-start justify-between">
        <div className="flex min-w-0 items-center gap-2">
          <FileText className="shrink-0 text-gray-400" size={20} />
          <span className="truncate text-sm font-medium text-gray-900" title={file.originalName}>
            {file.originalName}
          </span>
        </div>
        <Badge visibility={file.visibility} />
      </div>

      <div className="flex items-center gap-3 text-xs text-gray-500">
        <span>{formatBytes(file.sizeBytes)}</span>
        {file.visibility === "PUBLIC" && (
          <span className="flex items-center gap-1">
            <Eye size={12} />
            {file.viewCount}
          </span>
        )}
      </div>

      <div className="flex items-center gap-1 border-t border-gray-50 pt-2">
        <IconButton icon={Download} label="Download" onClick={handleDownload} disabled={busy} />
        {file.visibility === "PUBLIC" && (
          <IconButton icon={Link2} label="Copy share link" onClick={handleCopyLink} disabled={busy} />
        )}
        <button
          onClick={handleToggleVisibility}
          disabled={busy}
          className="ml-auto rounded-md px-2 py-1 text-xs font-medium text-gray-500 hover:bg-gray-100 disabled:opacity-50"
        >
          Make {file.visibility === "PUBLIC" ? "private" : "public"}
        </button>
        <IconButton
          icon={Trash2}
          label="Delete"
          onClick={handleDelete}
          disabled={busy}
          className="hover:bg-red-50 hover:text-red-600"
        />
      </div>
    </div>
  );
}
