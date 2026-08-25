import type { ClinicalNote } from "@prisma/client";
import { createAutoTasks } from "@/lib/services/tasks";

interface TaskRule {
  keywords: string[];
  description: (note: ClinicalNote) => string;
}

const RULES: TaskRule[] = [
  {
    keywords: ["follow up", "follow-up", "recheck", "re-evaluate"],
    description: () => "Schedule follow-up appointment",
  },
  {
    keywords: ["refer", "referral"],
    description: () => "Process specialist referral",
  },
  {
    keywords: ["lab", "test", "panel", "level", "hba1c", "cbc", "inr"],
    description: () => "Order/track pending lab work",
  },
  {
    keywords: ["counsel", "education", "diet", "lifestyle"],
    description: () => "Send patient education materials",
  },
  {
    keywords: ["medication", "dose", "dosage", "prescri"],
    description: () => "Confirm pharmacy received updated prescription",
  },
];

const FALLBACK_TASKS = [
  "Review note for billing and coding accuracy",
  "Update patient care plan in chart",
];

export async function generateFollowUpTasks(note: ClinicalNote): Promise<void> {
  const haystack = `${note.plan} ${note.assessment}`.toLowerCase();
  const matched = new Set<string>();

  for (const rule of RULES) {
    if (rule.keywords.some((kw) => haystack.includes(kw))) {
      matched.add(rule.description(note));
    }
    if (matched.size >= 3) break;
  }

  let descriptions = Array.from(matched);
  let fallbackIndex = 0;
  while (descriptions.length < 2 && fallbackIndex < FALLBACK_TASKS.length) {
    descriptions.push(FALLBACK_TASKS[fallbackIndex]);
    fallbackIndex += 1;
  }
  descriptions = descriptions.slice(0, 3);

  if (descriptions.length === 0) return;

  await createAutoTasks(
    descriptions.map((description) => ({
      patientId: note.patientId,
      noteId: note.id,
      description,
    }))
  );
}
