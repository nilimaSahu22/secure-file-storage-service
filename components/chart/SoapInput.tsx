"use client";

export function SoapField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs font-semibold uppercase tracking-wide text-slate-400">{label}</dt>
      <dd className="whitespace-pre-wrap text-slate-700">{value}</dd>
    </div>
  );
}

export function SoapInput({
  label,
  value,
  onChange,
  quickFills = [],
  required = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  quickFills?: readonly { label: string; text: string }[];
  required?: boolean;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium text-slate-700">{label}</label>
        {quickFills.length > 0 && (
          <div className="flex gap-1.5">
            {quickFills.map((qf) => (
              <button
                key={qf.label}
                type="button"
                onClick={() => onChange(value ? `${value} ${qf.text}` : qf.text)}
                className="rounded-full border border-slate-200 px-2 py-0.5 text-[11px] text-slate-500 hover:border-blue-300 hover:text-blue-700"
              >
                {qf.label}
              </button>
            ))}
          </div>
        )}
      </div>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        rows={3}
        className="rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
      />
    </div>
  );
}
