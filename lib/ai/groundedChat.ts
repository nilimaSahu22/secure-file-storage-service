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
  "You are a clinical assistant for a single patient's medical record. Answer using ONLY " +
  "the two sources provided below: the structured patient chart, and the patient's " +
  "uploaded documents. Never introduce a diagnosis, medication, or clinical fact that is " +
  "not explicitly present in the patient chart or the documents, and never use general " +
  "medical knowledge to fill gaps. If neither source contains the answer, say so plainly " +
  "instead of guessing. When you use information from a document, reference it by its " +
  'exact file name (e.g. "According to \\"Discharge Summary.pdf\\"..."); information from ' +
  'the structured data can be referred to as "the patient chart". Respond in plain prose ' +
  "only, no markdown, no headers, no bullet points. Keep answers brief and directly " +
  "responsive to the question. Reply in the same language the user wrote their most " +
  "recent message in; if that is unclear, reply in English. Keep document file names " +
  "verbatim even when replying in another language.";

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
