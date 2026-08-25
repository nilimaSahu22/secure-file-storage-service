import { useEffect, useMemo, useState } from "react";
import { Sidebar, type DashboardFilter } from "../components/dashboard/Sidebar";
import { Topbar } from "../components/dashboard/Topbar";
import { Toolbar } from "../components/dashboard/Toolbar";
import { StorageMeter } from "../components/dashboard/StorageMeter";
import { FileGrid } from "../components/dashboard/FileGrid";
import { FileGridSkeleton } from "../components/dashboard/FileGridSkeleton";
import { UploadModal } from "../components/dashboard/UploadModal";
import { AgentPanel } from "../components/agent/AgentPanel";
import { showToast } from "../components/ui/Toast";
import * as filesApi from "../api/files.api";
import type { FileRecord, StorageStats } from "../types/file";

export function DashboardPage() {
  const [files, setFiles] = useState<FileRecord[]>([]);
  const [stats, setStats] = useState<StorageStats>({ usedBytes: 0, fileCount: 0 });
  const [filter, setFilter] = useState<DashboardFilter>("all");
  const [search, setSearch] = useState("");
  const [uploadOpen, setUploadOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const [fileList, storageStats] = await Promise.all([filesApi.listFiles(), filesApi.getStats()]);
        setFiles(fileList);
        setStats(storageStats);
      } catch {
        showToast.error("Could not load your files");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const visibleFiles = useMemo(() => {
    return files
      .filter((f) => (filter === "shared" ? f.visibility === "PUBLIC" : true))
      .filter((f) => f.originalName.toLowerCase().includes(search.toLowerCase()));
  }, [files, filter, search]);

  function handleUploaded(file: FileRecord) {
    setFiles((prev) => [file, ...prev]);
    setStats((prev) => ({ usedBytes: prev.usedBytes + file.sizeBytes, fileCount: prev.fileCount + 1 }));
  }

  function handleDeleted(fileId: string) {
    setFiles((prev) => {
      const removed = prev.find((f) => f.id === fileId);
      if (removed) {
        setStats((s) => ({
          usedBytes: Math.max(0, s.usedBytes - removed.sizeBytes),
          fileCount: Math.max(0, s.fileCount - 1),
        }));
      }
      return prev.filter((f) => f.id !== fileId);
    });
  }

  function handleVisibilityChanged(updated: FileRecord) {
    setFiles((prev) => prev.map((f) => (f.id === updated.id ? updated : f)));
  }

  return (
    <div className="flex min-h-screen" style={{ minWidth: 1360 }}>
      <Sidebar filter={filter} onFilterChange={setFilter} />
      <div className="flex flex-1 flex-col" style={{ minWidth: 640 }}>
        <Topbar />
        <div className="border-b border-gray-100 px-6 py-3">
          <StorageMeter usedBytes={stats.usedBytes} />
        </div>
        <Toolbar search={search} onSearchChange={setSearch} onUploadClick={() => setUploadOpen(true)} />
        {loading ? (
          <FileGridSkeleton />
        ) : (
          <FileGrid
            files={visibleFiles}
            hasFilter={search.length > 0}
            onDeleted={handleDeleted}
            onVisibilityChanged={handleVisibilityChanged}
          />
        )}
      </div>
      <UploadModal open={uploadOpen} onClose={() => setUploadOpen(false)} onUploaded={handleUploaded} />
      <AgentPanel />
    </div>
  );
}
