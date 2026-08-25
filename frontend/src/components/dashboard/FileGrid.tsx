import { FolderOpen, SearchX } from "lucide-react";
import type { FileRecord } from "../../types/file";
import { FileCard } from "./FileCard";

interface FileGridProps {
  files: FileRecord[];
  hasFilter: boolean;
  onDeleted: (fileId: string) => void;
  onVisibilityChanged: (file: FileRecord) => void;
}

export function FileGrid({ files, hasFilter, onDeleted, onVisibilityChanged }: FileGridProps) {
  if (files.length === 0) {
    const Icon = hasFilter ? SearchX : FolderOpen;
    return (
      <div className="flex flex-col items-center justify-center gap-2 py-24 text-center text-gray-400">
        <Icon size={32} />
        <p className="text-sm">
          {hasFilter ? "No files match your search." : "No files yet. Upload your first file to get started."}
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 px-6 pb-8 sm:grid-cols-2 lg:grid-cols-3">
      {files.map((file) => (
        <FileCard
          key={file.id}
          file={file}
          onDeleted={onDeleted}
          onVisibilityChanged={onVisibilityChanged}
        />
      ))}
    </div>
  );
}
