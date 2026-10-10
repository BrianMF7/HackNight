# Tasks: clear typecheck and lint diagnostics

Requirements: `tasks/problems-plan.md`. UI and behavior stay. Types go on the components that already accept the props. No `any`, no lint suppressions, no new dependencies.

Test gate: `npx tsc -p ./jsconfig.json --noEmit` · Lint: `npx eslint .` · Build: `npm run build` · Server tests: `node --test server/test/*.test.js` · Lib tests: `node --test src/lib/*.test.js`

RED for these tasks is the diagnostic named below. It is a type or lint failure, not a runtime behavior change, so there is no new test harness.

---

## Task 1: Form control prop types

**Description:** `Button`, `Input`, `Textarea`, `Label`, and `Badge` are the props behind most call-site errors. Annotate the props they already forward.

**Acceptance criteria:**
- [x] `Button` accepts `variant`, `size`, `asChild`, `children`, and button attributes, and still rejects an unknown variant
- [x] `Input`, `Textarea`, and `Label` accept the attributes their call sites already pass
- [x] `Badge` accepts `variant` and `children` without a required `className`
- [x] No new diagnostics in these files

**Verification:**
- [x] `npx tsc -p ./jsconfig.json --noEmit --pretty false` no longer reports these five files, and the total error count drops
- [x] `npx eslint src/components/ui/button.jsx src/components/ui/input.jsx src/components/ui/textarea.jsx src/components/ui/label.jsx src/components/ui/badge.jsx`

**Dependencies:** None

**Files likely touched:**
- `src/components/ui/button.jsx`
- `src/components/ui/input.jsx`
- `src/components/ui/textarea.jsx`
- `src/components/ui/label.jsx`
- `src/components/ui/badge.jsx`

**Estimated scope:** Medium

---

## Task 2: Dialog prop types

**Description:** Dialog and alert-dialog wrappers, including the plain header and footer functions, use the same empty or required-prop inference.

**Acceptance criteria:**
- [x] Content, title, description, overlay, action, and cancel accept `children` and `className`
- [x] Header and footer no longer require `className`
- [x] Dialog content still accepts `onInteractOutside` and `onEscapeKeyDown`

**Verification:**
- [x] Typecheck no longer reports `dialog.jsx` or `alert-dialog.jsx`, and call sites of those components drop with them

**Dependencies:** Task 1 (`alert-dialog` imports `buttonVariants`)

**Files likely touched:**
- `src/components/ui/dialog.jsx`
- `src/components/ui/alert-dialog.jsx`

**Estimated scope:** Small

---

## Task 3: Progress, resizable, and OTP prop types

**Description:** `Progress` hides `value`. `ResizablePanelGroup` requires `className` and drops `direction`. `InputOTP` drops `maxLength` out of the spread type.

**Acceptance criteria:**
- [x] `Progress` accepts `value` and optional `className`
- [x] `ResizablePanelGroup` requires `direction` and not `className`
- [x] `ResizableHandle` accepts `withHandle` without `className`
- [x] `InputOTP` still requires `maxLength` and children, and the spread onto `OTPInput` typechecks

**Verification:**
- [x] Typecheck no longer reports `progress.jsx`, `resizable.jsx`, or `input-otp.jsx`

**Dependencies:** None

**Files likely touched:**
- `src/components/ui/progress.jsx`
- `src/components/ui/resizable.jsx`
- `src/components/ui/input-otp.jsx`

**Estimated scope:** Small

---

## Task 4: Optional layout props

**Description:** `AuthLayout` and `ClinicalDocument` mark every destructured prop required. Runtime already skips missing `subtitle`, `footer`, `readOnly`, and `pageFilter`.

**Acceptance criteria:**
- [x] `subtitle`, `footer`, and `children` are optional on `AuthLayout`; `icon` and `title` stay required
- [x] `readOnly` and `pageFilter` are optional on `ClinicalDocument`; the workspace call typechecks
- [x] Rendering of those omitted props is unchanged

**Verification:**
- [x] Typecheck no longer reports `AuthLayout.jsx`, `ClinicalDocument.jsx`, `Register.jsx`, `Login.jsx`, `ResetPassword.jsx`, `ForgotPassword.jsx`, `OAuthConsent.jsx` (layout lines), or `Workspace.jsx` (document line)

**Dependencies:** Tasks 1–3 (those pages also use the controls)

**Files likely touched:**
- `src/components/AuthLayout.jsx`
- `src/components/workspace/ClinicalDocument.jsx`

**Estimated scope:** Small

---

## Task 5: Env, auth context, API error, headers

**Description:** Four one-off type holes outside the component pattern.

**Acceptance criteria:**
- [x] `import.meta.env` resolves through Vite's client types
- [x] `createContext` receives the same `undefined` default the runtime already uses, with the provider value typed
- [x] Mock speech-to-text throws `ApiError` with `code: "MOCK_MODE"`
- [x] The consent-info headers object is a `Record<string, string>`

**Verification:**
- [x] Typecheck no longer reports `app-params.js`, `AuthContext.jsx`, `mockWorkspace.js`, or the headers error in `OAuthConsent.jsx`
- [x] `npm run typecheck` exits 0

**Dependencies:** Task 4

**Files likely touched:**
- `src/lib/app-params.js`
- `src/lib/AuthContext.jsx`
- `src/api/mockWorkspace.js`
- `src/pages/OAuthConsent.jsx`

**Estimated scope:** Medium

---

## Task 6: Unused imports and catch bindings

**Description:** ESLint reports three unused imports and two unused catch bindings. Remove the unused names. `catch { }` keeps the same handler.

**Acceptance criteria:**
- [ ] `npx eslint .` exits 0
- [ ] The catch handlers still set the same error text

**Verification:**
- [ ] `npx eslint .`

**Dependencies:** None

**Files likely touched:**
- `src/components/marketing/FeatureSections.jsx`
- `src/components/workspace/QuestionRow.jsx`
- `src/components/workspace/ReviewModal.jsx`
- `src/pages/OAuthConsent.jsx`

**Estimated scope:** Small

---

## Checkpoint: After Tasks 1–6

- [ ] `npm run typecheck` exits 0
- [ ] `npx eslint .` exits 0
- [ ] No new diagnostics in the files those tasks touched

---

## Task 7: Simple display primitives

**Description:** The same `{}` props bug on the display primitives the widened check still reports.

**Acceptance criteria:**
- [ ] Each forwardRef in these files has a props annotation matching the element it renders
- [ ] A widened check no longer reports these files

**Verification:**
- [ ] Widened `tsc` error list no longer names these files

**Dependencies:** Task 1

**Files likely touched:**
- `src/components/ui/card.jsx`
- `src/components/ui/alert.jsx`
- `src/components/ui/switch.jsx`
- `src/components/ui/checkbox.jsx`
- `src/components/ui/slider.jsx`
- `src/components/ui/separator.jsx`
- `src/components/ui/avatar.jsx`
- `src/components/ui/scroll-area.jsx`
- `src/components/ui/tabs.jsx`
- `src/components/ui/table.jsx`
- `src/components/ui/radio-group.jsx`
- `src/components/ui/accordion.jsx`
- `src/components/ui/tooltip.jsx`
- `src/components/ui/popover.jsx`
- `src/components/ui/hover-card.jsx`

**Estimated scope:** Medium

---

## Task 8: Overlays, menus, and toggles

**Description:** Same annotation on the remaining menu, overlay, and toggle primitives, including the extra props they already destructure (`side`, `inset`, `align`, `variant`).

**Acceptance criteria:**
- [ ] Widened check no longer reports these files
- [ ] Extra props that callers or the component body read are on the props type

**Verification:**
- [ ] Widened `tsc` error list no longer names these files

**Dependencies:** Task 7

**Files likely touched:**
- `src/components/ui/sheet.jsx`
- `src/components/ui/drawer.jsx`
- `src/components/ui/toast.jsx`
- `src/components/ui/toaster.jsx`
- `src/components/ui/dropdown-menu.jsx`
- `src/components/ui/context-menu.jsx`
- `src/components/ui/menubar.jsx`
- `src/components/ui/navigation-menu.jsx`
- `src/components/ui/select.jsx`
- `src/components/ui/command.jsx`
- `src/components/ui/toggle.jsx`
- `src/components/ui/toggle-group.jsx`
- `src/components/ui/breadcrumb.jsx`
- `src/components/ui/pagination.jsx`
- `src/components/ui/sonner.jsx`

**Estimated scope:** Medium

---

## Task 9: Form, carousel, images, sidebar, chart

**Description:** The remaining widened-check files. Sidebar and chart destructure more than `className`. Chart's indicator style needs a CSS-variable extension of `CSSProperties`, not a cast to `any`.

**Acceptance criteria:**
- [ ] Widened check reports zero errors in `src/components/ui`
- [ ] Chart CSS variables stay on the indicator element

**Verification:**
- [ ] Widened `tsc` over `src/components/ui`

**Dependencies:** Tasks 7–8

**Files likely touched:**
- `src/components/ui/form.jsx`
- `src/components/ui/carousel.jsx`
- `src/components/ui/image.jsx`
- `src/components/ui/responsive-image.jsx`
- `src/components/ui/sidebar.jsx`
- `src/components/ui/chart.jsx`

**Estimated scope:** Medium

---

## Task 10: Node files the widened check still sees

**Description:** `src/lib/*.test.js` cannot see `node:test` because `"types": []` blocks `@types/node`. `tiger-db.js` uses `process` and `postgres`. Reference Node types from those files only. Install the already-declared `postgres` package if the module still does not resolve. Do not add a dependency entry.

**Acceptance criteria:**
- [ ] Widened check over `src/**/*.js` and `src/**/*.jsx` exits 0
- [ ] `npm run typecheck` still exits 0 (these files stay outside that include)

**Verification:**
- [ ] Widened `tsc`
- [ ] `npm run typecheck`
- [ ] `node --test src/lib/*.test.js`

**Dependencies:** Task 5 (Vite reference must not be undone)

**Files likely touched:**
- `src/lib/applyLiveDrafts.test.js`
- `src/lib/realtimeStt.test.js`
- `src/lib/tiger-db.js`

**Estimated scope:** Small

---

## Checkpoint: Complete

- [ ] `npm run typecheck` exits 0
- [ ] `npx eslint .` exits 0
- [ ] Widened `tsc` over `src` exits 0
- [ ] `npm run build` exits 0
- [ ] `node --test server/test/*.test.js` and `node --test src/lib/*.test.js` pass
- [ ] Browser spot-check if a dev server is already running
