// Operator-supplied, permission-controlled reference retrieval. The manual is never bundled.
import { readFileSync } from 'node:fs';

const MAX_REFERENCE_CHARS = 7000;
let cache = { path: null, data: null };
const STOP = new Set('this that with from have about patient clinician what when where which are was were been into their them they does would should could then than there these those over under some more less also only most your because after before during each other disorder disorders criteria diagnostic diagnosis symptoms symptom mental and the for you she his her its but not any can all'.split(' '));
function words(text) { return [...new Set(String(text ?? '').toLowerCase().match(/[a-z]{4,}/g)?.filter(x => !STOP.has(x)) ?? [])]; }
function loadIndex(path) {
  if (!path) return null;
  if (cache.path === path) return cache.data;
  try {
    const parsed = JSON.parse(readFileSync(path, 'utf8'));
    if (parsed.edition !== 'DSM-5-TR (2022)' || !Array.isArray(parsed.pages) || parsed.pages.length > 1600) throw Error('Invalid reference index');
    const pages = parsed.pages.filter(p => Number.isInteger(p.page) && p.page > 0 && p.page <= 2000 && typeof p.text === 'string').map(p => ({page:p.page, text:p.text.slice(0,6000)}));
    cache = {path,data:pages.length ? pages : null};
    return cache.data;
  } catch { cache = {path, data:null}; return null; }
}
export function retrieveDiagnosticReference(transcript, { indexPath = process.env.DSM_REFERENCE_INDEX, permission = process.env.DSM_REFERENCE_PERMISSION } = {}) {
  if (permission !== '1') return { status:'permission_required', sources:[], passages:[] };
  const index = loadIndex(indexPath);
  if (!index) return { status:'not_configured', sources:[], passages:[] };
  const patientText = (transcript || []).filter(l => l.speaker === 'Patient').map(l => l.text).join(' ');
  const terms = words(patientText);
  if (!terms.length) return {status:'no_evidence',sources:[],passages:[]};

  // Search smaller passages instead of scoring entire pages.
  // These are retrieval hints, not diagnostic conclusions.
  const clinicalThemes = [
    {
      patient: /\b(sad|depress\w*|hopeless|lost interest|loss of interest|anhedonia)\b/i,
      reference: /\b(depress\w*|anhedonia|major depressive)\b/i
    },
    {
      patient: /\b(anxious|anxiety|panic|worr\w*|nervous)\b/i,
      reference: /\b(anxiety|panic|worry)\b/i
    },
    {
      patient: /\b(manic|mania|hypoman\w*|racing thoughts|elevated mood)\b/i,
      reference: /\b(bipolar|manic|mania|hypoman\w*)\b/i
    }
  ];

  const activeThemes = clinicalThemes.filter(theme =>
    theme.patient.test(patientText)
  );

  const ranked = [];

  for (const page of index) {
    const text = page.text.replace(/\s+/g, ' ');

    for (let start = 0; start < text.length; start += 700) {
      const passage = text.slice(start, start + 1000);

      if (passage.length < 100) continue;

      if (
        activeThemes.length &&
        !activeThemes.some(theme => theme.reference.test(passage))
      ) {
        continue;
      }

      const overlap = terms.filter(term =>
        passage.toLowerCase().includes(term)
      ).length;

      const themeMatches = activeThemes.filter(theme =>
        theme.reference.test(passage)
      ).length;

      const score = overlap + themeMatches * 5;

      if (score >= (activeThemes.length ? 5 : 2)) {
        ranked.push({ page: page.page, text: passage, score });
      }

      if (start + 1000 >= text.length) break;
    }
  }

  ranked.sort((a, b) =>
    b.score - a.score || a.page - b.page
  );

  const passages = [];
  const usedPages = new Set();
  let size = 0;

  for (const entry of ranked) {
    if (usedPages.has(entry.page)) continue;
    if (passages.length >= 4) break;
    if (size + entry.text.length > MAX_REFERENCE_CHARS) continue;

    passages.push({
      page: entry.page,
      text: entry.text
    });

    usedPages.add(entry.page);
    size += entry.text.length;
  }
  return {status:passages.length?'retrieved':'no_match', sources:passages.map(p=>({edition:'DSM-5-TR (2022)',page:p.page})),passages};
}
