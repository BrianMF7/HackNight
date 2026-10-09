# Implementation Plan: Intake assistant (Zoom MVP)

## Overview

A clinician runs an adult mental health intake that must last at least 45 minutes. During the call, live speech becomes text and drafts land on the real blank PDFs she already uses. She opens those filled PDFs and confirms the information is right. Only then does **Send** email them to the therapist. Nothing is a diagnosis, and nothing is emailed, until that PDF review.

There is no `SPEC.md`. Requirements come from the idea note, this revision (fill existing PDFs, live STT, no Presage), and the form files listed under Source forms. The repo has no application code yet.

## Source forms

Inspected on disk for this plan:

| File | Role |
|---|---|
| `1_intake_questionnaire_adult.pdf` (PSY Family Services, 8 pages) | **Primary handoff PDF.** Presenting problem, duration, symptoms (incl. self-harm and harm-to-others), psych history, medical, family, social, substance, Holmes-Rahe |
| `patient-health-questionnaire.pdf` / `depression_patient_health_questionnaire.pdf` (PHQ-9) | **Second handoff PDF.** 9 depression items + difficulty. PHQ-9 reproduction is allowed per the form’s own notice |
| `APA_DSM-5-Contents.pdf` | Disorder **name index** for draft screen labels only. Criterion text stays out of the repo |
| `DSM-5.pdf` / `DSM 5 TR-APA (2022).pdf` | Clinician reference on the local machine. **Do not copy into git** |
| `briefintake_assessment.pdf` | HIV case-management intake. **Wrong domain — out of scope** |
| `Plan (1).pdf`, HackKnight slides | Prior plan export and event info, not product forms |

All four intake PDFs report `Form: none`. They are flat pages, not AcroForm fillables. “Update the PDF” means: start from a blank template copy, stamp confirmed values at mapped positions, write new PDF bytes. Do not invent a new layout with `pdfkit`.

Blank templates for the demo live under `templates/` (adult intake + PHQ-9). The PSY Family Services template is used under the team’s right to that file; do not republish it outside the hack if rights are unclear.

## Live speech vs Zoom

| Path | What it is | When |
|---|---|---|
| **ElevenLabs Speech-to-Text (Scribe)** | Live STT from the session audio the app captures | During the 45 minutes — this is how drafts appear before hang-up |
| **Zoom cloud recording transcript** | Post-meeting timeline via Cursor’s Zoom plugin (`get_recording_resource`, etc.) | After the call, or as a backup import. **Not** live STT |

Zoom is **not** already doing real-time speech-to-text. The Zoom plugin reads meeting search, assets, and cloud-recording transcripts after the recording exists. For “fill the form while she is still on the call,” ElevenLabs STT is the live path. Zoom stays as an optional second ingest of the same `{ speaker, text, startMs }` lines.

ElevenLabs does **not** read the next question aloud. Organizers confirmed live STT is enough; spoken audio out is not required.

## Send decision

Two steps, in order. Email is the second step only.

1. **Preview.** Stamp confirmed answers onto blank copies of the adult intake PDF and the PHQ-9 PDF and show them to her. This does not email anyone.
2. **Send.** After she has looked at those PDFs and marked “this information is right,” and the session has lasted at least 45:00, email those same bytes and download her copies.

Send does nothing when a required field is open, safety was waived, the therapist address is missing, she has not marked the PDF reviewed, or the session is under 45:00.

**Under 45:00.** If she tries to finish or send, a popup asks whether to throw out the PDF.

- **Throw out:** discard the preview bytes, clear the review flag, send nothing.
- **Keep:** leave the preview in place, send nothing, and let the session continue. Send stays locked until the clock reaches 45:00 and she reviews again if the drafts changed after her last review.

There is no maximum length. A session past 45:00 is still sendable once she has reviewed the PDF. A draft edit after review clears the review flag so she looks at the new PDF before send.

## Architecture Decisions

- **Human in the loop on the PDF.** Field drafts are not enough. She opens the stamped PDFs and sets `pdfReviewed` before send. Any later draft change clears that flag.
- **Minimum 45:00.** `elapsed < 45:00` is `under` (send blocked, throw-out popup). `elapsed >= 45:00` is `met`. The clock takes timestamps as arguments and does not call `Date.now()`.
- **Clinician confirms every required field.** Drafts carry quotes from the live (or imported) transcript. Safety items cannot be waived.
- **Fill the provided templates.** A field map ties question ids to page + coordinates (or overlay regions) on the adult intake and PHQ-9. `pdf-lib` draws text onto a copy of the blank file.
- **Live transcript is ElevenLabs STT.** Browser captures audio → STT → append lines → Gemini drafts → ground → update the review UI. Unit tests use recorded STT and Gemini fixtures; no live key required for CI.
- **Zoom is optional post-call / backup.** Same line shape as STT. The app does not call Zoom; a saved JSON fixture (or a manual Cursor plugin pull) is enough.
- **Node ESM and `node --test`.** Dependencies when a task needs them: `pdf-lib`, `nodemailer`, `pg`. Gemini and ElevenLabs via `fetch`. No Presage, no Convex, Netlify, or Render.
- **Synthetic data only in git.** Fixtures under `fixtures/synthetic/`. `sessions/`, `imports/`, `outbox/`, `.env`, and any local DSM PDF path are gitignored. The demo is not a HIPAA-covered deployment.
- **Required field set is the adult intake + PHQ-9**, not the old idea-note-only list. MVP required set (still one vertical slice, not every blank on all 8 pages): presenting problem, how long, why now; core symptom checks that map to PHQ-9 items 1–9; safety (SI ideation, attempt history, intent die-vs-sleep if stated); food/basics and social stressors when present in the transcript. Other adult-intake sections stay optional for later stamps.
- **PHQ-9 scores are drafts she confirms.** Severity bands on the form follow the PHQ-9 scoring note; the packet still says the clinician verifies. No DSM diagnosis code on the PDF.
- **DSM-5 / DSM-5-TR stay off the filled PDF.** Gemini may use the contents index (disorder names) for draft screen suggestions. Full manual text is not shipped and not pasted into answers.
- **Safety language is copied, not completed.** A means appears only as a quote the client said.
- **Minimum data to each vendor.** ElevenLabs receives audio (or a synthetic audio fixture in tests), not the blank PDF. Gemini receives the transcript lines and the question list. Tiger stores session metadata, PDF bytes, `sent_at`, and nudge times — not raw audio.

## Sponsors

| Sponsor | Role |
|---|---|
| ElevenLabs | Live speech-to-text during the intake (Scribe). Not TTS |
| Gemini | Drafts field values from the transcript; every quote must appear in the transcript |
| Tiger Data | Session row, filled PDF bytes, `sent_at`, nudge times |
| GoDaddy Registry | Register the demo domain by hand when there is a public URL. No registry code |

Left out on purpose:

- **Presage.** No value to filling and sending the intake PDFs; removed.
- **Solana.** Therapist needs the PDF in email, not a public ledger.
- **Snowflake.** Same job as Gemini (REST LLM) plus a second warehouse next to Tiger. Open question if a prize forces Cortex instead of Gemini.

## Dependency Graph

```
Blank templates + field map (adult intake, PHQ-9)
        │
        ├── Ground draft answers (quotes must be real lines)
        │       ├── Unanswered nudges (safety first)
        │       ├── PHQ-9 / screen draft flags
        │       └── Field confirm → stamp preview PDFs
        │               ├── She reviews the PDFs (pdfReviewed)
        │               ├── Under 45:00 → throw-out popup (discard or keep, never email)
        │               └── At or after 45:00 and pdfReviewed → email
        │                       └── Tiger row
        ├── 45:00 minimum clock
        ├── ElevenLabs STT → transcript lines
        │       └── Gemini draft → ground
        └── Zoom JSON (optional) → same lines
```

## Task List

### Phase 1: Forms and drafts

- [ ] Task 1: Templates, field map, synthetic session
- [ ] Task 2: Ground draft answers
- [ ] Task 3: Unanswered nudge list

### Checkpoint: After Tasks 1–3

- [ ] `node --test` passes
- [ ] Synthetic ramble yields grounded drafts tied to real form field ids, safety-first gaps
- [ ] Review with human before proceeding

### Phase 2: Confirm and stamp the provided PDFs

- [ ] Task 4: 45:00 minimum and throw-out choice
- [ ] Task 5: Clinician field confirm
- [ ] Task 6: Stamp preview PDFs
- [ ] Task 7: Review gate and send
- [ ] Task 8: Review page with PDF preview and throw-out popup

### Checkpoint: After Tasks 4–8

- [ ] `node --test` passes
- [ ] Under 45:00, throw-out discards the preview and emails nothing; keep leaves the preview and still emails nothing
- [ ] At or after 45:00, send emails only after she marks the PDF reviewed
- [ ] Review with human before proceeding

### Phase 3: Live speech and AI draft

- [ ] Task 9: ElevenLabs live speech-to-text
- [ ] Task 10: Gemini drafts
- [ ] Task 11: Zoom transcript normalizer (optional backup)

### Checkpoint: After Tasks 9–11

- [ ] `node --test` passes
- [ ] Recorded STT → grounded Gemini draft; invented quotes rejected; Zoom fixture uses the same line shape
- [ ] Review with human before proceeding

### Phase 4: Persist

- [ ] Task 12: Tiger Data stores the sent packet

### Checkpoint: Demo

- [ ] `node --test` passes
- [ ] Synthetic session: preview PDFs, throw-out popup under 45:00, send only after 45:00 and PDF review; Tiger row when `DATABASE_URL` is set
- [ ] Register demo domain with GoDaddy Registry when a public URL exists
- [ ] Human approves before any live client audio or real inbox is connected

## Demo script (synthetic only)

1. Open the review page with blank adult intake + PHQ-9 field list and a 45:00 timer. Therapist is `therapist@example.com`.
2. Load a synthetic STT transcript (ramble). Drafts appear only with quotes. Safety and PHQ-9 item 9 lead the nudge list when open.
3. With required fields filled, open the preview PDFs. Send stays disabled until she marks them reviewed.
4. At 30:00, choose **Throw out** → preview gone, no email. Repeat and choose **Keep** → preview remains, still no email.
5. At 45:00, mark the PDFs reviewed → Send downloads and emails both PDFs.
6. Change one draft after review → review flag clears and Send is blocked until she reviews the new PDF.
7. Optional: import synthetic Zoom resource → same lines, no second draft path.

## Risks and Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Stamps miss checkboxes / land wrong on the flat PDF | High | Field map with golden visual fixture; one manual open of the stamped PDF in Task 6 |
| Live mic captures a real client into a vendor | High | Synthetic audio in tests; live STT only with consent and synthetic/demo sessions until a BAA exists |
| PSY form or DSM text committed to a public repo | High | Templates used locally; DSM files stay outside git; only a field-id map and synthetic text are committed |
| Filled PDF read as a diagnosis | High | Confirmation line stamped on the packet; no diagnosis codes |
| Zoom transcript too late for hang-up send | Low for MVP | Live path is ElevenLabs STT; Zoom is backup |
| She sends a PDF she did not re-read after an edit | High | Draft change clears `pdfReviewed`; Send checks the flag |
| Session ends before 45:00 | High | Popup: throw out or keep. Neither path emails |
| SMTP or Tiger unset at demo | Med | Fake mailer + download still prove send; Tiger optional when `DATABASE_URL` is set |

## Open Questions

1. Confirm primary templates: adult intake + PHQ-9 (this plan). Drop the HIV brief intake — agreed?
2. Is the therapist address typed at session start?
3. Should Gemini use only the APA contents disorder names, or also a local path to DSM-5-TR that never leaves the machine?
4. If a Snowflake prize requires Cortex, replace Gemini as the single extractor?

## Out of scope

- Presage and any camera / vitals / emotion sensing
- ElevenLabs text-to-speech of questions
- Regenerating the intake as a new layout (pdfkit-from-scratch)
- HIV brief intake form
- Shipping DSM-5 / DSM-5-TR into the repo or onto the filled PDF as a diagnosis
- Solana, Snowflake (unless open question #4 flips)
- GoDaddy Registry API calls
- Therapist matching, other video vendors as live STT
- Production HIPAA
- Automatic emergency calls
- Emailing a PDF she has not opened and marked reviewed
- Sending before 45:00, including when she chooses Keep on the throw-out popup

## Definition of Done

Each task’s acceptance criteria sit on top of `.cursor/references/definition-of-done.md`. A task is done when its criteria pass and the Correctness and Quality bars in that file are met. Human review is required before the next phase.
