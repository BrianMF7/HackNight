import { findSession } from './session.js';
import { getTemplate } from './template.js';
import { clockStatus } from './clock.js';
import { renderIntakePdf } from './pdf.js';
import { sendPacketOnce } from './send.js';

/** Server-owned checks. Never use request-body elapsedSeconds or confirmedIds. */
export function handoffReasons(record, now) {
  const template = getTemplate(record.templateId);
  if (!template) throw new Error('Session template unavailable');
  const questions = template.pages.flatMap(p => p.sections.flatMap(s => s.questions));
  const confirmed = q => record.answers?.[q.id]?.status === 'confirmed' &&
    typeof record.answers[q.id].answer === 'string' && record.answers[q.id].answer.trim().length > 0;
  const reasons = [];
  const missingRequired = questions.filter(q => q.required && !confirmed(q));
  if (clockStatus(record.startedAt, now) !== 'met') {
    reasons.push({ code: 'SEND_GATE_NOT_MET', message: 'At least 45 minutes are required before handoff.' });
  }
  if (missingRequired.length) {
    reasons.push({
      code: 'REQUIRED_UNCONFIRMED',
      message: `${missingRequired.length} required question(s) are not clinician-confirmed.`,
    });
  }
  if (questions.some(q => q.safety && !confirmed(q))) {
    reasons.push({ code: 'SAFETY_UNRESOLVED', message: 'A required safety item is unresolved.' });
  }
  if (typeof record.therapist?.email !== 'string' ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(record.therapist.email)) {
    reasons.push({ code: 'NO_RECIPIENT', message: 'No therapist recipient is assigned.' });
  }
  return reasons;
}

/** Explicit clinician POST is the only delivery request; no preview route sends mail. */
export async function handleHandoff(method, pathname, _body, now, { mailer } = {}) {
  const match = method === 'POST' && /^\/api\/sessions\/([^/]+)\/handoff$/.exec(pathname);
  if (!match) return null;
  const record = findSession(match[1]);
  if (!record) return { status: 404, body: { code: 'NOT_FOUND', message: 'Not found' } };
  const reasons = handoffReasons(record, now);
  if (reasons.length) return { status: 200, body: { allowed: false, sent: false, reasons } };
  // Mailer is injected in tests. A real mailer must be explicitly configured by the server owner.
  if (!mailer) return { status: 503, body: { allowed: false, sent: false, code: 'MAIL_NOT_CONFIGURED' } };
  try {
    const pdfBytes = await renderIntakePdf(record);
    const result = await sendPacketOnce({ sessionId: record.id, to: record.therapist.email, pdfBytes, mailer });
    return { status: 200, body: { allowed: true, sent: result.sent, duplicate: result.duplicate, to: record.therapist.email } };
  } catch {
    return { status: 502, body: { allowed: false, sent: false, code: 'HANDOFF_FAILED' } };
  }
}
