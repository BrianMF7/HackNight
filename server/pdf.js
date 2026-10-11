/**
 * Task 8: In-memory clinical intake PDF renderer.
 *
 * Input is the existing server session record and canonical server template.
 * Only answers with `status: "confirmed"` are included. Evidence is included
 * only if it appears verbatim in a stored transcript line. This function does
 * not update sessions, use the network, or send email.
 *
 * IMPORTANT: This renders the server's four-page *demo structure* as a
 * variable-length PDF summary, NOT the original eight-page source document.
 * A handoff gate must authorize sending; rendering alone is not authorization.
 */
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { getTemplate } from "./template.js";

const PAGE_WIDTH = 612;
const PAGE_HEIGHT = 792;
const MARGIN = 54;
const CONTENT_WIDTH = PAGE_WIDTH - 2 * MARGIN;
const FONT_SIZE = 10;
const LINE_HEIGHT = 14;
const INK = rgb(0.12, 0.13, 0.15);
const MUTED = rgb(0.38, 0.4, 0.43);
const RULE = rgb(0.78, 0.79, 0.8);
const BAR = rgb(0.17, 0.22, 0.27);

function printable(value) {
  // The built-in Helvetica font uses WinAnsi. Replace unsupported characters
  // rather than allowing user-provided Unicode to crash PDF rendering.
  return String(value ?? "")
    .normalize("NFKD")
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/[\u2013\u2014]/g, "-")
    .replace(/[^\x20-\x7E\n]/g, "?");
}

function quoteInTranscript(record, raw) {
  const transcriptTexts = (record.transcript ?? []).map((line) => String(line.text ?? ""));
  const candidate = String(raw ?? "").trim().replace(/^"|"$/g, "");
  if (!candidate || !transcriptTexts.some((text) => text.includes(candidate))) return null;
  return candidate;
}

function verifiedEvidence(record, fieldId) {
  const fromAnswer = quoteInTranscript(record, record.answers?.[fieldId]?.evidence);
  if (fromAnswer) return fromAnswer;
  for (const event of record.events ?? []) {
    if (event.fieldId !== fieldId) continue;
    const fromEvent = quoteInTranscript(record, event.evidence);
    if (fromEvent) return fromEvent;
  }
  return null;
}

function wrap(text, font, fontSize, width) {
  const result = [];
  for (const paragraph of printable(text).split("\n")) {
    const words = paragraph.split(/\s+/).filter(Boolean);
    if (!words.length) { result.push(""); continue; }
    let line = "";
    for (const word of words) {
      // Break overlong words, including synthetic data with no spaces.
      const parts = [];
      let rest = word;
      while (rest && font.widthOfTextAtSize(rest, fontSize) > width) {
        let count = 1;
        while (count < rest.length && font.widthOfTextAtSize(rest.slice(0, count + 1), fontSize) <= width) count++;
        parts.push(rest.slice(0, count));
        rest = rest.slice(count);
      }
      if (rest) parts.push(rest);
      for (const part of parts) {
        const next = line ? `${line} ${part}` : part;
        if (line && font.widthOfTextAtSize(next, fontSize) > width) {
          result.push(line);
          line = part;
        } else line = next;
      }
    }
    result.push(line);
  }
  return result;
}

/**
 * Select only the server-confirmed fields in canonical form order.
 * Exported separately to allow precise tests without inspecting compressed PDF streams.
 */
function collectSections(record, template, includeDrafts) {
  const sections = [];
  for (const sourcePage of template.pages) {
    for (const section of sourcePage.sections) {
      const items = [];
      for (const question of section.questions) {
        const saved = record.answers?.[question.id];
        const drafted = includeDrafts && saved?.status === "draft" && String(saved.answer ?? "").trim();
        if (saved?.status !== "confirmed" && !drafted) continue;
        items.push({
          id: question.id,
          label: question.label,
          answer: saved.answer,
          quote: verifiedEvidence(record, question.id),
          confirmation: saved.status === "confirmed"
            ? (saved.action === "edit_confirm" ? "Edited and confirmed" : "Confirmed")
            : "Draft",
          draft: saved.status !== "confirmed",
        });
      }
      if (items.length) sections.push({ title: section.title, items });
    }
  }
  return sections;
}

export function confirmedSections(record, template) {
  return collectSections(record, template, false);
}

export function exportSections(record, template) {
  return collectSections(record, template, true);
}

/** Patient lines only. The host is not part of the collected transcript. */
export function patientTranscriptLines(record) {
  return (record?.transcript ?? [])
    .filter((line) => line?.speaker === "Patient" && String(line.text ?? "").trim())
    .map((line) => ({ t: Number(line.t) || 0, text: String(line.text).trim() }));
}

/** @returns {Promise<Buffer>} The completed PDF bytes, never written to disk. */
export async function renderIntakePdf(record, { includeDrafts = false } = {}) {
  if (!record || typeof record !== "object") throw new TypeError("Session record is required");
  const template = getTemplate(record.templateId);
  if (!template) throw new Error("Unknown intake template");

  const pdf = await PDFDocument.create();
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const italic = await pdf.embedFont(StandardFonts.HelveticaOblique);
  let page;
  let y;
  let pageNo = 0;

  function paintChrome() {
    page.drawRectangle({ x: 0, y: PAGE_HEIGHT - 32, width: PAGE_WIDTH, height: 32, color: BAR });
    page.drawText("ClinicoLink", { x: MARGIN, y: PAGE_HEIGHT - 20, size: 10, font: bold, color: rgb(1, 1, 1) });
    page.drawText("Intake record", { x: PAGE_WIDTH - MARGIN - 68, y: PAGE_HEIGHT - 20, size: 9, font, color: rgb(0.82, 0.85, 0.88) });
    page.drawText(String(pageNo), { x: PAGE_WIDTH - MARGIN, y: 28, size: 8, font, color: MUTED });
  }

  function newPage() {
    page = pdf.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
    pageNo += 1;
    paintChrome();
    y = PAGE_HEIGHT - 56;
  }

  function rule() {
    if (y < MARGIN + 8) newPage();
    page.drawLine({ start: { x: MARGIN, y }, end: { x: PAGE_WIDTH - MARGIN, y }, thickness: 0.6, color: RULE });
    y -= 12;
  }

  function draw(text, { strong = false, oblique = false, size = FONT_SIZE, indent = 0, gapAfter = 2, color = INK } = {}) {
    const typeface = oblique ? italic : strong ? bold : font;
    const width = CONTENT_WIDTH - indent;
    for (const line of wrap(text, typeface, size, width)) {
      if (y < MARGIN + LINE_HEIGHT) newPage();
      if (line) page.drawText(line, { x: MARGIN + indent, y, size, font: typeface, color });
      y -= LINE_HEIGHT;
    }
    y -= gapAfter;
  }

  newPage();
  draw(includeDrafts ? "Intake summary" : "Confirmed intake summary", { strong: true, size: 16, gapAfter: 8 });
  draw(template.title, { size: 9, color: MUTED, gapAfter: 8 });
  rule();
  draw(`Patient    ${record.patientLabel ?? "Not recorded"}`, { size: 10 });
  draw(`Clinician  ${record.therapist?.name ?? "Not assigned"}`, { size: 10 });
  draw(`Record     ${record.id ?? "Unknown"}`, { size: 9, color: MUTED, gapAfter: 10 });

  draw("SECTION 1 - RISK ASSESSMENT", { strong: true, size: 12, gapAfter: 6 });
  const safetyQuestions = template.pages.flatMap(p => p.sections.flatMap(s => s.questions)).filter(q => q.safety);
  for (const question of safetyQuestions) {
    const saved = record.answers?.[question.id];
    draw(question.label, { strong: true, size: 9, gapAfter: 0 });
    draw(saved?.status === "confirmed" ? saved.answer : "Not yet clinician-confirmed", { size: 9, gapAfter: 5 });
  }
  draw("Safety responses are not a risk classification. An independent clinician assessment is required.", { size: 8, color: MUTED, gapAfter: 8 });
  rule();
  draw("SECTION 2 - INTAKE QUESTIONNAIRE", { strong: true, size: 12, gapAfter: 6 });
    for (const section of (includeDrafts ? exportSections(record, template) : confirmedSections(record, template))) {
    if (y < MARGIN + 48) newPage();
    draw(section.title.toUpperCase(), { strong: true, size: 9, gapAfter: 2, color: BAR });
    rule();
    for (const item of section.items) {
      if (y < MARGIN + 46) newPage();
      draw(item.label, { strong: true, size: 10, gapAfter: 1 });
      draw(item.answer, { size: 10, gapAfter: 1 });
      if (item.quote) draw(item.quote, { oblique: true, size: 9, color: MUTED, gapAfter: 1 });
      draw(item.draft ? "Draft" : item.confirmation, { size: 8, color: MUTED, gapAfter: 8 });
    }
  }

  const spoken = includeDrafts ? patientTranscriptLines(record) : [];
  if (spoken.length) {
    if (y < MARGIN + 48) newPage();
    draw("PATIENT TRANSCRIPT", { strong: true, size: 9, gapAfter: 2, color: BAR });
    rule();
    for (const line of spoken) {
      if (y < MARGIN + 28) newPage();
      draw(line.text, { size: 10, gapAfter: 6 });
    }
  }

  if (y < MARGIN + 36) newPage();
  rule();
  draw(includeDrafts
    ? "Draft entries are taken from the patient transcript and are not confirmed."
    : "Unanswered items are omitted. Omission is not a negative finding.", { size: 8, color: MUTED, gapAfter: 2 });
  const review = record.diagnostic?.review;
  if (review) {
    rule();
    draw('SECTION 3 - DIAGNOSTIC ASSESSMENT', { strong: true, size: 12 });
    if (review.decision === 'confirm') {
      draw(`Clinician-confirmed diagnostic consideration: ${review.name}`, { strong: true });
      draw('This preliminary consideration was selected by the clinician; reference retrieval does not establish DSM-5-TR criteria or an ICD code.', { size: 8, color: MUTED });
    } else {
      draw('Diagnosis deferred by clinician. Additional evaluation required.', { strong: true });
    }
    if (review.note) draw(`Clinician note: ${review.note}`, { size: 9 });
  } else {
    rule();
    draw('SECTION 3 - DIAGNOSTIC ASSESSMENT', { strong: true, size: 12 });
    draw('Diagnosis not established or clinician-confirmed in this document.', { size: 8, color: MUTED });
  }
  if (record.diagnostic?.reference?.status === 'retrieved') {
    draw(`Reference consulted: DSM-5-TR (2022), PDF pages ${record.diagnostic.reference.sources.map(x => x.page).join(', ')}. Clinician verification required.`, {size:8,color:MUTED});
  }
  draw('No diagnosis code has been assigned by this document.', { size: 8, color: MUTED });
  return Buffer.from(await pdf.save());
}
