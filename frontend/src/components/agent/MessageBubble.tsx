import type { AgentMessage } from "./mockConversation";
import { Citations } from "./Citations";

interface MessageBubbleProps {
  message: Extract<AgentMessage, { role: "user" | "assistant" }>;
  showCitations: boolean;
}

export function MessageBubble({ message, showCitations }: MessageBubbleProps) {
  if (message.role === "user") {
    return (
      <div className="flex justify-end">
        <div className="max-w-[86%] rounded-tl-[7px] rounded-tr-[7px] rounded-bl-[7px] rounded-br-[2px] bg-[#2563EB] px-3.5 py-2.5 text-[13.5px] text-white">
          {message.text}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col">
      <p className="text-[13.5px] leading-[1.6] font-medium text-[#0F172A]">{message.lead}</p>
      <ul className="mt-1.5 flex flex-col gap-[5px] pl-[18px] text-[13.5px] leading-[1.6] text-[#334155]" style={{ listStyleType: "disc" }}>
        {message.bullets.map((bullet, i) => (
          <li key={i}>{bullet}</li>
        ))}
      </ul>
      {showCitations && <Citations sources={message.sources} />}
      {message.disclaimer && (
        <p className="mt-2 text-[11.5px] text-[#94A3B8]">{message.disclaimer}</p>
      )}
    </div>
  );
}
