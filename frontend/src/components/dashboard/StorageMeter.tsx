import { ProgressBar } from "../ui/ProgressBar";
import { formatBytes } from "../../lib/formatBytes";

const STORAGE_LIMIT_BYTES = 15 * 1024 * 1024 * 1024; // 15GB

interface StorageMeterProps {
  usedBytes: number;
}

export function StorageMeter({ usedBytes }: StorageMeterProps) {
  const pct = (usedBytes / STORAGE_LIMIT_BYTES) * 100;

  return (
    <div className="px-2">
      <div className="mb-1 flex items-center justify-between text-xs text-gray-500">
        <span>{formatBytes(usedBytes)} used</span>
        <span>{formatBytes(STORAGE_LIMIT_BYTES)}</span>
      </div>
      <ProgressBar value={pct} />
    </div>
  );
}
