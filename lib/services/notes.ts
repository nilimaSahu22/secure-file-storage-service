import { prisma } from "@/lib/prisma";

export interface CreateNoteInput {
  patientId: string;
  authorId: string;
  visitId?: string;
  subjective: string;
  objective: string;
  assessment: string;
  plan: string;
  isAiGenerated?: boolean;
}

export function createNote(input: CreateNoteInput) {
  return prisma.clinicalNote.create({
    data: {
      patientId: input.patientId,
      authorId: input.authorId,
      visitId: input.visitId,
      subjective: input.subjective,
      objective: input.objective,
      assessment: input.assessment,
      plan: input.plan,
      isAiGenerated: input.isAiGenerated ?? false,
    },
  });
}

export function getNoteById(id: string) {
  return prisma.clinicalNote.findUnique({
    where: { id },
    include: { patient: true, author: true, codingSuggestions: true },
  });
}

export function addCodingSuggestions(
  noteId: string,
  suggestions: { code: string; codeSystem: string; description: string; rationale: string }[]
) {
  return prisma.codingSuggestion.createMany({
    data: suggestions.map((s) => ({ noteId, ...s })),
  });
}
