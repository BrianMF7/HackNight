# Tasks: Intake assistant (Zoom MVP)

Requirements: idea note + fill existing PDFs + live ElevenLabs STT + no Presage + PDF review before send + 45:00 minimum with throw-out popup. Plan: `tasks/plan.md`.

Test: `node --test` · Focused: `node --test test/<file>.test.js` · Build: `node --check` on touched sources.

Stack: Node ESM, `node:test`. Add when needed: `pdf-lib`, `nodemailer`, `pg`. Gemini and ElevenLabs via `fetch`. Synthetic fixtures only.

---

## Task 1: Templates, field map, synthetic session

**Description:** Copy blank adult intake and PHQ-9 into `templates/`. Define question ids that match those forms (presenting problem, duration, why now, PHQ-9 items 1–9, safety, food/basics, social stressors). Map each id to a stamp target (page + x/y or region) on the flat PDFs. Loader reads only `fixtures/synthetic/`.

**Acceptance criteria:**
- [ ] Field ids cover adult-intake presenting problem / duration / why now, PHQ-9 items 1–9 + difficulty, and safety (ideation, attempt, die-vs-sleep intent, stated means, outcome)
- [ ] Every required id has a stamp target on `templates/` adult intake or PHQ-9
- [ ] Synthetic ramble fixture includes `therapist@example.com`, a case id, and no real names or contacts
- [ ] `loadSynthetic` rejects paths outside `fixtures/synthetic/`

**Verification:**
- [ ] Tests pass: `node --test test/load.test.js`
- [ ] Build succeeds: `node --check src/intake/questions.js && node --check src/intake/load.js`
- [ ] Manual check: templates open as the blank PSY adult intake and PHQ-9

**Dependencies:** None

**Files likely touched:**
- `package.json`, `.gitignore`
- `templates/adult-intake.pdf`, `templates/phq9.pdf`
- `src/intake/questions.js`, `src/intake/fields.js`, `src/intake/load.js`
- `fixtures/synthetic/intake-ramble.json`
- `test/load.test.js`

**Estimated scope:** Medium: 3–5 files (+ binary templates)

---

## Task 2: Ground draft answers

**Description:** Accept a draft only when every filled answer quotes a span that exists in the transcript. Unknown field ids and invented quotes are rejected. This is the check Gemini and STT-driven drafts must pass.

**Acceptance criteria:**
- [ ] Draft JSON whose quotes are substrings of the ramble fixture is accepted
- [ ] A quote not in the transcript throws
- [ ] No safety language in the transcript ⇒ no filled safety id

**Verification:**
- [ ] Tests pass: `node --test test/ground.test.js`
- [ ] Build succeeds: `node --check src/intake/ground.js`
- [ ] Manual check: accepted quotes are substrings of the fixture

**Dependencies:** Task 1

**Files likely touched:**
- `src/intake/ground.js`
- `fixtures/synthetic/ramble-draft.json`
- `test/ground.test.js`

**Estimated scope:** Medium: 3–5 files

---

## Task 3: Unanswered nudge list

**Description:** Required ids with no draft become nudges. Safety and PHQ-9 item 9 sort first.

**Acceptance criteria:**
- [ ] Every required id without a draft appears once
- [ ] Safety / PHQ-9-9 ids order before other domains
- [ ] Fully drafted required set ⇒ empty list

**Verification:**
- [ ] Tests pass: `node --test test/nudges.test.js`
- [ ] Build succeeds: `node --check src/intake/nudges.js`
- [ ] Manual check: ramble nudge list leads with open safety ids

**Dependencies:** Task 2

**Files likely touched:**
- `src/intake/nudges.js`, `test/nudges.test.js`

**Estimated scope:** Small: 1–2 files

---

## Checkpoint: After Tasks 1–3

- [ ] `node --test` passes
- [ ] Grounded drafts + safety-first gaps against real form field ids
- [ ] Review with human before proceeding

---

## Task 4: 45:00 minimum and throw-out choice

**Description:** The session must last at least 45:00 before email. Under that, finishing asks her to throw out the PDF or keep it. Throw out discards preview bytes and clears review. Keep retains the preview and still does not email. At or after 45:00 the status is `met`. Times are arguments.

**Acceptance criteria:**
- [ ] Elapsed under 45:00 is `under`; at or after 45:00 is `met`; a five-minute warning is true only in `[40:00, 45:00)`
- [ ] `under` + throw out ⇒ preview discarded, review cleared, no email; `under` + keep ⇒ preview kept, no email
- [ ] The clock does not call `Date.now()`

**Verification:**
- [ ] Tests pass: `node --test test/clock.test.js`
- [ ] Build succeeds: `node --check src/session/clock.js && node --check src/session/early-end.js`
- [ ] Manual check: boundaries at 44:59 and 45:00, and both popup choices

**Dependencies:** Task 1

**Files likely touched:**
- `src/session/clock.js`
- `src/session/early-end.js`
- `test/clock.test.js`

**Estimated scope:** Medium: 3–5 files

---

## Task 5: Clinician field confirm

**Description:** Mark drafts confirmed. Safety cannot be waived. Returns a packet object when every required id is confirmed. Does not check the 45:00 clock and does not email. A later draft edit clears `pdfReviewed`.

**Acceptance criteria:**
- [ ] Unconfirmed required or waived safety ⇒ no packet
- [ ] All required ids confirmed ⇒ packet with answers, quotes, confirmation line, no diagnosis code, `pdfReviewed: false`
- [ ] Editing a draft after `pdfReviewed: true` sets `pdfReviewed` back to false

**Verification:**
- [ ] Tests pass: `node --test test/packet.test.js`
- [ ] Build succeeds: `node --check src/handoff/packet.js`

**Dependencies:** Tasks 2, 3, 4

**Files likely touched:**
- `src/handoff/packet.js`, `test/packet.test.js`

**Estimated scope:** Small: 1–2 files

---

## Task 6: Stamp preview PDFs

**Description:** Given a field-confirmed packet and the blank templates, produce preview PDF bytes for the adult intake and the PHQ-9 by drawing values at the Task 1 field map. Preview does not email. No stamp path for an unconfirmed packet. Do not build a new form layout from scratch.

**Acceptance criteria:**
- [ ] Confirmed packet ⇒ two PDF buffers that start with `%PDF`, derived from the blank templates
- [ ] Unconfirmed packet throws; no bytes
- [ ] Stamped adult intake includes presenting-problem text; stamped PHQ-9 includes at least one item mark and the confirmation line

**Verification:**
- [ ] Tests pass: `node --test test/stamp.test.js`
- [ ] Build succeeds: `node --check src/handoff/stamp.js`
- [ ] Manual check: open both stamped PDFs and verify text lands on the right blanks

**Dependencies:** Tasks 1, 5

**Files likely touched:**
- `package.json`, `src/handoff/stamp.js`, `test/stamp.test.js`

**Estimated scope:** Medium: 3–5 files

---

## Task 7: Review gate and send

**Description:** Email the preview PDFs only when status is `met`, `pdfReviewed` is true, required fields are confirmed, and a therapist address is present. Under 45:00 the function returns `askThrowOut` and does not mail. Missing review, open fields, or a missing address also send nothing. Tests use a fake mailer.

**Acceptance criteria:**
- [ ] `met` + `pdfReviewed` ⇒ mailer once with `therapist@example.com` and both preview PDFs
- [ ] `under`, `pdfReviewed: false`, open required, or missing address ⇒ zero messages
- [ ] Payload has no raw audio and no raw full transcript dump

**Verification:**
- [ ] Tests pass: `node --test test/send.test.js`
- [ ] Build succeeds: `node --check src/handoff/send.js`
- [ ] Manual check: with `SMTP_URL`, synthetic PDFs arrive at a mailbox you control

**Dependencies:** Tasks 4, 6

**Files likely touched:**
- `package.json`, `src/handoff/send.js`, `.env.example`, `test/send.test.js`

**Estimated scope:** Medium: 3–5 files

---

## Task 8: Review page with PDF preview and throw-out popup

**Description:** Local page: timer, safety-first nudges, draft quotes, and the stamped PDFs for her to read. **Send** stays disabled until she marks “this information is right” and the clock is `met`. Under 45:00, Finish opens a popup: throw out the PDF or keep it. Throw out clears the preview. Keep leaves it on screen and does not email.

**Acceptance criteria:**
- [ ] She can open both preview PDFs before any email
- [ ] Under 45:00, Throw out removes the preview and emails nothing; Keep leaves the preview and emails nothing
- [ ] At or after 45:00, Send downloads and shows `therapist@example.com` only after she marks the PDFs reviewed

**Verification:**
- [ ] Tests pass: `node --test test/page.test.js`
- [ ] Build succeeds: `node --check src/server.js`
- [ ] Manual check: in the browser, throw out at 30:00, keep at 30:00, then review and send at 45:00

**Dependencies:** Tasks 3, 4, 7

**Files likely touched:**
- `src/server.js`, `public/index.html`, `public/app.js`, `test/page.test.js`

**Estimated scope:** Medium: 3–5 files

---

## Checkpoint: After Tasks 4–8

- [ ] `node --test` passes
- [ ] Under 45:00 throw-out and keep both email nothing; send works only after 45:00 and PDF review
- [ ] Review with human before proceeding

---

## Task 9: ElevenLabs live speech-to-text

**Description:** Turn session audio into `{ speaker, text, startMs }` lines via ElevenLabs STT (Scribe). Not TTS — no speaking questions aloud. Unit tests feed a recorded STT response (or a small synthetic audio fixture) and never require a live key. A non-synthetic session is refused unless `ALLOW_PHI=1`.

**Acceptance criteria:**
- [ ] Recorded STT payload becomes ordered transcript lines
- [ ] Request path is STT (no TTS endpoint, no question-prompt-as-speech body)
- [ ] Lines are appendable into the same structure Task 2 grounds

**Verification:**
- [ ] Tests pass: `node --test test/stt.test.js`
- [ ] Build succeeds: `node --check src/speech/stt.js`
- [ ] Manual check: with `ELEVENLABS_API_KEY`, a short synthetic clip produces lines; no question is spoken back

**Dependencies:** Task 1

**Files likely touched:**
- `src/speech/stt.js`, `fixtures/synthetic/stt-response.json`
- `public/app.js`, `.env.example`, `test/stt.test.js`

**Estimated scope:** Medium: 3–5 files

---

## Task 10: Gemini drafts

**Description:** Ask Gemini for a draft in the Task 2 shape from transcript lines + field list, then `ground`. Tests use a recorded response. Refuse `synthetic: false` unless `ALLOW_PHI=1`. Optional: disorder **names** from APA contents only for draft screen suggestions — no criterion prose, no codes on the PDF.

**Acceptance criteria:**
- [ ] Recorded response with real quotes ⇒ grounded draft
- [ ] Invented quote ⇒ rejected, nothing filled
- [ ] Request has no instruction to emit a diagnosis code onto the form

**Verification:**
- [ ] Tests pass: `node --test test/gemini.test.js`
- [ ] Build succeeds: `node --check src/draft/gemini.js`
- [ ] Manual check: with `GEMINI_API_KEY`, one synthetic ramble only

**Dependencies:** Tasks 2, 9

**Files likely touched:**
- `src/draft/gemini.js`, `fixtures/synthetic/gemini-ramble-response.json`
- `.env.example`, `test/gemini.test.js`

**Estimated scope:** Medium: 3–5 files

---

## Task 11: Zoom transcript normalizer

**Description:** Optional backup. Convert a saved Zoom `get_recording_resource` JSON into the same line shape as Task 9. No network call. Not a substitute for live STT.

**Acceptance criteria:**
- [ ] Timeline → ordered lines; empty timeline → empty lines + all-required nudges
- [ ] Lines ground with the same Task 2 path as STT

**Verification:**
- [ ] Tests pass: `node --test test/zoom-normalize.test.js`
- [ ] Build succeeds: `node --check src/zoom/normalize.js`

**Dependencies:** Task 2

**Files likely touched:**
- `src/zoom/normalize.js`, `fixtures/synthetic/zoom-resource.json`, `test/zoom-normalize.test.js`

**Estimated scope:** Medium: 3–5 files

---

## Checkpoint: After Tasks 9–11

- [ ] `node --test` passes
- [ ] STT → Gemini → ground works; Zoom uses the same lines
- [ ] Review with human before proceeding

---

## Task 12: Tiger Data stores the sent packet

**Description:** After successful send, insert session row (case id, therapist, PDF bytes, `sent_at`) and nudge rows. No raw audio, no full transcript blob. Missing `DATABASE_URL` skips insert; download/email already succeeded.

**Acceptance criteria:**
- [ ] Successful send ⇒ one session row whose PDF bytes match mailed files + nudge rows
- [ ] Refused send ⇒ nothing recorded
- [ ] Parameters exclude raw audio and full transcript

**Verification:**
- [ ] Tests pass: `node --test test/store.test.js`
- [ ] Build succeeds: `node --check src/store/sessions.js`
- [ ] Manual check: with Tiger `DATABASE_URL`, one synthetic send visible

**Dependencies:** Tasks 3, 7

**Files likely touched:**
- `package.json`, `src/store/sessions.js`, `src/handoff/send.js`
- `.env.example`, `test/store.test.js`

**Estimated scope:** Medium: 3–5 files

---

## Checkpoint: Demo

- [ ] `node --test` passes
- [ ] Synthetic session: preview, throw-out popup under 45:00, email only after PDF review at or after 45:00; Tiger row when configured
- [ ] GoDaddy Registry domain when public URL exists
- [ ] Human approves before live client audio or real inbox
