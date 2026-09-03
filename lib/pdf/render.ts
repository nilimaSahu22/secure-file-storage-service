import { PDFDocument, StandardFonts, rgb, type PDFFont } from "pdf-lib";

// Server-only. Never import anything under lib/pdf/ from a client component.

export interface PrescriptionPdfItem {
  medicationName: string;
  dose: string;
  route: string;
  frequency: string;
  duration: string | null;
  instructions: string | null;
}

export interface PrescriptionPdfData {
  patientName: string;
  patientDob: string;
  providerName: string;
  visitDate: string;
  items: PrescriptionPdfItem[];
  investigations: string[];
  advice: string | null;
  followUpDate: string | null;
  signatureStatement: string;
  /** "Prescription" for the clinician copy, "Patient copy" for the portal. */
  copyLabel: string;
}

const MARGIN = 56;
const PAGE_WIDTH = 595.28; // A4
const PAGE_HEIGHT = 841.89;
const INK = rgb(0.1, 0.14, 0.19);
const MUTED = rgb(0.42, 0.47, 0.53);
const RULE = rgb(0.85, 0.87, 0.9);

/** Greedy word-wrap to a pixel width. */
function wrap(text: string, font: PDFFont, size: number, maxWidth: number): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (font.widthOfTextAtSize(candidate, size) <= maxWidth) {
      current = candidate;
    } else {
      if (current) lines.push(current);
      current = word;
    }
  }
  if (current) lines.push(current);
  return lines.length ? lines : [""];
}

export async function renderPrescriptionPdf(data: PrescriptionPdfData): Promise<Buffer> {
  const pdf = await PDFDocument.create();
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const contentWidth = PAGE_WIDTH - MARGIN * 2;

  let page = pdf.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
  let y = PAGE_HEIGHT - MARGIN;

  function ensureSpace(needed: number) {
    if (y - needed < MARGIN) {
      page = pdf.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
      y = PAGE_HEIGHT - MARGIN;
    }
  }

  function text(value: string, opts: { font?: PDFFont; size?: number; color?: ReturnType<typeof rgb>; indent?: number } = {}) {
    const f = opts.font ?? font;
    const size = opts.size ?? 10.5;
    const indent = opts.indent ?? 0;
    for (const line of wrap(value, f, size, contentWidth - indent)) {
      ensureSpace(size + 4);
      page.drawText(line, { x: MARGIN + indent, y: y - size, size, font: f, color: opts.color ?? INK });
      y -= size + 4;
    }
  }

  function gap(n: number) {
    y -= n;
  }

  function rule() {
    ensureSpace(12);
    page.drawLine({ start: { x: MARGIN, y: y - 4 }, end: { x: PAGE_WIDTH - MARGIN, y: y - 4 }, thickness: 0.75, color: RULE });
    y -= 12;
  }

  function sectionHeading(label: string) {
    gap(8);
    text(label.toUpperCase(), { font: bold, size: 8.5, color: MUTED });
    gap(2);
  }

  // Header
  text("MERIDIAN", { font: bold, size: 16 });
  gap(2);
  text(data.copyLabel, { size: 10, color: MUTED });
  rule();

  text(`Patient: ${data.patientName}`, { font: bold, size: 11 });
  text(`Date of birth: ${data.patientDob}`, { color: MUTED });
  text(`Visit date: ${data.visitDate}`, { color: MUTED });
  text(`Prescribing clinician: ${data.providerName}`, { color: MUTED });
  rule();

  sectionHeading("Medications");
  if (data.items.length === 0) {
    text("None prescribed at this visit.", { color: MUTED });
  } else {
    data.items.forEach((item, i) => {
      gap(4);
      const parts = [item.dose, item.route, item.frequency].filter(Boolean).join(" · ");
      text(`${i + 1}. ${item.medicationName}`, { font: bold });
      text(parts, { color: MUTED, indent: 14 });
      if (item.duration) text(`Duration: ${item.duration}`, { color: MUTED, indent: 14 });
      if (item.instructions) text(item.instructions, { indent: 14 });
    });
  }

  if (data.investigations.length > 0) {
    sectionHeading("Investigations ordered");
    for (const inv of data.investigations) text(`• ${inv}`);
  }

  if (data.advice) {
    sectionHeading("Advice");
    text(data.advice);
  }

  if (data.followUpDate) {
    sectionHeading("Follow-up");
    text(data.followUpDate);
  }

  rule();
  gap(6);
  text(data.signatureStatement, { size: 9.5, color: MUTED });

  const bytes = await pdf.save();
  return Buffer.from(bytes);
}
