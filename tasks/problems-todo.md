# Tasks: clear strict Problems-tab diagnostics

Requirements: `tasks/problems-plan.md`. UI and behavior stay. Types name the values the code already reads and writes. No `any`, no `never` annotations or casts, no lint suppressions, no new dependencies, no `jsconfig` include/exclude edits, no `"strict": true` in `jsconfig.json`.

RED is the strict diagnostic named below. It is a type failure, not a runtime behavior change, so there is no new test harness.

Test gate: `npx tsc -p ./jsconfig.json --strict --noEmit --pretty false` · Non-strict: `npm run typecheck` · Lint: `npx eslint .` · Build: `npm run build` · Server tests: `node --test server/test/*.test.js` · Lib tests: `node --test src/lib/*.test.js`

Starting strict count: **235**.

---

## Task A: Question and section typedefs

**Description:** `adultIntake.js` questions are a union, so `safety` and section `note` are missing on some members. One question typedef (`id`, `label`, `followUp`, `required`, optional `phq`, optional `safety`) and one section typedef (`id`, `title`, `questions`, optional `note`). Annotate the template and `allQuestions`. `STATUS` keys are the answer-status union.

**Acceptance criteria:**
- [x] Every question read of `safety` and every section read of `note` typechecks
- [x] Objects that do not have `safety` or `note` do not gain those fields in the data

**Verification:**
- [x] Strict `tsc` no longer reports `safety` or `note` property errors in `ClinicalDocument.jsx`, `ReviewDocument.jsx`, `ReviewSummary.jsx`, `useIntakeSession.js`, or `mockWorkspace.js`

**Dependencies:** None

**Files likely touched:**
- `src/api/templates/adultIntake.js`

**Estimated scope:** Small

---

## Task B: Intake session state

**Description:** `useState([])` and `useState({})` in `useIntakeSession.js` infer `never[]` and `{}`. Type events, transcript lines, notifications, and the answers map with the shapes those setters already write. Type `applyLiveDrafts.js` parameters the same way. `appliedFinalLinesRef` holds a number or null.

**Acceptance criteria:**
- [ ] Strict `tsc` no longer reports `useIntakeSession.js` or `applyLiveDrafts.js`
- [ ] `node --test src/lib/applyLiveDrafts.test.js` passes

**Verification:**
- [ ] Strict `tsc` error list no longer names those two files
- [ ] `node --test src/lib/applyLiveDrafts.test.js`

**Dependencies:** Task A (`safety` on questions, answer status)

**Files likely touched:**
- `src/components/workspace/useIntakeSession.js`
- `src/components/workspace/applyLiveDrafts.js`

**Estimated scope:** Medium

---

## Task C: Workspace presentational props

**Description:** Prop bindings on the workspace components are implicit `any`. Annotate the props they already destructure, using the question, status, and session typedefs. `statusStyles` is indexed only with the status union.

**Acceptance criteria:**
- [ ] Strict `tsc` no longer reports the workspace presentational files
- [ ] Status indexing uses `not_answered | partial | draft | clarify | confirmed`

**Verification:**
- [ ] Strict `tsc` error list no longer names `BlockedHandoffAlert.jsx`, `ChatPanel.jsx`, `ClinicalDocument.jsx`, `DocumentHeader.jsx`, `HandoffConfirmDialog.jsx`, `NotificationStack.jsx`, `OutstandingQueue.jsx`, `PatientLeftModal.jsx`, `QuestionRow.jsx`, `ReviewDocument.jsx`, `ReviewModal.jsx`, `ReviewSummary.jsx`, `SessionTimerBar.jsx`, `statusStyles.js`, or `VideoPane.jsx`

**Dependencies:** Tasks A and B

**Files likely touched:**
- `src/components/workspace/BlockedHandoffAlert.jsx`
- `src/components/workspace/ChatPanel.jsx`
- `src/components/workspace/ClinicalDocument.jsx`
- `src/components/workspace/DocumentHeader.jsx`
- `src/components/workspace/HandoffConfirmDialog.jsx`
- `src/components/workspace/NotificationStack.jsx`
- `src/components/workspace/OutstandingQueue.jsx`
- `src/components/workspace/PatientLeftModal.jsx`
- `src/components/workspace/QuestionRow.jsx`
- `src/components/workspace/ReviewDocument.jsx`
- `src/components/workspace/ReviewModal.jsx`
- `src/components/workspace/ReviewSummary.jsx`
- `src/components/workspace/SessionTimerBar.jsx`
- `src/components/workspace/statusStyles.js`
- `src/components/workspace/VideoPane.jsx`

**Estimated scope:** Medium

---

## Task D: Auth, pages, and dashboard

**Description:** `useState(null)` in auth, consent, workspace, and the template picker. Form handlers and `catch` bindings. Narrow `string | null` before `resetPassword`, `encodeURIComponent`, and the Base44 client token. Consent response headers are `Record<string, string>`.

**Acceptance criteria:**
- [ ] Strict `tsc` no longer reports `AuthContext.jsx`, `Login.jsx`, `Register.jsx`, `ForgotPassword.jsx`, `ResetPassword.jsx`, `OAuthConsent.jsx`, `Workspace.jsx`, `TemplatePicker.jsx`, `DemoAndContact.jsx`, or `useApiMode.js`
- [ ] Catch bindings stay `unknown` and are narrowed before `.message` or `.status`

**Verification:**
- [ ] Strict `tsc` error list no longer names those files

**Dependencies:** Tasks B and C (workspace page passes session and document props)

**Files likely touched:**
- `src/lib/AuthContext.jsx`
- `src/api/ApiError.js`
- `src/pages/Login.jsx`
- `src/pages/Register.jsx`
- `src/pages/ForgotPassword.jsx`
- `src/pages/ResetPassword.jsx`
- `src/pages/OAuthConsent.jsx`
- `src/pages/Workspace.jsx`
- `src/components/dashboard/TemplatePicker.jsx`
- `src/components/marketing/DemoAndContact.jsx`
- `src/components/clinic/useApiMode.js`
- `src/api/base44Client.js`

**Estimated scope:** Medium

---

## Task E: Toast, speech-to-text, and `cn`

**Description:** Type the toast reducer state, toast, and action union from the action names the reducer already switches on. `listeners` is an array of listener functions. `new Promise()` in `realtimeStt.js` is `Promise<void>`, and the numeric helpers take numbers. `cn` rest args use the `ClassValue` type `clsx` already accepts.

**Acceptance criteria:**
- [ ] Strict `tsc` no longer reports `use-toast.jsx`, `realtimeStt.js`, or `utils.js`
- [ ] `node --test src/lib/realtimeStt.test.js` passes

**Verification:**
- [ ] Strict `tsc` error list no longer names those files
- [ ] `node --test src/lib/realtimeStt.test.js`

**Dependencies:** None

**Files likely touched:**
- `src/components/ui/use-toast.jsx`
- `src/lib/realtimeStt.js`
- `src/lib/utils.js`

**Estimated scope:** Small

---

## Task F: API adapters

**Description:** Annotate adapter parameters with the records they already read. `index.js` method names are `typeof METHODS[number]`, and rest args come from those functions. `JSON.parse` receives a string. `mockWorkspace` can read `safety` because of Task A.

**Acceptance criteria:**
- [ ] `npx tsc -p ./jsconfig.json --strict --noEmit --pretty false` exits 0
- [ ] No new diagnostic in a file an earlier task cleared

**Verification:**
- [ ] Strict `tsc` exits 0
- [ ] `npm run typecheck` exits 0
- [ ] `npx eslint .` exits 0
- [ ] `node --test server/test/*.test.js` and `node --test src/lib/*.test.js` pass
- [ ] `npm run build` exits 0

**Dependencies:** Tasks A–E

**Files likely touched:**
- `src/api/ApiError.js`
- `src/api/base44Client.js`
- `src/api/config.js`
- `src/api/index.js`
- `src/api/mockAdapter.js`
- `src/api/mockWorkspace.js`
- `src/api/liveAdapter.js`
- `src/api/liveWorkspace.js`

**Estimated scope:** Medium

---

## Checkpoint: Complete

- [ ] Strict `tsc` exits 0 (was 235)
- [ ] `npm run typecheck` exits 0
- [ ] `npx eslint .` exits 0
- [ ] Server and lib tests pass
- [ ] `npm run build` exits 0
- [ ] Landing and login pages show no Vite overlay when a dev server is running
