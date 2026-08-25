import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { FileText, Eye, Lock } from "lucide-react";
import { getSharedFile, type SharedFile } from "../api/share.api";
import { Button } from "../components/ui/Button";
import { formatBytes } from "../lib/formatBytes";

type LoadState = "loading" | "ready" | "unavailable";

export function SharePage() {
  const { token } = useParams<{ token: string }>();
  const [state, setState] = useState<LoadState>("loading");
  const [file, setFile] = useState<SharedFile | null>(null);
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!token) {
      setState("unavailable");
      return;
    }
    getSharedFile(token)
      .then((res) => {
        setFile(res.file);
        setUrl(res.url);
        setState("ready");
      })
      .catch(() => setState("unavailable"));
  }, [token]);

  if (state === "loading") {
    return (
      <div className="flex min-h-screen items-center justify-center text-sm text-gray-400">
        Loading…
      </div>
    );
  }

  if (state === "unavailable" || !file || !url) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-2 px-4 text-center">
        <Lock className="text-gray-300" size={32} />
        <h1 className="text-lg font-semibold text-gray-900">This link is invalid or private</h1>
        <p className="text-sm text-gray-500">
          The file may have been made private or deleted by its owner.
        </p>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-md rounded-xl border border-gray-100 p-8 text-center shadow-sm">
        <FileText className="mx-auto mb-4 text-indigo-600" size={32} />
        <h1 className="truncate text-lg font-semibold text-gray-900">{file.originalName}</h1>
        <p className="mt-1 text-sm text-gray-500">{formatBytes(file.sizeBytes)}</p>
        <p className="mt-1 flex items-center justify-center gap-1 text-xs text-gray-400">
          <Eye size={12} />
          {file.viewCount} views
        </p>
        <a href={url} target="_blank" rel="noopener noreferrer">
          <Button className="mt-6 w-full">Download</Button>
        </a>
      </div>
    </div>
  );
}
