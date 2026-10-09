# Tasks: Backend for the clinical intake workspace

Requirements: `tasks/plan.md`. Vite UI stays. Node server under `server/` owns clinical rules. Send only after 45:00 **and** an explicit clinician choice (handoff / keep / discard). Base44 is auth/marketing only.

Test: `node --test` · Focused: `node --test server/test/<file>.test.js` · Check: `node --check` on touched `.js` files · UI build: `npm run build`

Stack: Node ESM, `node:test`, `node:http`. Add when a task needs them: `pdf-lib`, `nodemailer`, `pg`. Gemini and ElevenLabs via `fetch`. Synthetic fixtures only.

---

## Task 1: Ping, CORS, bearer

**Description:** `server/index.js` answers `GET /api/ping`. Missing or wrong bearer is 401. CORS allows the Vite origin. Set `endpoints.ping` in `src/api/endpoints.js`.

**Acceptance criteria:**
- [ ] Connection settings “Save and test” can succeed against the local server
- [ ] A bad token returns 401 and the UI shows that error
- [ ] `endpoints.ping` is `{ method: "GET", path: "/api/ping" }`

**Verification:**
- [ ] Tests pass: `node --test server/test/ping.test.js`
- [ ] Build succeeds: `node --check server/index.js`
- [ ] Manual check: connection dialog against `http://localhost:8787`

**Dependencies:** None

**Files likely touched:**
- `package.json`
- `server/index.js`
- `src/api/endpoints.js`
- `.env.example`
- `server/test/ping.test.js`

**Estimated scope:** Medium: 3–5 files

---

## Task 2: Canonical adult-intake template

**Description:** `GET /api/templates` and `GET /api/templates/:templateId` return `adult-intake-v1` with the same question ids, `required`, and `safety` flags as `src/api/templates/adultIntake.js`. Brief intake and PHQ-9 stay `available: false`.

**Acceptance criteria:**
- [ ] A contract test fails if a required or safety id drifts from the frontend file
- [ ] Unknown template id is 404
- [ ] Brief intake and PHQ-9 list as unavailable

**Verification:**
- [ ] Tests pass: `node --test server/test/template.test.js`
- [ ] Build succeeds: `node --check server/template.js`

**Dependencies:** Task 1

**Files likely touched:**
- `server/template.js`
- `src/api/liveWorkspace.js`
- `server/test/template.test.js`

**Estimated scope:** Medium: 3–5 files

---

## Task 3: Synthetic session, transcript, grounded events

**Description:** `POST /api/sessions` plus transcript and events from `src/api/fixtures/syntheticSession.js`. `ground` accepts a draft only when every quote is a substring of the transcript. Unknown field ids and invented quotes throw. Silence does not become “no”. Wire createSession, getTranscript, and getEvents in the live adapter.

**Acceptance criteria:**
- [ ] The fixture events pass `ground`
- [ ] An invented quote fills nothing
- [ ] `load` rejects paths outside the synthetic fixture dir

**Verification:**
- [ ] Tests pass: `node --test server/test/session.test.js server/test/ground.test.js`
- [ ] Build succeeds: `node --check server/session.js && node --check server/ground.js`
- [ ] Manual check: live mode creates a session and events match the fixture

**Dependencies:** Task 2

**Files likely touched:**
- `server/session.js`, `server/ground.js`, `server/fixtures/`
- `src/api/liveWorkspace.js`
- `server/test/session.test.js`, `server/test/ground.test.js`

**Estimated scope:** Medium: 3–5 files

---

## Checkpoint: After Tasks 1–3

- [ ] `node --test` passes
- [ ] Live mode can ping, load the template, and create a session whose events match the fixture
- [ ] Review with human before proceeding

---

## Task 4: 45:00 minimum clock

**Description:** Email is allowed only once the session has lasted 45:00. Times are arguments. `elapsed < 45:00` is `under`. `elapsed >= 45:00` is `met`. Do not treat 45:00 as an expiration. No `SEND_GATE_EXPIRED`.

**Acceptance criteria:**
- [ ] 44:59 is `under` and 45:00 is `met`
- [ ] The module does not call `Date.now()`
- [ ] Callers can pass a fixed start and end and get the same status twice

**Verification:**
- [ ] Tests pass: `node --test server/test/clock.test.js`
- [ ] Build succeeds: `node --check server/clock.js`
- [ ] Manual check: boundaries at 44:59 and 45:00

**Dependencies:** Task 1

**Files likely touched:**
- `server/clock.js`
- `server/test/clock.test.js`

**Estimated scope:** Small: 1–2 files

---

## Task 5: Confirm and edit

**Description:** `recordClinicianAction` stores `confirm` and `edit_confirm` as confirmed, and `edit` as draft so confirmation clears. `waive` on a safety id is rejected. Server state, not the request’s id list, is what later send will read.

**Acceptance criteria:**
- [ ] An edit after confirm clears confirmed
- [ ] A safety waive does not count as confirmed
- [ ] Actions persist on the in-memory session

**Verification:**
- [ ] Tests pass: `node --test server/test/actions.test.js`
- [ ] Build succeeds: `node --check server/actions.js`

**Dependencies:** Task 3

**Files likely touched:**
- `server/actions.js`
- `src/api/liveWorkspace.js`
- `server/test/actions.test.js`

**Estimated scope:** Small: 1–2 files

---

## Task 6: Keep or discard

**Description:** Retain sets `draft_retained` and `sent: false`. Discard deletes the session. Neither renders a PDF or calls the mailer. Discard is the single call the UI makes after its own second confirmation.

**Acceptance criteria:**
- [ ] Keep returns `{ ok: true, status: "draft_retained", sent: false }` and no mailer call
- [ ] Discard clears the session and still does not email
- [ ] Both leave the mailer at zero messages when elapsed is already `met`

**Verification:**
- [ ] Tests pass: `node --test server/test/disconnect.test.js`
- [ ] Build succeeds: `node --check server/disconnect.js`
- [ ] Manual check: keep and discard both leave sent false

**Dependencies:** Task 5

**Files likely touched:**
- `server/disconnect.js`
- `src/api/liveWorkspace.js`
- `server/test/disconnect.test.js`

**Estimated scope:** Small: 1–2 files

---

## Checkpoint: After Tasks 4–6

- [ ] `node --test` passes
- [ ] Under 45:00, keep and discard email nothing
- [ ] A waived safety item is not confirmed
- [ ] Review with human before proceeding

---

## Task 7: Handoff refusal

**Description:** `POST .../handoff` returns HTTP 200 `{ allowed: false, reasons }` when the server clock is `under`, any required id is unconfirmed, any safety id is unresolved, or the stored therapist email is missing. No PDF bytes and no mailer call. Client `elapsedSeconds` is ignored.

**Acceptance criteria:**
- [ ] Each of the four cases produces its reason code (`SEND_GATE_NOT_MET`, `REQUIRED_UNCONFIRMED`, `SAFETY_UNRESOLVED`, `NO_RECIPIENT`)
- [ ] Refused handoff records zero emails
- [ ] Client-supplied elapsed and confirmedIds do not bypass the gate

**Verification:**
- [ ] Tests pass: `node --test server/test/handoff-gate.test.js`
- [ ] Build succeeds: `node --check server/handoff.js`

**Dependencies:** Tasks 4, 5, 6

**Files likely touched:**
- `server/handoff.js`
- `src/api/liveWorkspace.js`
- `server/test/handoff-gate.test.js`

**Estimated scope:** Medium: 3–5 files

---

## Task 8: One PDF, one email, and the mock gate

**Description:** When the clock is `met`, every required id is confirmed on the server, and the therapist email is present, build one PDF with `pdf-lib` (confirmed answers, quotes, a confirmation line, no diagnosis code) and email that buffer once via a fake mailer in tests. A second handoff of the same session sends nothing new. Update the one check in `src/api/mockWorkspace.js` from `SEND_GATE_EXPIRED` to `SEND_GATE_NOT_MET` when elapsed is under 45:00. Nodemailer runs only when `SMTP_URL` is set.

**Acceptance criteria:**
- [ ] One allowed send emails `therapist@example.com` once
- [ ] A repeat adds zero messages
- [ ] Under 45:00 still sends nothing
- [ ] The mock returns `SEND_GATE_NOT_MET` below 45:00 and does not return `SEND_GATE_EXPIRED`

**Verification:**
- [ ] Tests pass: `node --test server/test/send.test.js`
- [ ] Build succeeds: `npm run build`
- [ ] Manual check: open the stamped PDF and see the presenting-problem answer

**Dependencies:** Task 7

**Files likely touched:**
- `package.json`
- `server/pdf.js`, `server/send.js`, `server/handoff.js`
- `src/api/mockWorkspace.js`
- `.env.example`
- `server/test/send.test.js`

**Estimated scope:** Medium: 3–5 files

---

## Checkpoint: After Tasks 7–8

- [ ] `node --test` passes and `npm run build` succeeds
- [ ] Live handoff shows refusal reasons, then one send at or after 45:00
- [ ] Review with human before sponsor integrations

---

## Task 9: Gemini drafts

**Description:** Ask Gemini for draft events from transcript lines and the question list, then `ground` them. Tests use a recorded response. The request must not ask for a diagnosis code. Refuse a body marked `synthetic: false` unless `ALLOW_PHI=1`.

**Acceptance criteria:**
- [ ] A recorded response with real quotes becomes grounded drafts
- [ ] An invented quote is rejected and nothing is filled
- [ ] The request body has no instruction to put a diagnosis code on the form

**Verification:**
- [ ] Tests pass: `node --test server/test/gemini.test.js`
- [ ] Build succeeds: `node --check server/gemini.js`
- [ ] Manual check: with `GEMINI_API_KEY`, one synthetic ramble only

**Dependencies:** Task 3

**Files likely touched:**
- `server/gemini.js`
- `server/fixtures/gemini-ramble-response.json`
- `.env.example`
- `server/test/gemini.test.js`

**Estimated scope:** Medium: 3–5 files

---

## Task 10: Zoom transcript file

**Description:** Convert a saved Zoom timeline JSON into the same `{ speaker, text, startMs }` lines. No network call and no Zoom app package.

**Acceptance criteria:**
- [ ] A fixture timeline becomes ordered lines that pass `ground`
- [ ] An empty timeline becomes no lines
- [ ] Those lines pass through Task 3 `ground`

**Verification:**
- [ ] Tests pass: `node --test server/test/zoom.test.js`
- [ ] Build succeeds: `node --check server/zoom.js`

**Dependencies:** Task 3

**Files likely touched:**
- `server/zoom.js`
- `server/fixtures/zoom-resource.json`
- `server/test/zoom.test.js`

**Estimated scope:** Medium: 3–5 files

---

## Task 11: ElevenLabs prompt audio

**Description:** `play` requests speech for that question’s `followUp` text only. No transcript in the body. No nudge means no request. Tests stub the HTTP call.

**Acceptance criteria:**
- [ ] The request body is the prompt string and not the transcript
- [ ] No nudge means no request
- [ ] The call URL is a text-to-speech endpoint, not a transcribe endpoint

**Verification:**
- [ ] Tests pass: `node --test server/test/speak.test.js`
- [ ] Build succeeds: `node --check server/speak.js`
- [ ] Manual check: with `ELEVENLABS_API_KEY`, one synthetic prompt is spoken

**Dependencies:** Task 2

**Files likely touched:**
- `server/speak.js`
- `src/api/liveWorkspace.js`
- `.env.example`
- `server/test/speak.test.js`

**Estimated scope:** Medium: 3–5 files

---

## Task 12: Tiger stores the sent packet

**Description:** After Task 8 succeeds, insert one session row (case id, therapist, PDF bytes, `sent_at`) and nudge rows. No raw audio and no full transcript. A refused handoff writes nothing. Missing `DATABASE_URL` skips the insert.

**Acceptance criteria:**
- [ ] A successful send writes one row whose PDF bytes match the mailed file, plus nudge rows
- [ ] A refused send writes nothing
- [ ] Bound parameters do not include raw audio or the full transcript

**Verification:**
- [ ] Tests pass: `node --test server/test/store.test.js`
- [ ] Build succeeds: `node --check server/store.js`
- [ ] Manual check: with Tiger `DATABASE_URL`, one synthetic send is visible

**Dependencies:** Tasks 7, 8

**Files likely touched:**
- `package.json`
- `server/store.js`, `server/handoff.js`
- `.env.example`
- `server/test/store.test.js`

**Estimated scope:** Medium: 3–5 files

---

## Checkpoint: Demo

- [ ] `node --test` passes
- [ ] Synthetic path: playback events, keep and discard send nothing, send is refused before 45:00, one PDF email at or after 45:00, no second email
- [ ] Tiger row when `DATABASE_URL` is set
- [ ] Human approves before live audio, camera, or a real inbox
