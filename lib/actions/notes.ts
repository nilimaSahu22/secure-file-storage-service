"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { createNote, type CreateNoteInput } from "@/lib/services/notes";
import { generateFollowUpTasks } from "@/lib/services/autoTasks";

export async function createNoteAction(input: CreateNoteInput) {
  const session = await auth();
  const note = await createNote(input);
  const tasksCreated = await generateFollowUpTasks(note);

  await logAudit({
    actorType: "staff",
    actorId: session?.user.id,
    actorName: session?.user.name ?? "Unknown staff",
    action: "note.created",
    targetType: "ClinicalNote",
    targetId: note.id,
    metadata: { patientId: input.patientId, tasksCreated },
  });

  revalidatePath(`/dashboard/patients/${input.patientId}`);
  return note;
}
