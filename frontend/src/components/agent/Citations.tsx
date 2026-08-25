import type { AgentSource } from "./mockConversation";

interface CitationsProps {
  sources: AgentSource[];
}

export function Citations({ sources }: CitationsProps) {
  if (sources.length === 0) return null;

  return (
    <div className="mt-2 rounded-[6px] bg-[#F8FAFC] px-3 py-2.5">
      <div className="mb-1.5 text-[10.5px] font-semibold uppercase tracking-wide text-[#94A3B8]">
        Sources
      </div>
      <div className="flex flex-col gap-1">
        {sources.map((source) => (
          <a
            key={`${source.fileName}-${source.locator}`}
            href="#"
            className="text-[12.5px] text-[#1D4ED8] hover:underline"
          >
            {source.fileName} · {source.locator}
          </a>
        ))}
      </div>
    </div>
  );
}
