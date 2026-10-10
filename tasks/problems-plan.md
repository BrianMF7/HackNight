# Fix strategy: clear the strict Problems tab

`tasks/plan.md` and `tasks/todo.md` are the clinical-backend plan and still have open tasks. This work stays here and in `tasks/problems-todo.md`.

The earlier phase made `npm run typecheck` and `npx eslint .` exit 0. The Problems tab is that same `jsconfig.json` project with `--strict` (`noImplicitAny`, `strictNullChecks`, `useUnknownInCatchVariables`). A recount on 2026-10-10 was **235** errors from `npx tsc -p ./jsconfig.json --strict --noEmit --pretty false`. About 37 of those are under `src/api`, which the IDE hides because `jsconfig` excludes that folder. Imported files are still checked. Those api errors are the same class and get fixed too, so the strict check is actually clean.

## Problem statement

How do we clear every strict diagnostic without changing what the screen does?

## Root causes

1. **`useState(null)` and `useState([])` with no type argument** infer `null` or `never[]`. Later assignments and property reads fail (`never`, `SetStateAction<null>`, `Type 'number' is not assignable to type 'null'`). Files: `useIntakeSession.js` (events, transcript, notifications, answers), `TemplatePicker.jsx`, `AuthContext.jsx`, `VideoPane.jsx` (recorder ref), `OAuthConsent.jsx`, `Workspace.jsx`, `ReviewModal.jsx`.
2. **Intake questions are inferred as a union.** Some variants have `safety` or `phq`, and only some sections have `note`, so `q.safety` and `section.note` are illegal on the other members. One question typedef and one section typedef, with `safety`, `phq`, and `note` optional, make every read legal. No fake fields on objects that do not have them.
3. **Implicit `any` parameters and bindings** (TS7006, TS7031, TS7019, TS7005, TS7034). Annotate the parameter with the value the function already uses: form events, question callbacks, toast actions, adapter arguments.
4. **`catch (e)` is `unknown`** (TS18046). Narrow with a small type guard for `{ message?: string, status?: number, data?: { extra_data?: { reason?: string } } }`. Do not annotate the binding as `any`.
5. **OAuth consent headers** are `{ "Content-Type": string }`, so `headers.Authorization` is illegal. The object is a `Record<string, string>`. `string | null` passed where a string is required (`ResetPassword` reset token, `OAuthConsent` `ctx`, `base44Client` token) is narrowed before the call.
6. **`src/api/index.js` indexes adapters with a `string`.** Method names are `typeof METHODS[number]`. Rest args come from the adapter functions, not `any[]`.
7. **`use-toast.jsx` reducer, state, and `listeners`** are untyped, so the action, toast, and listener array fail together.
8. **`realtimeStt.js` `new Promise()`** calls `resolve()` with no argument (TS2810) and leaves number parameters implicit. The promise is `Promise<void>`.
9. **`statusStyles` is indexed with a wide status string.** The status is `keyof` that object, the same keys as `STATUS` in `adultIntake.js`: `not_answered | partial | draft | clarify | confirmed`.

## Not doing

- UI or copy changes
- `any`, `never` as an annotation or cast, `as any`, `@ts-ignore`, `@ts-expect-error`, `eslint-disable`
- New dependencies or a new test runner. RED is the current strict diagnostic
- Editing `jsconfig.json` include/exclude, or adding `"strict": true` to `jsconfig.json`
- Overwriting `tasks/plan.md` or `tasks/todo.md`
- Convex, Netlify, Render, or any other stack

## Risks

| Risk | Mitigation |
| --- | --- |
| A question typedef rejects a real question field | Widen the typedef with the field the object already has. Do not add the field to the data. |
| Adapter rest args disagree between mock and live | Type the argument the UI already passes, on both adapters. |
| Narrowing `null` skips a call the UI can still reach | Guard only where the screen already refuses to continue without the string. |

## Verification

- `npx tsc -p ./jsconfig.json --strict --noEmit --pretty false` exits 0
- `npm run typecheck` exits 0
- `npx eslint .` exits 0
- `node --test server/test/*.test.js` and `node --test src/lib/*.test.js`
- `npm run build`
- If a dev server is up, load the landing page and the login page and confirm there is no Vite error overlay
