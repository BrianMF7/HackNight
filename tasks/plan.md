# Implementation Plan: Clinical intake platform (web + Zoom MVP)

## Overview

An intake clinician runs an adult mental-health appointment that must last at least 45:00. A Next.js workspace shows a labeled synthetic patient beside the fixed 8-page Adult Intake Questionnaire. Synthetic transcript events become evidence-grounded drafts. She confirms every required field, including safety. **Confirm and send** then stamps one PDF from that master template, downloads it, and emails the same bytes. Disconnecting can keep or discard the draft. Neither choice sends.

This revision follows `Updated_Clinical_Intake_Implementation_Plan.pdf` (10/9/2026) and keeps the decisions already inspected in this repo. There is no `SPEC.md`. The repo still has no application code. This is a synthetic-data hackathon demo, not a HIPAA deployment.

## Source forms

| File | Role |
|---|---|
| `1_intake_questionnaire_adult.pdf` (PSY Family Services, 8 pages) | **The handoff PDF.** Flat pages (`Form: none`). Stamp this file. Do not redraw it |
| `patient-health-questionnaire.pdf` / `depression_patient_health_questionnaire.pdf` (PHQ-9) | Screening instrument. Flags on the review screen only. Not a second emailed PDF |
| `APA_DSM-5-Contents.pdf` | Disorder **names** for draft labels only. No criterion text in git |
| `DSM-5.pdf` / `DSM 5 TR-APA (2022).pdf` | Local reference. **Do not copy into git** |
| `briefintake_assessment.pdf` | HIV case-management intake. **Wrong domain — out of scope** |
| Updated plan PDF, HackKnight slides | Planning inputs, not product forms |

The PSY template is used under the team’s right to that file. Do not republish it outside the hack if rights are unclear.

## What changed from the previous plan

- **Frontend:** Base44 is not the app. Next.js in this repo is. See the comparison below.
- **One emailed PDF:** the adult intake. PHQ-9 is no longer a second attachment.
- **Transcript:** synthetic event playback during the session, plus an optional Zoom JSON file. ElevenLabs is not the live speech-to-text path.
- **ElevenLabs:** speaks the next unanswered question. Prompt text only. No transcript is sent.
- **Disconnect:** Keep draft or Discard draft. Discard asks for confirmation. Neither emails.
- **Presage:** a simulated focus-drop highlights that same next question. No camera frames are stored. No Presage SDK.
- **Still true:** quotes must be real transcript lines, safety cannot be waived, send is one action, Tiger stores the sent packet not the raw transcript, no DSM criteria, no diagnosis code on the PDF.

## 45:00 gate

The updated PDF says it retains the existing 45:00 send gate, and it also says an **expired** clock blocks send. Those are opposite rules. This plan keeps the rule already written here:

- `elapsed < 45:00` is `under`. Send is blocked.
- `elapsed >= 45:00` is `met`. Send is allowed only after she has confirmed every required field and the therapist address.
- The clock takes timestamps as arguments and does not call `Date.now()`.

The expiration reading (send banned after 45:00) is open question 2. Tasks do not implement it.

## Base44 vs Next.js

Base44’s site hosting serves a static single-page app (their generated apps are Vite + React). Their backend is a separate Mongo-compatible database, auth, and file store. Server-side rendering is not supported on that hosting.

| | Base44 | Next.js in this repo |
|---|---|---|
| Where the UI lives | Base44 project / sandbox, plus this git repo for the clinical core | This repo, on the same branches as the backend |
| Clinical rules | Easy to duplicate in the hosted app and bypass the Node gate | Pages call `src/` modules. One implementation |
| Database | Their store is the default. The PDF forbids a second clinical database next to Tiger | Tiger stays the only store, and only after send |
| Tests | UI path is not `node --test` | Clinical modules stay `node --test`. Pages render those modules |
| Four people | Two sources of truth. Merge conflicts move outside git | One branch per task, rebase on `main` |
| Demo | Depends on Base44 being up and on an API contract that is still an open question in the PDF | `next dev` and the clinical tests on one machine |

**Decision:** Next.js is the better option. Use it for the public page, the launch into a labeled demo session, the split workspace, and the review screen. Do not add the Base44 SDK, CLI, database, or auth. Sign-in is a **Launch platform** button into a synthetic clinician session, not a real account system.

Clinical code stays plain Node ESM under `src/` so `node --test` does not need Next. Next route handlers and pages import those modules. Do not reimplement grounding, the clock, or send inside React components.

## Send decision

1. During the appointment, map supported statements to stable field ids. Show the draft, the quote, and what is still open. Silence is not a denial.
2. If she ends early or the patient disconnects: **Keep draft** (incomplete, unsent) or **Discard draft** (confirmation required, draft cleared, unsent).
3. At or after 45:00 she reviews the full form, confirms each required field, and checks the therapist address.
4. **Confirm and send** renders the final PDF from the master template, downloads those bytes, and emails the same bytes once. A second send of the same packet does not send a second email.

Send does nothing when a required field is open, safety was waived, the therapist address is missing, she has not confirmed the form, or the session is under 45:00.

A draft edit after confirm clears confirmation, so she reviews the new values before send.

## Architecture decisions

- **Next.js for screens. Node modules for rules.** `src/intake`, `src/session`, `src/handoff`, `src/draft`, `src/zoom`, `src/speech`, `src/store`.
- **Stamp the master PDF.** `pdf-lib` draws confirmed values onto a copy of `templates/adult-intake.pdf`. Do not redraw the form with `pdfkit`. The PDF’s “PDFKit” line loses to the inspected fact that these files are flat scans/pages, and to the risk that a redraw changes the form between clients.
- **Mock playback is the demo transcript.** A typed event list in `fixtures/synthetic/` drives the workspace. No live microphone on the critical path.
- **Zoom is a file import.** Same `{ speaker, text, startMs }` lines. No Zoom app package. The download control says the companion is not available.
- **Gemini** receives transcript lines and the question list. Invented quotes fail `ground` and fill nothing.
- **ElevenLabs** receives the next question’s prompt text only.
- **Tiger** stores case id, therapist, PDF bytes, `sent_at`, and nudge times. No raw audio and no full transcript. Missing `DATABASE_URL` skips the insert; download and email already succeeded.
- **Synthetic data only in git.** `sessions/`, `imports/`, `outbox/`, `.env`, and local DSM paths are gitignored.

## Sponsors

| Sponsor | Role |
|---|---|
| Gemini | Draft field values from transcript lines. Every quote must appear in the transcript |
| Tiger Data | Session row, final PDF bytes, `sent_at`, nudge times |
| ElevenLabs | Speak the next unanswered question. Prompt text only |
| Presage | Not integrated. A simulated focus-drop highlights that same question |
| Zoom | Optional JSON import of a cloud-recording transcript. Not live audio |
| GoDaddy Registry | Register the demo domain by hand when a public URL exists. No registry code |
| Next.js | Site and workspace. Not a second clinical backend |

Left out on purpose: Base44, live ElevenLabs speech-to-text, Presage SDK and camera capture, the HIV brief intake, a second emailed PHQ-9, `pdfkit` redraws, Solana, Snowflake, production HIPAA, real WebRTC, a published Zoom app.

## Dependency graph

```
Adult intake template + field ids + synthetic transcript
        │
        ├── Ground drafts
        │       ├── Safety-first nudge queue
        │       │       ├── ElevenLabs prompt (text only)
        │       │       └── Simulated focus-drop (same question)
        │       ├── Gemini drafts
        │       └── Zoom JSON → same lines
        ├── 45:00 minimum clock
        ├── Confirm each required field
        │       ├── Disconnect keep / discard (never email)
        │       └── Stamp the master PDF
        │               └── Confirm and send (download + one email)
        │                       └── Tiger row
        └── Next.js shell (launch demo)
                └── Split workspace playback
                        └── Review screen wired to send
```

After Task 1 is on `main`, these can proceed on separate branches: grounding (Tasks 2–3), the clock (Task 4), the Zoom normalizer (Task 13, after Task 2), and the Next.js shell (Task 9). Do not share `package.json` edits across open branches. Rebase after each merge.

## Task list

### Phase 1: Form and drafts

- [ ] Task 1: Master template, field ids, synthetic session
- [ ] Task 2: Ground draft answers
- [ ] Task 3: Safety-first nudge queue

### Checkpoint: After Tasks 1–3

- [ ] `node --test` passes
- [ ] Synthetic ramble fills only ids that exist on the adult intake; unknown quotes throw; safety gaps sort first
- [ ] Human review before the next phase

### Phase 2: Clock, confirm, disconnect

- [ ] Task 4: 45:00 minimum clock
- [ ] Task 5: Confirm required fields
- [ ] Task 6: Disconnect keep or discard

### Checkpoint: After Tasks 4–6

- [ ] `node --test` passes
- [ ] Under 45:00, keep and discard both email nothing
- [ ] Waived safety or an open required field produces no packet
- [ ] Human review before the next phase

### Phase 3: One PDF and send

- [ ] Task 7: Stamp the master PDF
- [ ] Task 8: Confirm and send

### Checkpoint: After Tasks 7–8

- [ ] `node --test` passes
- [ ] Send emails one PDF only at or after 45:00, and a repeat send does not email twice
- [ ] Under 45:00, open safety, or a missing address produces no PDF email
- [ ] Human review before the next phase

### Phase 4: Next.js workspace

- [ ] Task 9: Public page and demo launch
- [ ] Task 10: Split workspace playback
- [ ] Task 11: Review, confirm, disconnect, send

### Checkpoint: After Tasks 9–11

- [ ] `node --test` passes and `npx next build` succeeds
- [ ] Synthetic playback updates fields and does not change the template
- [ ] Disconnect never sends; Confirm and send follows the Task 8 gate
- [ ] Human review before the next phase

### Phase 5: Speech, Zoom, Tiger

- [ ] Task 12: Gemini drafts
- [ ] Task 13: Zoom transcript file
- [ ] Task 14: ElevenLabs next-question audio
- [ ] Task 15: Simulated focus-drop
- [ ] Task 16: Tiger stores the sent packet

### Checkpoint: Demo

- [ ] `node --test` passes
- [ ] Synthetic demo: playback, safety nudge, keep/discard, send one PDF at or after 45:00, no second email
- [ ] Tiger row only when `DATABASE_URL` is set
- [ ] Zoom companion control says it is not available
- [ ] GoDaddy domain only after a public URL exists
- [ ] Human approval before any live microphone, camera, or real inbox

## Demo script (synthetic only)

1. Open the public page. **Launch platform** enters a labeled demo clinician session. Therapist is `therapist@example.com`.
2. Split screen: synthetic patient video/chat on the left, the adult intake fields on the right, timer running toward 45:00.
3. Play the synthetic transcript. A matched line becomes a draft with its quote. The template layout does not change.
4. Leave a safety item unanswered. It leads the nudge list.
5. Disconnect. **Keep** leaves an incomplete unsent draft. **Discard** asks, then clears it. No email either way.
6. Confirm and send while safety is open, or while the clock is under 45:00. No PDF email.
7. At or after 45:00, confirm every required field and the recipient.
8. Confirm and send once. The same PDF downloads and the fake mailer records one message. Tiger writes a row if configured.
9. Send again. No second email.
10. Zoom companion and real calling stay labeled unavailable.

## Risks and mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| Stamps miss the blanks on the flat PDF | High | Field map plus one manual open of the stamped file in Task 7 |
| Team implements “expired clock blocks send” | High | Task 4 tests `44:59` as `under` and `45:00` as `met` |
| Base44 or a second database stores drafts | High | Next.js calls `src/`. Tiger runs only after a successful send |
| Draft mistaken for a confirmed fact | High | Quote on screen, per-field confirm, no diagnosis code |
| PHQ-9 or DSM text committed or emailed | High | PHQ-9 is flags only. DSM files stay outside git |
| Disconnect sends a packet | High | Task 6 tests both choices with zero mailer calls |
| ElevenLabs receives the transcript | Med | Request body is the prompt string only |
| SMTP or Tiger unset at the demo | Med | Fake mailer and download still prove send |

## Open questions

1. Adult intake is the only emailed form. PHQ-9 stays on-screen screening. Confirm.
2. Should send instead be banned **after** 45:00? This plan does not do that. Say so if the expiration reading is the one you want.
3. How long may a kept incomplete draft live, and who may discard it later? MVP: it lives in the session until she discards it or the process restarts.
4. Is `therapist@example.com` typed each session or fixed for the demo? Tasks use the fixture address.
5. Is a Zoom JSON import enough for judging, or is an installable Zoom app required? Tasks implement the import only.
6. Is a labeled synthetic video enough? Tasks do not add WebRTC.
7. Are redistribution rights confirmed for the PSY adult intake and any PHQ-9 text shown on screen?
8. If a sponsor booth requires Base44 on screen, use it as a marketing shell only. Do not point it at a Base44 database.

## Out of scope

- Base44 SDK, database, auth, and hosting
- Production HIPAA, BAAs, real PHI, live clinical use
- Diagnosis codes, DSM-5 / DSM-5-TR criterion text, emergency calls
- HIV brief intake, second emailed PHQ-9, `pdfkit` form redraw
- Live microphone speech-to-text, Presage camera capture, ElevenLabs reading the transcript
- Real two-party video, a published Zoom app, GoDaddy API
- Solana, Snowflake, sending before 45:00, a second email for the same packet

## Definition of done

Each task’s acceptance criteria sit on top of `.cursor/references/definition-of-done.md`. A task is done when its criteria pass and the Correctness and Quality bars in that file are met. Human review is required before the next phase.
