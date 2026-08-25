export type AgentSource = { fileName: string; locator: string };
export type AgentStep = { n: number; text: string };

export type AgentMessage =
  | { id: string; role: "user"; text: string }
  | {
      id: string;
      role: "assistant";
      lead: string;
      bullets: string[];
      sources: AgentSource[];
      disclaimer?: string;
    }
  | { id: string; role: "proposal"; steps: AgentStep[]; caution: string }
  | { id: string; role: "thinking"; caption: string };

const DEFAULT_DISCLAIMER =
  "Drafting aid only. Verify against the source report before it enters the chart.";

export const initialMessages: AgentMessage[] = [
  {
    id: "msg-1",
    role: "user",
    text: "Summarize the CT chest for the cardiology referral note.",
  },
  {
    id: "msg-2",
    role: "assistant",
    lead: "Three findings relevant to a cardiology referral:",
    bullets: [
      "Mild cardiomegaly with cardiothoracic ratio 0.54, unchanged from the March study.",
      "Coronary calcification in the LAD with no prior quantification on file.",
      "No pulmonary embolism, no pericardial effusion.",
    ],
    sources: [
      { fileName: "CT chest w/ contrast — report.pdf", locator: "p.2, Impression" },
      { fileName: "CT chest — prior study 2026-03-11.pdf", locator: "p.1" },
    ],
    disclaimer: DEFAULT_DISCLAIMER,
  },
  {
    id: "msg-3",
    role: "user",
    text: "Send the referral packet to Dr. Chen.",
  },
  {
    id: "msg-4",
    role: "proposal",
    steps: [
      {
        n: 1,
        text: "Assemble **Referral packet — cardiology.pdf** from the CT report, the 08-12 CMP and the echo findings.",
      },
      { n: 2, text: "Set visibility to **Public** and mint a fresh share token." },
      { n: 3, text: "Email the link to **j.chen@northbay.health**." },
    ],
    caution: "A public link is readable by anyone who has it. Confirm the packet is de-identified.",
  },
  {
    id: "msg-5",
    role: "thinking",
    caption: "Checking the packet for identifiers",
  },
];

export const suggestionChips: string[] = [
  "What changed since the last CMP?",
  "Find unsigned discharge summaries",
];

let mockIdCounter = 0;

export function nextMockId(prefix: string): string {
  mockIdCounter += 1;
  return `${prefix}-${Date.now()}-${mockIdCounter}`;
}

export function craftCannedReply(): AgentMessage {
  return {
    id: nextMockId("assistant"),
    role: "assistant",
    lead: "Here's a placeholder response for this demo.",
    bullets: [
      "This reply is mocked locally — no document was actually searched.",
      "Wire this panel up to a real agent backend to enable live answers.",
    ],
    sources: [],
    disclaimer: DEFAULT_DISCLAIMER,
  };
}
