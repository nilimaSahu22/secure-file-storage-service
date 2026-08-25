import { useRef, useState, type DragEvent } from "react";
import { UploadCloud } from "lucide-react";
import { Modal } from "../ui/Modal";
import { Button } from "../ui/Button";
import { ProgressBar } from "../ui/ProgressBar";
import { showToast } from "../ui/Toast";
import { useUploadFile } from "../../hooks/useUploadFile";
import { formatBytes } from "../../lib/formatBytes";
import type { FileRecord } from "../../types/file";

interface UploadModalProps {
  open: boolean;
  onClose: () => void;
  onUploaded: (file: FileRecord) => void;
}

export function UploadModal({ open, onClose, onUploaded }: UploadModalProps) {
  const { state, progress, error, upload, retry, cancel, reset } = useUploadFile();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const busy = state === "requesting-url" || state === "uploading" || state === "confirming" || state === "validating";

  function handleClose() {
    if (busy) cancel();
    setSelectedFile(null);
    reset();
    onClose();
  }

  async function startUpload(file: File) {
    setSelectedFile(file);
    const uploaded = await upload(file);
    if (uploaded) {
      showToast.success("Upload complete");
      onUploaded(uploaded);
      setSelectedFile(null);
      reset();
      onClose();
    }
  }

  async function handleRetry() {
    const uploaded = await retry();
    if (uploaded) {
      showToast.success("Upload complete");
      onUploaded(uploaded);
      setSelectedFile(null);
      reset();
      onClose();
    }
  }

  function onDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setDragActive(false);
    const file = e.dataTransfer.files?.[0];
    if (file) startUpload(file);
  }

  return (
    <Modal open={open} onClose={handleClose} title="Upload a file">
      {!selectedFile ? (
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragActive(true);
          }}
          onDragLeave={() => setDragActive(false)}
          onDrop={onDrop}
          onClick={() => inputRef.current?.click()}
          className={`flex cursor-pointer flex-col items-center gap-2 rounded-lg border-2 border-dashed p-10 text-center transition-colors ${
            dragActive ? "border-indigo-500 bg-indigo-50" : "border-gray-200"
          }`}
        >
          <UploadCloud className="text-gray-400" size={28} />
          <p className="text-sm text-gray-600">Drag and drop a file, or click to browse</p>
          <p className="text-xs text-gray-400">Up to 500MB</p>
          <input
            ref={inputRef}
            type="file"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) startUpload(file);
            }}
          />
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between text-sm">
            <span className="truncate font-medium text-gray-900">{selectedFile.name}</span>
            <span className="shrink-0 text-gray-400">{formatBytes(selectedFile.size)}</span>
          </div>

          <ProgressBar value={state === "confirming" || state === "success" ? 100 : progress} />

          <p className="text-xs text-gray-500">
            {state === "requesting-url" && "Preparing upload…"}
            {state === "uploading" && `Uploading… ${progress}%`}
            {state === "confirming" && "Confirming…"}
            {state === "error" && error}
          </p>

          <div className="flex justify-end gap-2">
            {state === "error" ? (
              <>
                <Button variant="outlined" onClick={handleClose}>
                  Cancel
                </Button>
                <Button onClick={handleRetry}>Retry</Button>
              </>
            ) : (
              <Button variant="outlined" onClick={handleClose}>
                Cancel
              </Button>
            )}
          </div>
        </div>
      )}
    </Modal>
  );
}
