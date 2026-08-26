export interface GroundedChatDocument {
  id: string;
  fileName: string;
  category: string;
  extractedText: string;
}

interface FileWithMaybeText {
  id: string;
  fileName: string;
  category: string;
  extractedText: string | null;
}

export const GROUNDED_CHAT_SYSTEM_PROMPT =
  "You are a document assistant for a patient's medical record. Answer ONLY using the " +
  "documents provided below — never introduce a diagnosis, medication, or clinical fact " +
  "that is not explicitly present in these documents, and never use general medical " +
  'knowledge to fill gaps. If the documents do not contain the answer, say so plainly ' +
  "instead of guessing. When you use information from a document, reference it by its " +
  'exact file name (e.g. "According to \\"Discharge Summary.pdf\\"..."). Respond in ' +
  "plain prose only, no markdown, no headers, no bullet points. Keep answers brief and " +
  "directly responsive to the question.";

export function buildDocumentContext(files: FileWithMaybeText[]): {
  context: string;
  documents: GroundedChatDocument[];
} {
  const documents = files.filter(
    (f): f is GroundedChatDocument => !!f.extractedText && f.extractedText.trim().length > 0
  );

  if (documents.length === 0) {
    return { context: "No documents with extracted text are available for this patient.", documents: [] };
  }

  const context = documents
    .map((d) => `--- Document: "${d.fileName}" (${d.category}) ---\n${d.extractedText}`)
    .join("\n\n");

  return { context, documents };
}

export function extractCitedFileIds(reply: string, documents: GroundedChatDocument[]): string[] {
  return documents.filter((d) => reply.includes(d.fileName)).map((d) => d.id);
}
