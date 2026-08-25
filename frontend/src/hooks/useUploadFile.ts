import { useCallback, useRef, useState } from "react";
import { requestUpload, confirmUpload } from "../api/files.api";
import type { FileRecord } from "../types/file";

export const MAX_UPLOAD_BYTES = 500 * 1024 * 1024; // 500MB

export type UploadState =
  | "idle"
  | "validating"
  | "requesting-url"
  | "uploading"
  | "confirming"
  | "success"
  | "error";

interface PendingUpload {
  file: File;
  fileId: string;
  uploadUrl: string;
  uploadFields: Record<string, string>;
}

function postToS3(
  pending: PendingUpload,
  onProgress: (pct: number) => void,
  onXhrCreated: (xhr: XMLHttpRequest) => void
): Promise<XMLHttpRequest> {
  return new Promise((resolve, reject) => {
    const formData = new FormData();
    Object.entries(pending.uploadFields).forEach(([key, value]) => formData.append(key, value));
    formData.append("file", pending.file);

    const xhr = new XMLHttpRequest();
    xhr.open("POST", pending.uploadUrl);

    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) {
        onProgress(Math.round((e.loaded / e.total) * 100));
      }
    };

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve(xhr);
      } else {
        reject(xhr);
      }
    };
    xhr.onerror = () => reject(xhr);
    xhr.onabort = () => reject(new DOMException("Upload cancelled", "AbortError"));

    onXhrCreated(xhr);
    xhr.send(formData);
  });
}

function isExpiryError(xhr: XMLHttpRequest): boolean {
  const text = xhr.responseText ?? "";
  return text.includes("ExpiredToken") || text.includes("AccessDenied");
}

export function useUploadFile() {
  const [state, setState] = useState<UploadState>("idle");
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const pendingRef = useRef<PendingUpload | null>(null);
  const xhrRef = useRef<XMLHttpRequest | null>(null);

  const runUpload = useCallback(async (pending: PendingUpload) => {
    setState("uploading");
    setProgress(0);
    try {
      await postToS3(pending, setProgress, (xhr) => {
        xhrRef.current = xhr;
      });
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") {
        setState("idle");
        setProgress(0);
        return null;
      }
      const xhr = err as XMLHttpRequest;
      if (isExpiryError(xhr)) {
        setError("Upload link expired. Retry to get a fresh link.");
      } else {
        setError("Upload failed. You can retry.");
      }
      setState("error");
      return null;
    }

    setState("confirming");
    try {
      const file: FileRecord = await confirmUpload(pending.fileId);
      setState("success");
      return file;
    } catch {
      setError("Could not confirm upload. You can retry.");
      setState("error");
      return null;
    }
  }, []);

  const upload = useCallback(
    async (file: File) => {
      setError(null);
      setState("validating");

      if (file.size > MAX_UPLOAD_BYTES) {
        setError("File exceeds the 500MB upload limit.");
        setState("error");
        return null;
      }

      setState("requesting-url");
      let created;
      try {
        created = await requestUpload({
          originalName: file.name,
          mimeType: file.type || "application/octet-stream",
          sizeBytes: file.size,
        });
      } catch {
        setError("Could not start upload. You can retry.");
        setState("error");
        return null;
      }

      const pending: PendingUpload = {
        file,
        fileId: created.fileId,
        uploadUrl: created.uploadUrl,
        uploadFields: created.uploadFields,
      };
      pendingRef.current = pending;

      return runUpload(pending);
    },
    [runUpload]
  );

  const retry = useCallback(async () => {
    const pending = pendingRef.current;
    if (!pending) return null;

    setError(null);

    const wasExpired = error?.includes("expired");
    if (wasExpired) {
      setState("requesting-url");
      try {
        const created = await requestUpload({
          originalName: pending.file.name,
          mimeType: pending.file.type || "application/octet-stream",
          sizeBytes: pending.file.size,
        });
        const refreshed: PendingUpload = {
          file: pending.file,
          fileId: created.fileId,
          uploadUrl: created.uploadUrl,
          uploadFields: created.uploadFields,
        };
        pendingRef.current = refreshed;
        return runUpload(refreshed);
      } catch {
        setError("Could not start upload. You can retry.");
        setState("error");
        return null;
      }
    }

    return runUpload(pending);
  }, [error, runUpload]);

  const cancel = useCallback(() => {
    xhrRef.current?.abort();
    xhrRef.current = null;
    pendingRef.current = null;
    setState("idle");
    setProgress(0);
    setError(null);
  }, []);

  const reset = useCallback(() => {
    pendingRef.current = null;
    setState("idle");
    setProgress(0);
    setError(null);
  }, []);

  return { state, progress, error, upload, retry, cancel, reset };
}
