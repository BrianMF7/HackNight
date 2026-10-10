# Focus agent tasks

Plan: `tasks/focus-plan.md`. Idea: `docs/ideas/cited-leading-diagnosis.md`.

Person 1 owns the agent and, later, the routes. Person 2 owns the add-on and the Yes/No function. Do not edit `server/session.js`, `server/gemini.js`, `server/template.js`, `server/pdf.js`, `server/handoff.js`, `package.json`, or `src/`. The intake list in `tasks/todo.md` stays as it is.

Definition of Done for each task: acceptance criteria met, a test that fails without the change, existing server tests still pass, no unrelated edits.

---

## Task 1: Depression criteria and scorer

**Owner:** Person 1

**Description:** Add the depression evidence rules and a pure scorer. The scorer reads bound criterion ids and either returns the depression focus with a fixed reason sentence or returns nothing. It does not read the transcript and it does not call a model.

**Acceptance criteria:**
- [x] `dep-mood` plus `dep-interest` returns `{ id: "depression", reason }` using a sentence defined in the scorer
- [x] `dep-mood` alone, `dep-interest` alone, an empty list, or an unknown id returns `null`
- [x] Adding `dep-span` to the required pair changes the reason and still returns `depression`
- [x] The criteria file states original evidence rules and does not contain DSM-5 criteria prose

**Verification:**
- [x] Tests pass: `node --test server/test/focus-score.test.js`
- [x] Build succeeds: `node --check server/focus/criteria.js && node --check server/focus/score.js`

**Dependencies:** None

**Files likely touched:**
- `server/focus/criteria.js`
- `server/focus/score.js`
- `server/test/focus-score.test.js`

**Estimated scope:** Small: 1–2 files of logic, plus the test

---

## Task 2: Quote binder

**Owner:** Person 1

**Description:** Turn model candidates into bindings the scorer can trust. Each kept quote is a substring of the transcript, with the same `...` part rule as `server/ground.js`. Unknown criterion ids and quotes that are not in the transcript are dropped. A candidate with no quote is dropped.

**Acceptance criteria:**
- [x] A quote that appears in a transcript line is kept with its `criterionId` and `t`
- [x] An invented quote, a missing quote, and an id outside `DEPRESSION_CRITERIA` are absent from the result
- [x] A quote split by `...` is kept only when every part appears in the transcript

**Verification:**
- [x] Tests pass: `node --test server/test/focus-bind.test.js`
- [x] Build succeeds: `node --check server/focus/bind.js`

**Dependencies:** Task 1

**Files likely touched:**
- `server/focus/bind.js`
- `server/test/focus-bind.test.js`

**Estimated scope:** Small: 1–2 files

---

## Task 3: Focus agent request

**Owner:** Person 1

**Description:** Build the focus-agent request. The prompt asks for criterion ids and quoted evidence only. The parsed result is bindings, then `bindCriteria`, then `scoreFocus` can be applied by the caller. Tests inject `fetch`. Nothing in this task listens on a port.

**Acceptance criteria:**
- [ ] The request text lists `dep-mood`, `dep-interest`, and `dep-span`, asks for JSON bindings, and does not ask for a diagnosis name or a diagnosis code
- [ ] A recorded body whose quotes are in the fixture transcript becomes bindings; a focus name in that body is ignored
- [ ] `synthetic: false` without `ALLOW_PHI=1` refuses before fetch
- [ ] The request JSON uses `gemini-3.8-flash` and `thinkingLevel` `low`

**Verification:**
- [ ] Tests pass: `node --test server/test/focus-agent.test.js`
- [ ] Build succeeds: `node --check server/focus/agent.js`

**Dependencies:** Task 2

**Files likely touched:**
- `server/focus/agent.js`
- `server/fixtures/focus-bindings.json`
- `server/test/focus-agent.test.js`

**Estimated scope:** Medium: 3–5 files

---

## Task 4: Gold transcripts

**Owner:** Person 1

**Description:** Two saved transcripts stand in for the clinician yes/no the idea doc asks for. The positive one binds the required pair and the scorer surfaces depression. The negative one does not, and the scorer stays quiet. Both go through the recorded agent body and the binder, with fetch injected.

**Acceptance criteria:**
- [ ] `server/fixtures/focus-positive.json` surfaces `{ id: "depression" }` and every kept quote is a substring of that fixture
- [ ] `server/fixtures/focus-negative.json` surfaces nothing
- [ ] Neither fixture is loaded by `POST /api/sessions` or by the form-draft agent

**Verification:**
- [ ] Tests pass: `node --test server/test/focus-agent.test.js`
- [ ] Build succeeds: `node --check server/focus/agent.js`

**Dependencies:** Task 3

**Files likely touched:**
- `server/fixtures/focus-positive.json`
- `server/fixtures/focus-negative.json`
- `server/test/focus-agent.test.js`

**Estimated scope:** Small: 1–2 files, plus fixtures

---

## Checkpoint: Agent

- [ ] `node --test server/test/focus-score.test.js server/test/focus-bind.test.js server/test/focus-agent.test.js` passes
- [ ] Those tests do not open a port and do not call the network
- [ ] Person 1 has not edited Person 2’s files

---

## Task 5: Depression add-on questions

**Owner:** Person 2

**Description:** Define the two questions Yes will open. They are a prior episode and a brief elevated-mood screen. They are not copied into the adult-intake template, and they are not required for handoff.

**Acceptance criteria:**
- [ ] `depressionAddon` has `DEP-001` and `DEP-002`, both `required: false`, neither marked safety
- [ ] `addonFor("depression")` returns those questions, and `addonFor` of any other id returns `null`
- [ ] `server/template.js` and `src/api/templates/adultIntake.js` do not gain `DEP-001` or `DEP-002`

**Verification:**
- [ ] Tests pass: `node --test server/test/focus-addon.test.js`
- [ ] Build succeeds: `node --check server/focus/addon.js`
- [ ] Existing template contract still passes: `node --test server/test/template.test.js`

**Dependencies:** None. Can start with Task 1.

**Files likely touched:**
- `server/focus/addon.js`
- `server/test/focus-addon.test.js`

**Estimated scope:** Small: 1–2 files

---

## Task 6: Yes and No state

**Owner:** Person 2

**Description:** A pure function applies the intake person’s decision. Yes attaches the depression add-on. No clears the offer for that state. The function does not fetch, does not read `sessions`, and does not write a diagnosis code.

**Acceptance criteria:**
- [ ] Yes on `depression` returns `decision: "yes"` and the two add-on questions
- [ ] No returns `decision: "no"`, `focuses` empty, and `addon: []`, even when the input state had a surfaced depression focus
- [ ] A repeated Yes or No returns the same outcome; an unknown focus id or any other decision string throws a coded error and does not change the input object

**Verification:**
- [ ] Tests pass: `node --test server/test/focus-decision.test.js`
- [ ] Build succeeds: `node --check server/focus/decision.js`

**Dependencies:** Task 5

**Files likely touched:**
- `server/focus/decision.js`
- `server/test/focus-decision.test.js`

**Estimated scope:** Small: 1–2 files

---

## Checkpoint: Add-on

- [ ] `node --test server/test/focus-addon.test.js server/test/focus-decision.test.js` passes
- [ ] Person 2 has not edited `server/index.js`, `server/focus/agent.js`, or `server/focus/score.js`

---

## Task 7: Focus routes

**Owner:** Person 1, after Tasks 1–6 are in the tree

**Description:** Serve the focus agent on its own routes. Use `findSession` and store state on `record.focus`. Call `suggestBindings` only when four new committed lines have arrived, the session has no decision yet, and `record.focusing` is free. Decision and quote reads never call the model. `server/index.js` gains one handler call. `appendTranscriptLine` stays untouched.

**Acceptance criteria:**
- [ ] `POST .../focus` on a live session whose transcript is the positive fixture, with fetch injected, returns one depression focus, a reason, `addon: []`, and no `quotes` field
- [ ] A second `POST .../focus` before four further lines returns `skipped: true` and does not call fetch
- [ ] Two overlapping `POST .../focus` calls share one fetch
- [ ] `POST .../focus/decision` with `no` hides the focus and does not call fetch; `yes` returns `DEP-001` and `DEP-002` and does not call fetch
- [ ] `GET .../focus/quotes` returns the bound quotes after a surfaced focus, and `{ quotes: [] }` after No
- [ ] Unknown session is 404; a bad decision is 400; missing bearer is 401

**Verification:**
- [ ] Tests pass: `node --test server/test/focus-routes.test.js`
- [ ] Build succeeds: `node --check server/focus/routes.js && node --check server/index.js`
- [ ] Manual check: none until Task 8

**Dependencies:** Tasks 4 and 6

**Files likely touched:**
- `server/focus/routes.js`
- `server/index.js`
- `server/test/focus-routes.test.js`

**Estimated scope:** Medium: 3–5 files

---

## Task 8: Isolation and failure tests

**Owner:** Person 1

**Description:** Lock the production behavior this agent is allowed to have. A PHI refusal, a failed fetch, and an empty transcript leave the session in place and return an empty focus. The form-draft path and the handoff gate stay on their current rules. No test in this task uses a live microphone or a real Gemini key.

**Acceptance criteria:**
- [ ] With `ALLOW_PHI` unset, `POST .../focus` on a live session returns `{ focuses: [], code: "PHI_REFUSED" }` and the injected fetch is not called
- [ ] A failed fetch returns `{ focuses: [], code: "GEMINI_HTTP" }` once, with no retry, and `GET .../transcript` still has the lines already stored
- [ ] An empty live transcript returns `{ focuses: [] }` and does not fetch
- [ ] After Yes, `handoffReasons` still reports only the template’s required ids, and the PDF module is unchanged
- [ ] `POST .../transcript-lines` on a live session still returns drafts from the form agent without calling `suggestBindings`

**Verification:**
- [ ] Tests pass: `node --test server/test/focus-routes.test.js server/test/gemini.test.js server/test/handoff-gate.test.js`
- [ ] Build succeeds: `npm run test:server`
- [ ] Manual check: deferred. Do not point a live mic at this route until a person reviews the gold fixtures and the two add-on questions

**Dependencies:** Task 7

**Files likely touched:**
- `server/test/focus-routes.test.js`

**Estimated scope:** Medium: 3–5 files if the route needs small fixes found by these tests; otherwise the test file

---

## Checkpoint: Backend ready for a later screen

- [ ] `npm run test:server` passes
- [ ] A committed line still returns grounded drafts, and a focus call cannot start from that handler
- [ ] Handoff after Yes still uses the existing required-question rule
- [ ] Human approves before `ALLOW_PHI=1` on a real transcript
