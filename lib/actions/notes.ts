"use server";

import { revalidatePath } from "next/cache";
import { createNote, type CreateNoteInput } from "@/lib/services/notes";
import { generateFollowUpTasks } from "@/lib/services/autoTasks";

export async function createNoteAction(input: CreateNoteInput) {
  const note = await createNote(input);
  await generateFollowUpTasks(note);
  revalidatePath(`/dashboard/patients/${input.patientId}`);
  return note;
}
