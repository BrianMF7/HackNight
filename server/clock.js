/**
 * Task 4: Pure, deterministic minimum-duration check for clinical handoff.
 *
 * @param {number} startedAt - Server-owned session start as epoch milliseconds.
 * @param {number} now - Evaluation timestamp as epoch milliseconds (provided by caller).
 * @returns {'under' | 'met'} 'met' at or after 45:00, never 'expired'.
 *
 * Invalid, non-finite or backwards timestamps are treated as 'under' (fail closed).
 * The function deliberately does not read Date.now(), the browser clock, or the network.
 */
export function clockStatus(startedAt, now) {
  const MINIMUM_MILLISECONDS = 45 * 60 * 1000;

  if (!Number.isFinite(startedAt) || !Number.isFinite(now) || now < startedAt) {
    return 'under';
  }

  return now - startedAt >= MINIMUM_MILLISECONDS ? 'met' : 'under';
}
