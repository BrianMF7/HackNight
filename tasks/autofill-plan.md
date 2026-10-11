# Fix: spoken answers never land on the form

## Overview

Speech-to-text is already committing lines. A live draft call for “What brings me in today is that I feel sad.” returns field `AIQ-001` with that sentence as `evidence` and `status: "completed"`. The form stays on “No supported answer yet” because `ground` only keeps evidence that contains an extra pair of double quotes, and a status outside the form’s five states cannot be painted.

`tasks/plan.md` and `tasks/todo.md` stay as they are. This bug is tracked here and in `tasks/autofill-todo.md`.

## Root cause

`server/ground.js` reads quotes with `/"([^"]*)"/`. The live model returns the spoken line as the evidence string itself, with no extra quotes. `applyDrafts` skips that draft (`NO_QUOTE`). The caption still shows the line, because the caption is local and does not wait for the draft.

The same call used `status: "completed"`. The form only knows `not_answered`, `partial`, `draft`, `clarify`, and `confirmed`. Painting that status would throw. Model output must not count as clinician-confirmed.

A quote that starts with `Patient:` or `Clinician:` is also dropped. The prompt shows those labels, and the spoken words are what `ground` compares.

## Decisions

- Keep a draft when every quote part is a substring of the spoken text. No extra quote marks are required. A leading `Patient:` or `Clinician:` on a part is ignored once.
- Text that was not spoken is still dropped. Silence still does not become “no”. An unknown field id still throws.
- `partial`, `draft`, and `clarify` pass through. Any other model status, including `completed` and `confirmed`, is stored on the form as `draft`.
- The PHI gate stays. A live transcript still needs `ALLOW_PHI=1` before it is sent to the model.

## Not doing

- No new matcher that guesses a field from keywords.
- No change to the in-memory session, the 45:00 gate, or the depression focus wording.
- No prompt rewrite. The model response above is already a usable draft once `ground` accepts it.

## Verification

- `node --test server/test/ground.test.js server/test/gemini.test.js src/lib/applyLiveDrafts.test.js`
- `node --test server/test/*.test.js`
- One live append of the spoken sentence against the local server returns an `AIQ-001` draft.
