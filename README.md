# MindScribe

More human care. Less paperwork.

MindScribe is an AI-assisted mental health intake workspace. It turns a live conversation into a structured questionnaire the clinician still has to review. Speech becomes text, relevant answers are proposed from that text, and nothing is sent until a person confirms it.

**Try it:** [www.mindscribe.health](https://www.mindscribe.health)

Built for Hack Knight Fall 2026 by Brian Martinez Flores, Joshua Peguero, Lauren Rodriguez, and Tomas Santos Yciano.

## The problem

An intake asks a clinician to listen, take notes, and complete a structured form at the same time. Details get lost when attention splits between the person in the room and the paperwork that has to follow them out of it.

## What it does

Transcribe, structure, confirm, hand off.

1. **Transcribe.** ElevenLabs Scribe turns speech into reviewable lines. Daily hosts the video room. The patient opens a link, knocks, and the clinician admits them.
2. **Structure.** Google Gemini proposes answers only where a quote from the transcript supports them. Silence is not stored as "no." Invented quotes are dropped.
3. **Confirm.** The clinician edits or confirms each field. A draft is not a final answer. Safety questions cannot be waived.
4. **Hand off.** The server, not the browser, checks a 45-minute minimum, required confirmations, unresolved safety items, and a real recipient. A refused send writes nothing. An allowed send builds a PDF with pdf-lib, emails it once with Nodemailer, and can store that packet in Tiger Data.

Diagnostic suggestions, when shown, are hypotheses with evidence and gaps. They are not a final diagnosis, and no diagnosis code is written onto the form. MindScribe does not contact emergency services.

## What we will not claim

This is an evaluation demo. It is not a HIPAA-compliant clinical system, and it is not authorized for real patient records. A clinic would still need a business associate agreement, access control, audit logs, and a breach process this build does not have.

A non-synthetic transcript is refused before it reaches Gemini unless the server is explicitly switched on for that processing. API keys for ElevenLabs, Daily, and Gemini stay on the server. The browser only receives short-lived tokens.

## Stack

| Piece | Choice |
| --- | --- |
| Clinician workspace | React, Vite, Base44 |
| Clinical server | Node.js |
| Video | Daily |
| Speech to text | ElevenLabs Scribe |
| Drafts | Google Gemini |
| PDF and email | pdf-lib, Nodemailer |
| Sent packets | Tiger Data / PostgreSQL, only after an authorized handoff |
| Site | [www.mindscribe.health](https://www.mindscribe.health) on Vercel. The API is a long-running Node process on Render, because session state lives in memory and would not survive a serverless restart. |

## Run it locally

```bash
npm install
cp .env.example .env
npm install -g base44@latest
base44 login    # once per machine
base44 link     # once per clone
base44 dev      # frontend and Base44 together
```

In a second terminal, start the clinical server:

```bash
npm run server
```

Open the URL `base44 dev` prints, usually `http://localhost:5173`. Fill `.env` from `.env.example`. Never commit `.env`.

`base44 link` writes `base44/.app.jsonc`, which is gitignored, so every fresh clone needs it. Do not run `npm run dev` beside `base44 dev`. That starts a second Vite with no Base44 proxy. `base44 dev --remote` edits the frontend against the hosted Base44 app and writes production data.

The clinical server reads `process.env`. `npm run server` loads `.env` for local work. On Render the start command is `node server/index.js`, and the host injects the variables.

## Tests

```bash
node --test server/test/*.test.js src/lib/*.test.js
npm run typecheck
npm run lint
npm run build
```

The handoff tests check that a forged clock or forged confirmation cannot send, and that a second send does not email twice.

## Team

- Brian Martinez Flores, B.S. Computer Science
- Joshua Peguero, B.S. Computer Science
- Lauren Rodriguez, M.S. AI & Data Science
- Tomas Santos Yciano, M.S. AI & Data Science

## What's next

More questionnaires, stronger transcript-to-question mapping, and session storage that survives a server restart. Privacy, audit, and clinical validation come before any real deployment.

## License

Private hackathon project. All rights reserved by the team.
