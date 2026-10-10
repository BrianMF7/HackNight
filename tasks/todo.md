# Tasks: Backend for the clinical intake workspace

Requirements: `tasks/plan.md`. Vite UI stays. Node server under `server/` owns clinical rules. Send only after 45:00 **and** an explicit clinician choice (handoff / keep / discard). Base44 is auth/marketing only.

Test: `node --test` · Focused: `node --test server/test/<file>.test.js` · Check: `node --check` on touched `.js` files · UI build: `npm run build`

Stack: Node ESM, `node:test`, `node:http`. Add when a task needs them: `pdf-lib`, `nodemailer`, `pg`. Gemini and ElevenLabs Scribe (STT) via `fetch`. Synthetic fixtures for tests; live mic only after human approval.

**Current slice:** Tasks 9c-1 through 9c-6. Task 11 is done. Task 10 is not a step. Tasks 4, 6, 7, 8, and 12 stay open and are not this slice. The final transcript pass is 9c-5 and 9c-6. It does not run on each commit.

---

## Task 1: Ping, CORS, bearer

**Description:** `server/index.js` answers `GET /api/ping`. Missing or wrong bearer is 401. CORS allows the Vite origin. Set `endpoints.ping` in `src/api/endpoints.js`.

**Acceptance criteria:**
- [x] Connection settings “Save and test” can succeed against the local server
- [x] A bad token returns 401 and the UI shows that error
- [x] `endpoints.ping` is `{ method: "GET", path: "/api/ping" }`

**Verification:**
- [x] Tests pass: `node --test server/test/ping.test.js`
- [x] Build succeeds: `node --check server/index.js`
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
- [x] A contract test fails if a required or safety id drifts from the frontend file
- [x] Unknown template id is 404
- [x] Brief intake and PHQ-9 list as unavailable

**Verification:**
- [x] Tests pass: `node --test server/test/template.test.js`
- [x] Build succeeds: `node --check server/template.js`

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
- [x] The fixture events pass `ground`
- [x] An invented quote fills nothing
- [x] `load` rejects paths outside the synthetic fixture dir

**Verification:**
- [x] Tests pass: `node --test server/test/session.test.js server/test/ground.test.js`
- [x] Build succeeds: `node --check server/session.js && node --check server/ground.js`
- [x] Manual check: live mode creates a session and events match the fixture

**Dependencies:** Task 2

**Files likely touched:**
- `server/session.js`, `server/ground.js`, `server/fixtures/`
- `src/api/liveWorkspace.js`
- `server/test/session.test.js`, `server/test/ground.test.js`

**Estimated scope:** Medium: 3–5 files

---

## Checkpoint: After Tasks 1–3

- [x] `node --test` passes
- [x] Live mode can ping, load the template, and create a session whose events match the fixture
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
- [x] An edit after confirm clears confirmed
- [x] A safety waive does not count as confirmed
- [x] Actions persist on the in-memory session

**Verification:**
- [x] Tests pass: `node --test server/test/actions.test.js`
- [x] Build succeeds: `node --check server/actions.js`

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

## Phase 4a: Gemini without Task 11

Transcript source for 9a–9b is only Task 3’s synthetic session lines. No Scribe, no mic, no Task 10.

---

## Task 9a: Gemini module + fixture + ground

**Description:** Pure server module: given transcript lines, the adult-intake question list, and a Gemini JSON body (injected or fetched), produce draft events and run them through `applyDrafts` / `ground`. Tests never hit the network; they load `server/fixtures/gemini-ramble-response.json`. Build the request text so it never instructs a diagnosis code. If the call options mark `synthetic: false` and `ALLOW_PHI` is unset, refuse before any fetch.

**Acceptance criteria:**
- [x] Recorded response whose quotes appear in the synthetic transcript becomes grounded drafts
- [x] An invented quote in the recorded response fills nothing (dropped by `ground`)
- [x] The built request / prompt string has no instruction to put a diagnosis code on the form
- [x] `synthetic: false` without `ALLOW_PHI=1` throws or returns a refusal; no Gemini call

**Verification:**
- [x] Tests pass: `node --test server/test/gemini.test.js`
- [x] Build succeeds: `node --check server/gemini.js`
- [ ] Manual check (optional): with `GEMINI_API_KEY`, one synthetic transcript only

**Dependencies:** Task 3

**Files likely touched:**
- `server/gemini.js`
- `server/fixtures/gemini-ramble-response.json`
- `.env.example`
- `server/test/gemini.test.js`

**Estimated scope:** Medium: 3–5 files

---

## Task 9b: POST drafts on the synthetic session

**Description:** `POST /api/sessions/:sessionId/drafts` loads that session’s stored transcript (Task 3 fixture), runs Task 9a, and returns grounded events. Wire the path in `liveWorkspace` (`drafts` / equivalent). Default body is synthetic. Missing session is 404. Does not start Scribe or accept audio.

**Acceptance criteria:**
- [x] After createSession, POST drafts returns grounded events whose quotes match the session transcript
- [x] Unknown sessionId is 404
- [x] Live adapter exposes the drafts route (no longer null)

**Verification:**
- [x] Tests pass: `node --test server/test/gemini.test.js` (route cases included or a focused drafts test)
- [x] Build succeeds: `node --check server/index.js && node --check server/gemini.js`
- [x] Manual check: bearer createSession → POST drafts → events look like grounded drafts

**Dependencies:** Task 9a

**Files likely touched:**
- `server/gemini.js`, `server/session.js`, `server/index.js`
- `src/api/liveWorkspace.js`
- `server/test/gemini.test.js`

**Estimated scope:** Small: 1–2 files (plus test)

---

## Task 9c-1: Shorter VAD commit, 16 kHz PCM

**Description:** Task 11 already opens the Scribe WebSocket with `commit_strategy=vad`, which waits the default 1.5s of silence, and the browser sends AudioContext-rate PCM in 4096-sample buffers. Set `vad_silence_threshold_secs` to 0.4 (allowed range is above 0.3 through 3.0). Resample the mic buffer to 16 kHz PCM with a box filter and send `sample_rate: 16000`. Use a 2048-sample processor buffer. Partials stay on the overlay. This task does not call Gemini.

**Acceptance criteria:**
- [x] The WebSocket URL includes `commit_strategy=vad` and `vad_silence_threshold_secs=0.4`, and it is still the speech-to-text realtime URL
- [x] A pure resample of a 48 kHz buffer produces 16-bit PCM at 16 kHz (one output sample per three input samples). Any other AudioContext rate uses `sampleRate / 16000`, not a hardcoded divisor.
- [x] Token mint tests still pass, including the missing-key case that does not touch the network

**Verification:**
- [x] Tests pass: `npm run test:stt` and `node --test src/lib/realtimeStt.test.js`
- [x] Build succeeds: `node --check server/stt.js`
- [ ] Manual check: a short pause commits well under the old 1.5s wait; the live caption still updates on partials

**Dependencies:** Task 11

**Files likely touched:**
- `server/stt.js`
- `server/test/stt.test.js`
- `src/lib/realtimeStt.js`
- `src/lib/realtimeStt.test.js`

**Estimated scope:** Medium: 3–5 files

---

## Task 9c-2: Live session transcript starts empty

**Description:** `POST /api/sessions` with `live: true` stores `transcript: []`, `events: []`, and `live: true`. A create without that flag still copies the synthetic fixture, which is what Task 9b drafts against. `POST .../transcript-lines` appends onto whichever transcript the session has. Workspace sends `live: true` only when the mode is live.

**Acceptance criteria:**
- [x] Live create, one append, then GET transcript returns exactly that one line, and GET events is `[]`
- [x] Create without `live: true` still returns the fixture transcript
- [x] An empty text append is still 400 and adds no line

**Verification:**
- [x] Tests pass: `node --test server/test/session.test.js`
- [x] Build succeeds: `node --check server/session.js`
- [ ] Manual check: live mode’s new session does not show the synthetic ramble before anyone speaks

**Dependencies:** Tasks 3, 11

**Files likely touched:**
- `server/session.js`
- `server/test/session.test.js`
- `src/pages/Workspace.jsx`

**Estimated scope:** Small: 1–2 files plus the create call

---

## Checkpoint: After Tasks 9c-1 and 9c-2

- [x] `npm run test:stt` and `node --test server/test/session.test.js` pass
- [x] A live session’s transcript is only appended lines; a non-live session is still the fixture
- [ ] Review with human before Gemini runs on live lines

---

## Task 9c-3: Commit response includes grounded drafts

**Description:** On a live session, `POST .../transcript-lines` stores the line first, then runs the existing `draftFromTranscript` and `ground` path and returns `{ t, speaker, text, seq, drafts }`. `seq` is the count of live lines included in that draft. At most one Gemini call runs at a time; a commit that arrives mid-call is stored immediately, and exactly one follow-up runs after the current call, on the full live transcript. The prompt lists only questions not already confirmed in `record.answers`, plus every live line, and it still must not ask for a diagnosis code. The generate call sets `generationConfig.thinkingConfig.thinkingBudget` to 0 and keeps `gemini-2.5-flash`. `synthetic: false`. If `ALLOW_PHI` is unset, or the Gemini fetch fails, the line stays stored, `drafts` is `[]`, and the body includes `code` (`PHI_REFUSED` or `GEMINI_HTTP`). No retry loop. Non-live `POST .../drafts` still uses the recorded fixture body and does not call Gemini. Tests inject fetch the same way `createServer({ fetchImpl })` injects the ElevenLabs fetch.

**Acceptance criteria:**
- [x] A live append whose quote is in that line returns a grounded draft in the same response; the injected fetch is called once, the request JSON has `thinkingBudget: 0`, and the prompt text has no diagnosis-code instruction and no confirmed field id
- [x] A second append that starts while the first fetch is pending does not start a second fetch until the first settles, then starts exactly one fetch whose transcript includes both lines; each response’s `seq` matches the line count that draft saw
- [x] With `ALLOW_PHI` unset, or when the injected fetch fails, the line is still on GET transcript, `drafts` is `[]`, and a failed fetch is not retried. Non-live `POST .../drafts` still returns the recorded AIQ-001 draft and does not call fetch

**Verification:**
- [x] Tests pass: `node --test server/test/gemini.test.js`
- [x] Build succeeds: `node --check server/gemini.js && node --check server/session.js && node --check server/index.js`
- [ ] Manual check: deferred until 9c-4, with `ALLOW_PHI=1` and a human at the mic

**Dependencies:** Tasks 9b, 9c-2

**Files likely touched:**
- `server/gemini.js`
- `server/session.js`
- `server/index.js`
- `server/test/gemini.test.js`

**Estimated scope:** Medium: 3–5 files

---

## Task 9c-4: Form paints those drafts immediately

**Description:** `appendTranscriptLine` already shows the committed line locally before the POST returns. When the response includes `drafts`, write them into `answers` as soon as the response arrives. Do not wait for the demo playhead, and do not copy them into the playback `events` array. Ignore a response whose `seq` is lower than the last one applied. Do not replace an answer whose status is `confirmed`. Partials never call append. Demo mode is unchanged.

**Acceptance criteria:**
- [x] A live append response with a draft sets that field’s answer without waiting for `playhead`
- [x] A response with a lower `seq` does not overwrite a newer draft, and a confirmed field stays confirmed
- [x] Partial captions still update locally and do not POST

**Verification:**
- [x] Tests pass: `node --test server/test/gemini.test.js` (server contract from 9c-3; this task does not add a component harness)
- [x] Build succeeds: `npm run build`
- [ ] Manual check: in live mode, speak one answer, pause, and see that field fill when the commit returns. Confirm it, speak again, and see it stay confirmed

**Dependencies:** Task 9c-3

**Files likely touched:**
- `src/components/workspace/useIntakeSession.js`
- `src/components/workspace/VideoPane.jsx`

**Estimated scope:** Small: 1–2 files

---

## Checkpoint: After Tasks 9c-3 and 9c-4

- [x] `node --test server/test/gemini.test.js` passes, including synthetic `POST /drafts` with no network
- [x] One committed line returns grounded drafts in that response; overlapping commits do not run two Gemini calls at once
- [x] The form shows the new draft when the commit response arrives, and a confirmed field stays confirmed
- [ ] Human approves before a live microphone with `ALLOW_PHI=1`

---

## Task 9c-5: Final Gemini pass over the full transcript

**Description:** When review asks for it, `POST /api/sessions/:sessionId/drafts` with `{ pass: "final", drafts }` runs one `gemini-2.5-flash` `generateContent` on the live session’s stored transcript. The prompt includes every live line, every question that is not confirmed in `record.answers`, and the posted drafts as context only. It tells the model to fill a blank or replace a draft when the full transcript supports a quote, and to omit a question when nothing should change. `generationConfig.thinkingConfig.thinkingBudget` is 1024 on this call. The commit path stays at 0. No tool loop and no second model. Output goes through `ground`. Confirmed field ids are removed before the prompt and dropped from the result. An empty transcript returns `{ drafts: [] }` and does not fetch. `synthetic: false`, so `ALLOW_PHI` is required; if it is unset or the fetch fails, return `{ drafts: [], code }` and do not retry. `POST .../drafts` without `pass: "final"` is unchanged: recorded fixture body, no network. This route is not called from `transcript-lines`.

**Acceptance criteria:**
- [ ] A live session with two stored lines and `{ pass: "final" }` returns grounded drafts from the injected body. The prompt contains both lines and the posted draft text, excludes a confirmed field id, and has no diagnosis-code instruction. The request JSON has `thinkingBudget` 1024.
- [ ] An invented quote in that body is absent from the result, and a confirmed field id in the model output is absent too
- [ ] An empty live transcript returns `{ drafts: [] }` and does not fetch. `POST .../drafts` without `pass: "final"` on a non-live session still returns the recorded AIQ-001 draft and does not fetch

**Verification:**
- [ ] Tests pass: `node --test server/test/gemini.test.js`
- [ ] Build succeeds: `node --check server/gemini.js && node --check server/session.js && node --check server/index.js`
- [ ] Manual check: deferred until 9c-6

**Dependencies:** Task 9c-3

**Files likely touched:**
- `server/gemini.js`
- `server/session.js`
- `server/index.js`
- `src/api/liveWorkspace.js`
- `server/test/gemini.test.js`

**Estimated scope:** Medium: 3–5 files

---

## Task 9c-6: Review applies that pass without clearing omissions

**Description:** Opening review in live mode (End Call or Preview) calls the final pass with the current non-confirmed drafts. The dialog opens immediately with the answers already on the form. When the response arrives, replace a non-confirmed field that the response includes, and fill a field that was empty. A field the response omits stays as it was. A confirmed field stays confirmed. If the transcript line count is unchanged since the last applied final pass, do not call again. Demo mode does not call. A refusal or failed fetch leaves the form as it was.

**Acceptance criteria:**
- [ ] Opening review in live mode calls `{ pass: "final" }` once, replaces a non-confirmed draft the response includes, and fills a field that was empty
- [ ] A field the response omits stays, and a confirmed field stays confirmed
- [ ] Reopening review with no new committed line does not call again. Demo mode does not call

**Verification:**
- [ ] Tests pass: `node --test server/test/gemini.test.js` (server contract from 9c-5; this task does not add a component harness)
- [ ] Build succeeds: `npm run build`
- [ ] Manual check: in live mode, speak two answers, end the call, and see a missed field fill or an earlier draft change inside the open review. Confirm a field, reopen review, and see that field unchanged

**Dependencies:** Tasks 9c-4, 9c-5

**Files likely touched:**
- `src/pages/Workspace.jsx`
- `src/components/workspace/useIntakeSession.js`
- `src/components/workspace/ReviewModal.jsx`

**Estimated scope:** Small: 1–2 files plus the review opener

---

## Checkpoint: After Tasks 9c-5 and 9c-6

- [ ] `node --test server/test/gemini.test.js` passes, including synthetic `POST /drafts` with no `pass` and no network
- [ ] A final pass fills a blank and replaces a draft; an omitted field and a confirmed field stay as they were
- [ ] Opening review does not call Gemini again when no new line was committed
- [ ] Human approves before a live microphone with `ALLOW_PHI=1`

---

## Task 10: Full Scribe transcript file (not this slice)

**Description:** Normalize a recorded full ElevenLabs Scribe transcript into `{ t, speaker, text }` lines. Not required for Tasks 9a, 9b, or 9c. Task 11’s committed lines are already that shape. Leave this until a transcript file is actually an input.

**Acceptance criteria:**
- [ ] A fixture Scribe transcript becomes ordered `{ t, speaker, text }` lines
- [ ] An empty Scribe payload becomes no lines
- [ ] Quotes from those lines pass through Task 3 `ground`

**Verification:**
- [ ] Tests pass: `node --test server/test/scribe-transcript.test.js`
- [ ] Build succeeds: `node --check server/scribeTranscript.js`

**Dependencies:** Task 3. Not Tasks 9c-1–9c-6.

**Files likely touched:**
- `server/scribeTranscript.js`
- `server/fixtures/scribe-full-transcript.json`
- `server/test/scribe-transcript.test.js`

**Estimated scope:** Medium: 3–5 files

---

## Task 11: ElevenLabs Scribe real-time STT

**Description:** Live mic audio is transcribed with ElevenLabs Scribe realtime. The server mints a single-use token (`realtime_scribe`); the browser opens the STT WebSocket with that token so `ELEVENLABS_API_KEY` never reaches the client. Committed lines use the workspace shape `{ t, speaker, text }` via `POST .../transcript-lines`. No text-to-speech and no “play question” route. Not required for Tasks 9a–9b.

**Setup:**
- [x] Create an ElevenLabs API key at https://elevenlabs.io/app/settings/api-keys
- [x] Put it in local `.env`: `ELEVENLABS_API_KEY=...`
- [x] Clinical server env: `BACKEND_TOKEN`, `PORT=8787`, `CORS_ORIGIN=http://localhost:5173`
- [x] Run with env loaded: `npm run server`
- [x] Focused tests: `npm run test:stt`

**Contract:**
- `POST /api/stt/token` (bearer) → `{ token, wsUrl }` via `POST https://api.elevenlabs.io/v1/single-use-token/realtime_scribe`
- Browser: `wss://api.elevenlabs.io/v1/speech-to-text/realtime?model_id=scribe_v2_realtime&token=...&commit_strategy=vad`
- Live workspace mic streams PCM; committed text appends via `POST .../transcript-lines`
- Connection settings: “Test realtime speech-to-text” in live mode

**Acceptance criteria:**
- [x] Token mint URL is `realtime_scribe`, not a TTS path
- [x] WebSocket URL is speech-to-text realtime, not text-to-speech
- [x] Missing API key does not call the network
- [x] Bearer required on `/api/stt/token`
- [x] `playQuestion` stays unset in the live adapter

**Verification:**
- [x] Tests pass: `npm run test:stt`
- [x] Build succeeds: `node --check server/stt.js`
- [ ] Manual check: live mode + mic on, hear speech become transcript lines

**Dependencies:** Task 3

**Files likely touched:**
- `server/stt.js`, `server/session.js`, `server/index.js`
- `server/test/stt.test.js`
- `src/lib/realtimeStt.js`
- `src/api/liveWorkspace.js`, `src/components/workspace/VideoPane.jsx`
- `.env.example`

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

## Checkpoint: After Tasks 9a–9b

- [x] `node --test server/test/gemini.test.js` passes
- [x] Invented quotes fill nothing; prompt has no diagnosis-code instruction
- [x] createSession → POST drafts works on the synthetic transcript
- [x] Task 11 is in. Task 9c does not wait on Task 10.
- [ ] Review with human before 9c-3 (Gemini on live lines)

---

## Checkpoint: Demo

- [ ] `node --test` passes
- [ ] Synthetic path: fixture transcript → grounded Gemini drafts, keep and discard send nothing, send is refused before 45:00, one PDF email at or after 45:00, no second email
- [ ] Live path: mic commit → one `POST .../transcript-lines` → grounded drafts on the form. Opening review runs one full-transcript pass that fills or updates unconfirmed answers. Task 10 is not required.
- [ ] Tiger row when `DATABASE_URL` is set
- [ ] Human approves before a live microphone, real Scribe session, or a real inbox
