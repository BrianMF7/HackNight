# Tasks: spoken answers land on the form

Requirements: `tasks/autofill-plan.md`. Do not edit `tasks/plan.md` or `tasks/todo.md`.

Test: `node --test server/test/ground.test.js server/test/gemini.test.js src/lib/applyLiveDrafts.test.js`

---

## Task 1: Keep a spoken quote

**Description:** `ground` keeps evidence that is the spoken line, including a line with no extra quotes and a line prefixed with `Patient:` or `Clinician:`. Invented text and silence stay dropped.

**Acceptance criteria:**
- [x] “What brings me in today is that I feel sad.” fills `AIQ-001` when that is the evidence
- [x] The same sentence prefixed with `Patient:` fills
- [x] An unquoted sentence that was never spoken fills nothing

**Verification:**
- [x] `node --test server/test/ground.test.js server/test/gemini.test.js`

**Dependencies:** None

**Files likely touched:**
- `server/ground.js`
- `server/test/ground.test.js`
- `server/test/gemini.test.js`

**Estimated scope:** Small: 1–2 files

---

## Task 2: Paint only form statuses

**Description:** A model status the form does not render becomes `draft`. `confirmed` from the model does not confirm the field.

**Acceptance criteria:**
- [x] Status `completed` is shown as `draft` with the model’s answer
- [x] Status `confirmed` from a draft does not confirm an open field
- [x] `partial` and `clarify` stay as they are

**Verification:**
- [x] `node --test src/lib/applyLiveDrafts.test.js`

**Dependencies:** None

**Files likely touched:**
- `src/components/workspace/applyLiveDrafts.js`
- `src/lib/applyLiveDrafts.test.js`

**Estimated scope:** Small: 1–2 files
