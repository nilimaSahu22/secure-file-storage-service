"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

export function PatientSummaryRefresher({ visitId }: { visitId: string }) {
  const router = useRouter();
  const started = useRef(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    (async () => {
      try {
        const res = await fetch(`/api/visits/${visitId}/patient-summary`, { method: "POST" });
        if (res.ok) {
          router.refresh();
        } else {
          setFailed(true);
        }
      } catch {
        setFailed(true);
      }
    })();
  }, [visitId, router]);

  return (
    <p className="text-sm text-slate-400">
      {failed ? "Your summary isn't ready yet — check back shortly." : "Preparing your summary…"}
    </p>
  );
}
