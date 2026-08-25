type Tone = "neutral" | "blue" | "green" | "amber" | "red";

interface BadgeProps {
  tone?: Tone;
  children: React.ReactNode;
}

const toneClasses: Record<Tone, string> = {
  neutral: "bg-slate-100 text-slate-700",
  blue: "bg-blue-100 text-blue-700",
  green: "bg-green-100 text-green-700",
  amber: "bg-amber-100 text-amber-800",
  red: "bg-red-100 text-red-700",
};

export function Badge({ tone = "neutral", children }: BadgeProps) {
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${toneClasses[tone]}`}>
      {children}
    </span>
  );
}
