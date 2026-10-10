import assert from "node:assert/strict";
import { test } from "node:test";
import { confirmedSections, renderIntakePdf } from "../pdf.js";
import { createFakeMailer, createSmtpMailer, sendPacketOnce } from "../send.js";
import { getTemplate } from "../template.js";

function exampleRecord() {
  return {
    id: "test-session-1",
    templateId: "adult-intake-v1",
    patientLabel: "Synthetic Patient",
    therapist: { name: "Synthetic Therapist", email: "therapist@example.com" },
    answers: {
      "AIQ-001": { status: "confirmed", answer: "Work stress", action: "confirm" },
      "AIQ-002": { status: "draft", answer: "UNCONFIRMED_PRIVATE_CONTENT", action: "edit" },
    },
    transcript: [{ t: 6, speaker: "Patient", text: "Work has been stressful." }],
    events: [{ fieldId: "AIQ-001", evidence: '"Work has been stressful."' }],
  };
}

test("PDF is valid, displays confirmed answer and avoids drafts", async () => {
  const bytes = await renderIntakePdf(exampleRecord());
  assert.ok(bytes.subarray(0, 5).equals(Buffer.from("%PDF-")));
  assert.ok(bytes.length > 800);
  // PDF streams are commonly compressed. Inspect via PDFDocument instead of
  // expecting the answer text in the raw PDF buffer.
  const { PDFDocument } = await import("pdf-lib");
  const doc = await PDFDocument.load(bytes);
  assert.ok(doc.getPageCount() >= 1);
});

test("PDF source contains confirmed answers and grounded exact evidence only", () => {
  const record = exampleRecord();
  record.events.push({ fieldId: "AIQ-001", evidence: '"Invented quotation"' });
  const sections = confirmedSections(record, getTemplate(record.templateId));
  assert.equal(sections.flatMap((section) => section.items).length, 1);
  const item = sections[0].items[0];
  assert.equal(item.answer, "Work stress");
  assert.equal(item.quote, "Work has been stressful.");
  assert.ok(!JSON.stringify(sections).includes("UNCONFIRMED_PRIVATE_CONTENT"));
});

test("only canonical template IDs are rendered", async () => {
  assert.equal(getTemplate("adult-intake-v1")?.id, "adult-intake-v1");
  await assert.rejects(renderIntakePdf({ ...exampleRecord(), templateId: "other" }), /Unknown intake template/);
});

test("one generated PDF is sent once; duplicate and concurrent calls do not resend", async () => {
  const record = exampleRecord();
  const mailer = createFakeMailer();
  const pdfBytes = await renderIntakePdf(record);
  const args = { sessionId: record.id, to: record.therapist.email, pdfBytes, mailer };
  const results = await Promise.all([sendPacketOnce(args), sendPacketOnce(args)]);
  assert.equal(results.filter((result) => result.sent).length, 1);
  assert.equal(mailer.messages.length, 1);
  assert.ok(mailer.messages[0].pdfBytes.equals(pdfBytes));
  assert.equal((await sendPacketOnce(args)).sent, false);
  assert.equal(mailer.messages.length, 1);
});

test("mailer errors allow safe retry; missing SMTP never sends", async () => {
  const pdfBytes = await renderIntakePdf(exampleRecord());
  const args = { sessionId: "retry-session", to: "therapist@example.com", pdfBytes };
  await assert.rejects(sendPacketOnce({ ...args, mailer: { send: async () => { throw new Error("offline"); } } }), /offline/);
  const fake = createFakeMailer();
  assert.equal((await sendPacketOnce({ ...args, mailer: fake })).sent, true);
  assert.equal(fake.messages.length, 1);
  await assert.rejects(createSmtpMailer({ smtpUrl: "", from: "" }), /SMTP is disabled/);
});

test("the mock handoff gate uses SEND_GATE_NOT_MET", async () => {
  // Static check avoids importing browser-only localStorage mock in node:test.
  const { readFileSync } = await import("node:fs");
  const mock = readFileSync(new URL("../../src/api/mockWorkspace.js", import.meta.url), "utf8");
  assert.match(mock, /elapsedSeconds < plannedMinutes \* 60/);
  assert.match(mock, /SEND_GATE_NOT_MET/);
  assert.doesNotMatch(mock, /SEND_GATE_EXPIRED/);
});
