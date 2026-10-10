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
const MARGIN = 48;
const CONTENT_WIDTH = PAGE_WIDTH - 2 * MARGIN;
const FONT_SIZE = 10;
const LINE_HEIGHT = 15;

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

function verifiedEvidence(record, fieldId) {
  const transcriptTexts = (record.transcript ?? []).map((line) => String(line.text ?? ""));
  for (const event of record.events ?? []) {
    if (event.fieldId !== fieldId || typeof event.evidence !== "string") continue;
    const candidate = event.evidence.trim().replace(/^"|"$/g, "");
    if (candidate && transcriptTexts.some((text) => text.includes(candidate))) return candidate;
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
export function confirmedSections(record, template) {
  const sections = [];
  for (const sourcePage of template.pages) {
    for (const section of sourcePage.sections) {
      const items = [];
      for (const question of section.questions) {
        const saved = record.answers?.[question.id];
        if (saved?.status !== "confirmed") continue;
        items.push({
          id: question.id,
          label: question.label,
          answer: saved.answer,
          quote: verifiedEvidence(record, question.id),
          confirmation: saved.action === "edit_confirm" ? "Edited and confirmed" : "Confirmed",
        });
      }
      if (items.length) sections.push({ title: section.title, items });
    }
  }
  return sections;
}

/** @returns {Promise<Buffer>} The completed PDF bytes, never written to disk. */
export async function renderIntakePdf(record) {
  if (!record || typeof record !== "object") throw new TypeError("Session record is required");
  const template = getTemplate(record.templateId);
  if (!template) throw new Error("Unknown intake template");

  const pdf = await PDFDocument.create();
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  let page;
  let y;

  function newPage() {
    page = pdf.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
    y = PAGE_HEIGHT - MARGIN;
  }

  function draw(text, { strong = false, size = FONT_SIZE, indent = 0, gapAfter = 4 } = {}) {
    const typeface = strong ? bold : font;
    const width = CONTENT_WIDTH - indent;
    for (const line of wrap(text, typeface, size, width)) {
      if (y < MARGIN + LINE_HEIGHT) newPage();
      if (line) {
        page.drawText(line, { x: MARGIN + indent, y, size, font: typeface, color: rgb(0.1, 0.15, 0.22) });
      }
      y -= LINE_HEIGHT;
    }
    y -= gapAfter;
  }

  newPage();
  draw("Clinical Intake - Clinician-Confirmed Summary", { strong: true, size: 15, gapAfter: 12 });
  draw(`Template: ${template.title} (${template.version})`);
  draw(`Session: ${record.id ?? "Unknown"}`);
  draw(`Patient: ${record.patientLabel ?? "Unknown"}`);
  draw(`Therapist: ${record.therapist?.name ?? "Not assigned"}`);
  y -= 10;

  for (const section of confirmedSections(record, template)) {
    draw(section.title, { strong: true, size: 12, gapAfter: 6 });
    for (const item of section.items) {
      draw(`${item.id}: ${item.label}`, { strong: true, gapAfter: 1 });
      draw(`Confirmed answer: ${item.answer}`, { indent: 10, gapAfter: 2 });
      if (item.quote) draw(`Transcript quote: "${item.quote}"`, { indent: 10, gapAfter: 2 });
      draw(`Clinician confirmation: ${item.confirmation}`, { indent: 10, gapAfter: 8 });
    }
  }

  draw("Only clinician-confirmed responses are shown. Unanswered items are not negative findings.", { gapAfter: 4 });
  draw("No diagnosis code has been assigned by this document.");
  return Buffer.from(await pdf.save());
}
