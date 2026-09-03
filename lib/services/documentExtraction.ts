import { prisma } from "@/lib/prisma";
import { FollowUpStatus } from "@prisma/client";
import { createResultAvailableFollowUp } from "@/lib/services/followUps";

export interface ExtractedTest {
  name: string;
  value: string;
  unit: string | null;
  referenceRange: string | null;
  date: string | null;
}

export interface DocumentExtraction {
  fullText: string;
  diagnoses: string[];
  tests: ExtractedTest[];
  documentDate: string | null;
}

/** Persists extracted text + structured test results from an accepted document. */
export async function applyExtraction(fileId: string, extraction: DocumentExtraction): Promise<void> {
  const file = await prisma.medicalFile.findUnique({ where: { id: fileId } });
  if (!file) return;

  const documentDate = extraction.documentDate ? new Date(extraction.documentDate) : null;
  const validDocDate = documentDate && !Number.isNaN(documentDate.getTime()) ? documentDate : null;

  await prisma.medicalFile.update({
    where: { id: fileId },
    data: {
      extractedText: extraction.fullText || file.extractedText,
      documentDate: validDocDate ?? undefined,
    },
  });

  for (const test of extraction.tests) {
    if (!test.name.trim() || !test.value.trim()) continue;
    const result = [test.value, test.unit].filter(Boolean).join(" ");
    const created = await prisma.testResult.create({
      data: {
        patientId: file.patientId,
        testName: test.name.trim(),
        result,
        normalRange: test.referenceRange,
        enteredByAI: true,
        sourceFileId: fileId,
        documentDate: validDocDate,
      },
    });
    await createResultAvailableFollowUp(created.id);
  }
}

const STOPWORDS = new Set(["the", "and", "for", "with", "test", "panel", "level", "of", "a", "an"]);

function keywords(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 2 && !STOPWORDS.has(w));
}

/** Marks outstanding follow-ups as complete when a matching accepted file or result now exists. */
export async function matchFollowUps(patientId: string): Promise<number> {
  const outstanding = await prisma.followUpItem.findMany({
    where: { patientId, status: FollowUpStatus.OUTSTANDING, kind: { in: ["TEST", "IMAGING"] } },
  });
  if (outstanding.length === 0) return 0;

  const [files, results] = await Promise.all([
    prisma.medicalFile.findMany({
      where: { patientId, status: "ACCEPTED" },
      select: { id: true, category: true, extractedText: true, validation: true },
    }),
    prisma.testResult.findMany({ where: { patientId }, select: { id: true, testName: true } }),
  ]);

  let matched = 0;
  for (const item of outstanding) {
    const kw = keywords(item.description);
    if (kw.length === 0) continue;

    const testHit = results.find((r) => {
      const rn = r.testName.toLowerCase();
      return kw.some((k) => rn.includes(k));
    });
    if (testHit) {
      await prisma.followUpItem.update({
        where: { id: item.id },
        data: { status: FollowUpStatus.COMPLETED, satisfiedByTestResultId: testHit.id },
      });
      matched += 1;
      continue;
    }

    const fileHit = files.find((f) => {
      const hay = `${f.category} ${f.extractedText ?? ""}`.toLowerCase();
      return kw.some((k) => hay.includes(k));
    });
    if (fileHit) {
      await prisma.followUpItem.update({
        where: { id: item.id },
        data: { status: FollowUpStatus.COMPLETED, satisfiedByFileId: fileHit.id },
      });
      matched += 1;
    }
  }
  return matched;
}
