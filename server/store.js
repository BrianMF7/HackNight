// prompt: true events are the follow-up nudges already stored on the session.
export function nudgeIds(record) {
  const ids = [];
  for (const event of record?.events ?? []) {
    if (event?.prompt === true && typeof event.fieldId === "string" && !ids.includes(event.fieldId)) {
      ids.push(event.fieldId);
    }
  }
  return ids;
}

/** Persist one sent packet. Null sql means DATABASE_URL is unset, so the email already stands. */
export async function storeSentPacket(sql, { caseId, therapist, pdfBytes, sentAt, nudgeIds: ids = [] }) {
  if (!sql) return { stored: false };
  await sql.begin(async (tx) => {
    await tx`create table if not exists sent_sessions (
      case_id text primary key,
      therapist text not null,
      pdf_bytes bytea not null,
      sent_at timestamptz not null
    )`;
    await tx`create table if not exists sent_nudges (
      case_id text not null references sent_sessions (case_id),
      nudge_id text not null,
      primary key (case_id, nudge_id)
    )`;
    await tx`insert into sent_sessions (case_id, therapist, pdf_bytes, sent_at)
      values (${caseId}, ${therapist}, ${pdfBytes}, ${sentAt})`;
    for (const nudgeId of ids) {
      await tx`insert into sent_nudges (case_id, nudge_id) values (${caseId}, ${nudgeId})`;
    }
  });
  return { stored: true };
}
