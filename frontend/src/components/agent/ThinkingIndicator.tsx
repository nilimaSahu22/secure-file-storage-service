interface ThinkingIndicatorProps {
  caption: string;
}

const dotDelays = ["0s", "0.2s", "0.4s"];

export function ThinkingIndicator({ caption }: ThinkingIndicatorProps) {
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center gap-1">
        {dotDelays.map((delay, i) => (
          <span
            key={i}
            className="h-[5px] w-[5px] rounded-full bg-[#94A3B8]"
            style={{ animation: "agentBlink 1.2s infinite", animationDelay: delay }}
          />
        ))}
      </div>
      <span className="text-[11.5px] text-[#94A3B8]">{caption}</span>
    </div>
  );
}
