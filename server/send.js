/**
 * Task 8: delivery primitive, deliberately NOT an HTTP endpoint.
 *
 * Only Task 7's authoritative gate should invoke this after verifying
 * elapsed time, all required confirmations, safety answers, and the stored
 * therapist recipient. No client-supplied IDs or email are trusted here.
 *
 * In-memory deduplication is sufficient for a single-process demo, not for
 * multi-worker or crash-safe production delivery. Persist an idempotency key
 * before enabling production SMTP.
 */
const inFlightOrSent = new Map();

/** A fake mailer for tests; no network calls or disk writes. */
export function createFakeMailer() {
  const messages = [];
  return {
    messages,
    async send({ to, subject, pdfBytes }) {
      messages.push({ to, subject, pdfBytes: Buffer.from(pdfBytes) });
      return { accepted: [to] };
    },
  };
}

/**
 * SMTP is explicitly opt-in. Does not send unless SMTP_URL is configured.
 * `nodemailer` is dynamically loaded, so tests never need it.
 */
export async function createSmtpMailer({ smtpUrl = process.env.SMTP_URL, from = process.env.SMTP_FROM } = {}) {
  if (!smtpUrl) throw new Error("SMTP is disabled. SMTP_URL is not set.");
  if (!from) throw new Error("SMTP_FROM is required for SMTP delivery.");
  const { default: nodemailer } = await import("nodemailer");
  const transporter = nodemailer.createTransport(smtpUrl);
  return {
    async send({ to, subject, pdfBytes }) {
      return transporter.sendMail({
        from,
        to,
        subject,
        text: "Attached is the clinician-confirmed intake summary.",
        attachments: [{ filename: "intake-summary.pdf", content: pdfBytes, contentType: "application/pdf" }],
      });
    },
  };
}

/**
 * Send a pre-authorized, rendered packet once per session in this process.
 * The caller MUST already have passed Task 7's server-side handoff gate.
 * Failed sends clear the reservation so a later retry can succeed.
 */
export async function sendPacketOnce({ sessionId, to, pdfBytes, mailer }) {
  if (typeof sessionId !== "string" || !sessionId) throw new TypeError("sessionId is required");
  if (typeof to !== "string" || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to)) throw new TypeError("Valid recipient email required");
  if (!Buffer.isBuffer(pdfBytes) || !pdfBytes.subarray(0, 5).equals(Buffer.from("%PDF-"))) {
    throw new TypeError("A PDF Buffer is required");
  }
  if (!mailer || typeof mailer.send !== "function") throw new TypeError("Mailer required");

  if (inFlightOrSent.has(sessionId)) {
    await inFlightOrSent.get(sessionId);
    return { sent: false, duplicate: true };
  }

  // Save the promise *before* awaiting, preventing concurrent duplicate sends.
  const pending = Promise.resolve().then(() => mailer.send({
    to,
    subject: "Clinician-confirmed intake summary",
    pdfBytes,
  }));
  inFlightOrSent.set(sessionId, pending);
  try {
    await pending;
    return { sent: true, duplicate: false, to };
  } catch (error) {
    inFlightOrSent.delete(sessionId);
    throw error;
  }
}
