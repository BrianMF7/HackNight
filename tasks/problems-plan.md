# Fix strategy: clear the Problems tab

`tasks/plan.md` and `tasks/todo.md` are the clinical-backend plan and still have open tasks. This work is recorded here and in `tasks/problems-todo.md` so that plan is left alone.

## Problem statement

How do we clear every real diagnostic without changing what the screen does?

## What was counted

Collected on a clean tree, not from the IDE cache:

| Check | Count | Command |
| --- | --- | --- |
| Repo typecheck | **156** | `npx tsc -p ./jsconfig.json --noEmit --pretty false` |
| ESLint | **5** (3 errors, 2 warnings) | `npx eslint .` |
| IDE `ReadLints` | 0 | language service had nothing loaded; the commands above are the source of truth |
| Every `src` JS/JSX file, same compiler options | **481** | same `checkJs` options, `include` widened only for the recount |

The ~384 figure is in the same band as the widened check. `jsconfig.json` only roots `src/components/**/*.js`, `src/pages/**/*.jsx`, and `src/Layout.jsx`, and it excludes `src/components/ui`, `src/api`, and `src/lib`. Imported files are still checked, which is why the 156 includes `button.jsx` and `app-params.js`. UI files nothing imports yet show up only on the widened check. Both sets get fixed. The gate stays `npm run typecheck` and `npx eslint .`. A widened check is the extra proof.

## Root causes

1. **`React.forwardRef` props default to `{}`** (almost all of the 481). The render callback destructures its first argument, so TypeScript cannot infer the props generic and uses the React 18 default `P = {}`. Inside the component, `className` and the rest are missing. At call sites the component type collapses to `RefAttributes<any>`, so `children`, `value`, `onClick`, and the rest are rejected. Codes: TS2339, TS2322, TS2559.
2. **Plain functions treat every destructured name as required** (TS2741, TS2739). `DialogHeader`, `Badge`, `AuthLayout`, `ClinicalDocument`, and `ResizablePanelGroup` already treat `className`, `subtitle`, `footer`, `readOnly`, and `pageFilter` as optional at runtime. The inferred props type does not.
3. **`import.meta.env` is untyped** because `jsconfig.json` sets `"types": []`, so Vite's `ImportMeta` augmentation is not loaded. Three TS2339s in `app-params.js`.
4. **`createContext()` is called with no default.** React's type requires one argument. The runtime default is `undefined`. `useAuth` already rejects a missing context. One TS2554.
5. **`mockWorkspace.getSttToken` assigns `code` on a plain `Error`.** `ApiError` already has `code`. One TS2339.
6. **A headers object has no string index signature**, so it is not a `HeadersInit`. One TS2322 in `OAuthConsent.jsx`.
7. **Chart indicator style uses CSS variables** that `React.CSSProperties` does not list (TS2353). Only on the widened check.
8. **`tiger-db.js` and the two `src/lib` tests** reference Node and `postgres`. `postgres` is in `package.json` but not installed in this `node_modules`. Only on the widened check.
9. **Unused imports and unused catch bindings.** ESLint `unused-imports/no-unused-imports` and `unused-imports/no-unused-vars`.

A prototype in a scratch file confirmed cause 1: a `@type` annotation on the destructured props parameter makes call sites accept real props, and `variant="nope"` is still rejected. The scratch file was deleted.

## Recommended direction

Annotate the props the component already accepts, at the component, using React's `ComponentPropsWithoutRef` (or a small intersection when the wrapper adds `variant`, `asChild`, `withHandle`, and similar). Do not change JSX, class names, or control flow.

`@type` here is the JSDoc parameter annotation that names that props object. It is not `any`, not `@ts-ignore`, and not a way to silence a call site. A wrong variant still fails.

## Assumptions

- Call sites only pass props these components already forward. If a type is too narrow, the typecheck error names the prop and that task widens the annotation. No call-site casts.
- `readOnly = undefined` is not used. Optional props are expressed in the type, so `undefined` and `false` stay distinct.
- `createContext(undefined)` matches today's missing default. `useAuth` still throws outside the provider.
- Throwing `ApiError` with `code: "MOCK_MODE"` keeps `message` and `code`. The alert already reads `fieldErrors || {}`.

## Not doing

- UI or copy changes
- New features, wrappers, or a typed-`forwardRef` helper
- `any`, `never`, `as any`, `@ts-ignore`, `@ts-expect-error`, `eslint-disable`, skipped tests
- New dependencies. `postgres` is already declared; install it from the lockfile only if the widened check still cannot resolve it
- Editing `jsconfig.json` include/exclude. That would hide or reshuffle the gate instead of typing the components
- Drive-by React performance refactors. Annotations do not change render output
- Convex, Netlify, Render, or any other stack
- Overwriting `tasks/plan.md` or `tasks/todo.md`

## Risks

| Risk | Mitigation |
| --- | --- |
| A shared prop type rejects a legal call | Fix the annotation in the same task. Do not cast the call. |
| `Button`'s `asChild` element union disagrees with `ref` | The same pattern already typechecked against `Slot`. If the real file disagrees, adjust the ref type, not the JSX. |
| Vite's `ImportMeta` reference adds globals | It is the Vite client types this app already runs on. Re-run typecheck after the one-line reference. |
| `ApiError` adds `status` and `fieldErrors` | Callers use `message`, and the alert treats missing `fieldErrors` as none. `code` stays `MOCK_MODE`. |

## Verification

- Focused: `npx tsc -p ./jsconfig.json --noEmit --pretty false` must drop the codes that task names, and must not add codes.
- ESLint: `npx eslint .`
- Widened proof, after the UI sweep: same compiler options over `src/**/*.js` and `src/**/*.jsx`.
- Behavior: `npm run build`, `node --test server/test/*.test.js`, and `node --test src/lib/*.test.js`.
- Browser: load the running dev server if one is already up. These edits are types and unused bindings, so the screen should match.
