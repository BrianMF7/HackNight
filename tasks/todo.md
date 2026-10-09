# Tasks: Clinical intake platform (web + Zoom MVP)

Requirements: `tasks/plan.md` and the 10/9/2026 updated plan PDF. Adult intake is the only emailed PDF. Next.js is the UI. Base44 is not used. 45:00 is a minimum, not an expiration.

Test: `node --test` · Focused: `node --test test/<file>.test.js` · Clinical build: `node --check` on touched `.js` files · UI build: `npx next build`

Stack: Node ESM, `node:test`, Next.js for pages. Add when a task needs them: `pdf-lib`, `nodemailer`, `pg`, `next`, `react`, `react-dom`. Gemini and ElevenLabs via `fetch`. Synthetic fixtures only.

---

## Task 1: Master template, field ids, synthetic session

**Description:** Copy the blank 8-page adult intake into `templates/adult-intake.pdf`. Define question ids for presenting problem, duration, why now, the symptom and safety items that exist on that form, food/basics, and social stressors. Map each required id to a page and stamp region. Loader reads only `fixtures/synthetic/`.

**Acceptance criteria:**
- [ ] Required ids include presenting problem, duration, why now, and safety (ideation, attempt, die-vs-sleep intent, stated means, outcome)
- [ ] Every required id has a stamp target on `templates/adult-intake.pdf`
- [ ] Synthetic fixture includes `therapist@example.com`, a case id, and no real names or contacts
- [ ] `loadSynthetic` rejects paths outside `fixtures/synthetic/`

**Verification:**
- [ ] Tests pass: `node --test test/load.test.js`
- [ ] Build succeeds: `node --check src/intake/questions.js && node --check src/intake/load.js`
- [ ] Manual check: the template opens as the blank PSY adult intake

**Dependencies:** None

**Files likely touched:**
- `package.json`, `.gitignore`
- `templates/adult-intake.pdf`
- `src/intake/questions.js`, `src/intake/fields.js`, `src/intake/load.js`
- `fixtures/synthetic/intake-ramble.json`
- `test/load.test.js`

**Estimated scope:** Medium: 3–5 files plus the template PDF

---

## Task 2: Ground draft answers

**Description:** Accept a draft only when every filled answer quotes a span that exists in the transcript. Unknown field ids and invented quotes are rejected. Silence does not become a “no”.

**Acceptance criteria:**
- [ ] A draft whose quotes are substrings of the ramble fixture is accepted
- [ ] A quote that is not in the transcript throws
- [ ] No safety language in the transcript means no filled safety id

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

## Task 3: Safety-first nudge queue

**Description:** Required ids with no draft become nudges. Safety ids sort first. A complete required set returns an empty list.

**Acceptance criteria:**
- [ ] Every required id without a draft appears once
- [ ] Safety ids order before other domains
- [ ] A fully drafted required set returns an empty list

**Verification:**
- [ ] Tests pass: `node --test test/nudges.test.js`
- [ ] Build succeeds: `node --check src/intake/nudges.js`
- [ ] Manual check: the ramble nudge list leads with open safety ids

**Dependencies:** Task 2

**Files likely touched:**
- `src/intake/nudges.js`
- `test/nudges.test.js`

**Estimated scope:** Small: 1–2 files

---

## Checkpoint: After Tasks 1–3

- [ ] `node --test` passes
- [ ] Synthetic ramble yields grounded drafts and safety-first gaps
- [ ] Review with human before proceeding

---

## Task 4: 45:00 minimum clock

**Description:** Email is allowed only once the session has lasted 45:00. Times are arguments. `elapsed < 45:00` is `under`. `elapsed >= 45:00` is `met`. Do not treat 45:00 as an expiration that blocks send.

**Acceptance criteria:**
- [ ] 44:59 is `under` and 45:00 is `met`
- [ ] The module does not call `Date.now()`
- [ ] Callers can pass a fixed start and end and get the same status twice

**Verification:**
- [ ] Tests pass: `node --test test/clock.test.js`
- [ ] Build succeeds: `node --check src/session/clock.js`
- [ ] Manual check: boundaries at 44:59 and 45:00

**Dependencies:** Task 1

**Files likely touched:**
- `src/session/clock.js`
- `test/clock.test.js`

**Estimated scope:** Small: 1–2 files

---

## Task 5: Confirm required fields

**Description:** The clinician confirms drafts one field at a time. Safety cannot be waived. A packet exists only when every required id is confirmed. The packet has answers, quotes, a confirmation line, no diagnosis code, and `confirmed: true`. A later draft edit sets `confirmed` back to false.

**Acceptance criteria:**
- [ ] An open required field or a waived safety item returns no packet
- [ ] All required ids confirmed returns one packet and no diagnosis code
- [ ] Editing a draft after confirm clears `confirmed`

**Verification:**
- [ ] Tests pass: `node --test test/packet.test.js`
- [ ] Build succeeds: `node --check src/handoff/packet.js`

**Dependencies:** Tasks 2, 3

**Files likely touched:**
- `src/handoff/packet.js`
- `test/packet.test.js`

**Estimated scope:** Small: 1–2 files

---

## Task 6: Disconnect keep or discard

**Description:** Ending early or losing the patient asks Keep draft or Discard draft. Discard requires a second confirmation. Keep marks the draft incomplete and leaves it. Discard clears it. Both return zero emails and do not render the final PDF.

**Acceptance criteria:**
- [ ] Keep returns the draft with `incomplete: true` and no mailer call
- [ ] Discard without the second confirmation changes nothing
- [ ] Confirmed discard clears the draft and still does not email

**Verification:**
- [ ] Tests pass: `node --test test/disconnect.test.js`
- [ ] Build succeeds: `node --check src/session/disconnect.js`
- [ ] Manual check: both choices leave the mailer at zero messages

**Dependencies:** Task 5

**Files likely touched:**
- `src/session/disconnect.js`
- `test/disconnect.test.js`

**Estimated scope:** Small: 1–2 files

---

## Checkpoint: After Tasks 4–6

- [ ] `node --test` passes
- [ ] Under 45:00, keep and discard email nothing
- [ ] Open safety produces no packet
- [ ] Review with human before proceeding

---

## Task 7: Stamp the master PDF

**Description:** Given a confirmed packet, draw values onto a copy of `templates/adult-intake.pdf` with `pdf-lib`. Return one buffer that starts with `%PDF`. An unconfirmed packet throws and writes nothing. Do not build a new layout.

**Acceptance criteria:**
- [ ] Confirmed packet returns one buffer starting with `%PDF`, produced from the master template
- [ ] Unconfirmed packet throws
- [ ] The buffer’s extracted text includes the presenting-problem answer and the confirmation line

**Verification:**
- [ ] Tests pass: `node --test test/stamp.test.js`
- [ ] Build succeeds: `node --check src/handoff/stamp.js`
- [ ] Manual check: open the stamped PDF and see text on the presenting-problem blank

**Dependencies:** Tasks 1, 5

**Files likely touched:**
- `package.json`
- `src/handoff/stamp.js`
- `test/stamp.test.js`

**Estimated scope:** Medium: 3–5 files

---

## Task 8: Confirm and send

**Description:** Email the stamped PDF only when the clock is `met`, the packet is confirmed, and a therapist address is present. The same function returns the bytes for download. Under 45:00, an open field, or a missing address sends nothing and returns no final PDF. A second call with the same sent packet id does not email again. Tests use a fake mailer.

**Acceptance criteria:**
- [ ] `met` + confirmed packet emails `therapist@example.com` once with the one PDF
- [ ] `under`, unconfirmed, or missing address sends nothing and returns no PDF bytes
- [ ] The second send of that packet id records zero new messages
- [ ] The payload has no raw audio and no full transcript

**Verification:**
- [ ] Tests pass: `node --test test/send.test.js`
- [ ] Build succeeds: `node --check src/handoff/send.js`
- [ ] Manual check: with `SMTP_URL`, one synthetic PDF arrives at a mailbox you control

**Dependencies:** Tasks 4, 6, 7

**Files likely touched:**
- `package.json`
- `src/handoff/send.js`
- `.env.example`
- `test/send.test.js`

**Estimated scope:** Medium: 3–5 files

---

## Checkpoint: After Tasks 7–8

- [ ] `node --test` passes
- [ ] One on-time send emails one PDF; a repeat does not
- [ ] Under 45:00 sends nothing
- [ ] Review with human before proceeding

---

## Task 9: Public page and demo launch

**Description:** Add Next.js. The public page describes the demo and has **Launch platform**. That action opens a clinician session labeled synthetic, with the fixture therapist address. No account system and no Base44 client.

**Acceptance criteria:**
- [ ] `/` renders the product intro and Launch platform
- [ ] Launch opens `/session` with a visible “synthetic demo” label and `therapist@example.com`
- [ ] No Base44 dependency is added

**Verification:**
- [ ] Tests pass: `node --test test/launch.test.js` (the launch model, not the React tree)
- [ ] Build succeeds: `npx next build`
- [ ] Manual check: Launch lands on the labeled session route

**Dependencies:** Task 1

**Files likely touched:**
- `package.json`
- `app/page.tsx`, `app/session/page.tsx`
- `src/workspace/launch.js`
- `test/launch.test.js`

**Estimated scope:** Medium: 3–5 files

---

## Task 10: Split workspace playback

**Description:** The session page shows a labeled synthetic video/chat pane and the adult-intake fields. Playing the fixture appends lines and shows grounded drafts through Task 2. The page does not redraw the PDF template.

**Acceptance criteria:**
- [ ] Playback of the ramble fixture yields the same grounded drafts as Task 2
- [ ] An invented line in the playback fixture fills nothing
- [ ] The video pane text says the patient is synthetic

**Verification:**
- [ ] Tests pass: `node --test test/playback.test.js`
- [ ] Build succeeds: `npx next build`
- [ ] Manual check: play the fixture and see a quote appear next to a field

**Dependencies:** Tasks 2, 9

**Files likely touched:**
- `src/workspace/playback.js`
- `app/session/page.tsx`
- `test/playback.test.js`

**Estimated scope:** Medium: 3–5 files

---

## Task 11: Review, confirm, disconnect, send

**Description:** The session page lists nudges, confirms fields through Task 5, and offers Keep and Discard through Task 6. Confirm and send calls Task 8 and shows download plus the mailer result. The button stays disabled while the clock is `under` or safety is open.

**Acceptance criteria:**
- [ ] Discard and Keep both show no email result
- [ ] Confirm and send before 45:00 shows the blocked reason and no download
- [ ] At or after 45:00, with every required field confirmed, the page reports one email and a PDF download

**Verification:**
- [ ] Tests pass: `node --test test/review-flow.test.js`
- [ ] Build succeeds: `npx next build`
- [ ] Manual check: in the browser, discard, then a blocked send, then one successful send at 45:00

**Dependencies:** Tasks 3, 4, 6, 8, 10

**Files likely touched:**
- `src/workspace/review-flow.js`
- `app/session/page.tsx`
- `test/review-flow.test.js`

**Estimated scope:** Medium: 3–5 files

---

## Checkpoint: After Tasks 9–11

- [ ] `node --test` passes and `npx next build` succeeds
- [ ] Playback, disconnect, and the send gate work on synthetic data
- [ ] Review with human before proceeding

---

## Task 12: Gemini drafts

**Description:** Ask Gemini for a Task 2 draft from transcript lines and the question list, then `ground` it. Tests use a recorded response. The request must not ask for a diagnosis code. Refuse a fixture marked `synthetic: false` unless `ALLOW_PHI=1`.

**Acceptance criteria:**
- [ ] A recorded response with real quotes becomes a grounded draft
- [ ] An invented quote is rejected and nothing is filled
- [ ] The request body has no instruction to put a diagnosis code on the form

**Verification:**
- [ ] Tests pass: `node --test test/gemini.test.js`
- [ ] Build succeeds: `node --check src/draft/gemini.js`
- [ ] Manual check: with `GEMINI_API_KEY`, one synthetic ramble only

**Dependencies:** Task 2

**Files likely touched:**
- `src/draft/gemini.js`
- `fixtures/synthetic/gemini-ramble-response.json`
- `.env.example`
- `test/gemini.test.js`

**Estimated scope:** Medium: 3–5 files

---

## Task 13: Zoom transcript file

**Description:** Convert a saved Zoom recording-resource JSON file into the same line shape as playback. No network call. Empty timeline means no lines. This is not a Zoom app.

**Acceptance criteria:**
- [ ] A fixture timeline becomes ordered `{ speaker, text, startMs }` lines
- [ ] An empty timeline becomes an empty line list
- [ ] Those lines pass through Task 2 `ground`

**Verification:**
- [ ] Tests pass: `node --test test/zoom-normalize.test.js`
- [ ] Build succeeds: `node --check src/zoom/normalize.js`

**Dependencies:** Task 2

**Files likely touched:**
- `src/zoom/normalize.js`
- `fixtures/synthetic/zoom-resource.json`
- `test/zoom-normalize.test.js`

**Estimated scope:** Medium: 3–5 files

---

## Task 14: ElevenLabs next-question audio

**Description:** When a nudge exists, request speech for that question’s prompt text only. Do not send the transcript. Tests use a recorded audio response or a stub body and do not require a live key. This is not speech-to-text.

**Acceptance criteria:**
- [ ] The request body is the next nudge prompt and not the transcript
- [ ] No nudge means no request
- [ ] The call URL is a text-to-speech endpoint, not a transcribe endpoint

**Verification:**
- [ ] Tests pass: `node --test test/speak.test.js`
- [ ] Build succeeds: `node --check src/speech/speak.js`
- [ ] Manual check: with `ELEVENLABS_API_KEY`, one synthetic prompt is spoken and no client audio is uploaded

**Dependencies:** Task 3

**Files likely touched:**
- `src/speech/speak.js`
- `.env.example`
- `test/speak.test.js`

**Estimated scope:** Medium: 3–5 files

---

## Task 15: Simulated focus-drop

**Description:** A “focus dropped” action selects the same next nudge as Task 3 and Task 14. It stores no image, frame, or camera id. There is no Presage SDK.

**Acceptance criteria:**
- [ ] The action returns the current first safety nudge when one is open
- [ ] The returned object has no image, frame, or camera field
- [ ] An empty nudge list returns no highlight

**Verification:**
- [ ] Tests pass: `node --test test/focus.test.js`
- [ ] Build succeeds: `node --check src/session/focus.js`

**Dependencies:** Task 3

**Files likely touched:**
- `src/session/focus.js`
- `test/focus.test.js`

**Estimated scope:** Small: 1–2 files

---

## Task 16: Tiger stores the sent packet

**Description:** After a successful send, insert one session row (case id, therapist, PDF bytes, `sent_at`) and nudge rows. No raw audio and no full transcript. A refused send writes nothing. Missing `DATABASE_URL` skips the insert.

**Acceptance criteria:**
- [ ] A successful send writes one row whose PDF bytes match the mailed file, plus nudge rows
- [ ] A refused send writes nothing
- [ ] Bound parameters do not include raw audio or the full transcript

**Verification:**
- [ ] Tests pass: `node --test test/store.test.js`
- [ ] Build succeeds: `node --check src/store/sessions.js`
- [ ] Manual check: with Tiger `DATABASE_URL`, one synthetic send is visible

**Dependencies:** Tasks 3, 8

**Files likely touched:**
- `package.json`
- `src/store/sessions.js`
- `src/handoff/send.js`
- `.env.example`
- `test/store.test.js`

**Estimated scope:** Medium: 3–5 files

---

## Checkpoint: Demo

- [ ] `node --test` passes
- [ ] Synthetic path: playback, keep/discard, one PDF email at or after 45:00, no duplicate email
- [ ] Tiger row when `DATABASE_URL` is set
- [ ] Human approves before live audio, camera, or a real inbox
