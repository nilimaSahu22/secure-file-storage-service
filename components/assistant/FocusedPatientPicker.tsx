"use client";

import { useEffect, useRef, useState } from "react";
import { Search, X, UserRound } from "lucide-react";

interface PatientHit {
  id: string;
  name: string;
  dob: string;
}

export function FocusedPatientPicker({
  value,
  onChange,
}: {
  value: { id: string; name: string } | null;
  onChange: (patient: { id: string; name: string } | null) => void;
}) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [hits, setHits] = useState<PatientHit[]>([]);
  const [loading, setLoading] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const t = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/assistant/patients?q=${encodeURIComponent(q)}`);
        if (res.ok) setHits((await res.json()).patients ?? []);
      } finally {
        setLoading(false);
      }
    }, 200);
    return () => clearTimeout(t);
  }, [q, open]);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  return (
    <div ref={boxRef} className="relative">
      {value ? (
        <div className="flex items-center gap-1.5 rounded-full border border-blue-200 bg-blue-50 py-1 pl-2.5 pr-1 text-xs font-medium text-blue-800">
          <UserRound size={12} />
          {value.name || "Patient in focus"}
          <button
            onClick={() => onChange(null)}
            aria-label="Clear focused patient"
            className="flex h-5 w-5 items-center justify-center rounded-full hover:bg-blue-100"
          >
            <X size={12} />
          </button>
        </div>
      ) : (
        <button
          onClick={() => setOpen((v) => !v)}
          className="flex items-center gap-1.5 rounded-full border border-slate-300 px-2.5 py-1 text-xs font-medium text-slate-500 hover:bg-slate-50"
        >
          <Search size={12} /> Choose patient
        </button>
      )}

      {open && !value && (
        <div className="absolute right-0 z-20 mt-1 w-72 rounded-lg border border-slate-200 bg-white p-2 shadow-lg">
          <input
            autoFocus
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search patients…"
            className="w-full rounded-md border border-slate-300 px-2.5 py-1.5 text-sm outline-none focus:border-blue-500"
          />
          <div className="mt-1 max-h-64 overflow-y-auto">
            {loading && <p className="px-2 py-2 text-xs text-slate-400">Searching…</p>}
            {!loading && hits.length === 0 && (
              <p className="px-2 py-2 text-xs text-slate-400">No patients found.</p>
            )}
            {hits.map((p) => (
              <button
                key={p.id}
                onClick={() => {
                  onChange({ id: p.id, name: p.name });
                  setOpen(false);
                  setQ("");
                }}
                className="flex w-full items-center justify-between rounded-md px-2 py-1.5 text-left text-sm hover:bg-slate-50"
              >
                <span className="text-slate-800">{p.name}</span>
                <span className="text-xs text-slate-400">{p.dob}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
