# Deploy plan

Hackathon goal: a public HTTPS site tonight that behaves like localhost. Two hosts, one repo, no new code.

## Do this

**Vercel** serves the Vite page. **Render** runs the clinical server. Railway is the backup if Render’s signup or billing blocks the demo.

| Piece | Host | Why this one |
| --- | --- | --- |
| Vite page | Vercel | Connect the GitHub repo, framework Vite, deploy. Fastest static host. |
| Clinical server | Render Web Service, Starter (~$7) | One Node process that stays up. Free Render sleeps after 15 minutes and may restart at any time. |
| Sent PDF rows | Tiger, already in use | `DATABASE_URL` only. Do not add a database. |
| Domain | `mindscribe.health` and `www.mindscribe.health` | Point both at the Vercel project. The API stays on Render. |

Do not put the clinical server on Vercel. Sessions, transcripts, and focus answers live in a `Map` in `server/session.js`. Vercel functions start and stop, so the next request would not see the session. Railway and Fly.io can run the same Node process. They are a second account to learn. Use Railway only as the backup below.

The browser still calls ElevenLabs and Daily after the server mints a short-lived token. Those keys stay on Render. Base44 login is separate. A restart of the Render service still drops an in-progress session. Only a successful handoff is stored, and only when `DATABASE_URL` is set.

## 1. Render: the API

New Web Service from this GitHub repo. Instance type: Starter, not Free.

- Root directory: repo root
- Build command: `npm install`
- Start command: `node server/index.js`

Do not use `npm run server`. That script is `node --env-file=.env server/index.js`, and `.env` must not be deployed. The process already reads `process.env` and `PORT`. Render sets `PORT`.

Environment variables on the service:

- `BACKEND_TOKEN` — long random string
- `CORS_ORIGIN` — fill this in step 3, after Vercel has a URL
- `ELEVENLABS_API_KEY`
- `DAILY_API_KEY`
- `GEMINI_API_KEY`
- `ALLOW_PHI` — leave unset until a real transcript should reach Gemini
- `DATABASE_URL` — existing Tiger URL
- `SMTP_URL` and `SMTP_FROM` — only if a live inbox should receive the PDF

The service is already live at `https://hacknight-5os5.onrender.com`.

Check: `curl -H "Authorization: Bearer <BACKEND_TOKEN>" https://hacknight-5os5.onrender.com/api/ping` returns `{ "ok": true }`.

## 2. Vercel: the page

Import the same GitHub repo. Framework preset Vite. Build command `npm run build`. Output directory `dist`.

Set these in the Vercel project before the build. Vite bakes them into the browser bundle, so a later env change needs a redeploy:

- `VITE_BACKEND_URL` — `https://hacknight-5os5.onrender.com`, no trailing slash. A production build that omits this variable already uses that URL.
- `VITE_BACKEND_TOKEN` — the same string as `BACKEND_TOKEN`

Anyone who can open the site can read that token. That matches the connection dialog. It is not a patient login. Do not put ElevenLabs, Daily, Gemini, or the database URL in any `VITE_` variable.

## 3. Connect them

There is no frontend URL yet. After the page is deployed, copy that origin, including `https://` and with no path. On Render set:

`CORS_ORIGIN=https://mindscribe.health,https://www.mindscribe.health`

Redeploy the Render service so the new origin is loaded. `www` and the bare domain are different origins. The server allows both. A `*.vercel.app` preview is not the production site.

Open `https://mindscribe.health`. A production build defaults to live mode and `https://hacknight-5os5.onrender.com`. Save and test. Expect the ping to succeed.

Sign-in calls `https://base44.app`. In the Base44 builder, allow both `mindscribe.health` and `www.mindscribe.health`. Do not set `VITE_BASE44_APP_BASE_URL` to `https://app.base44.com`. That is the builder, and it rejects the deployed site.

## 4. Demo check

1. Start one live session and speak or commit one transcript line.
2. Refresh the page. The line should still be there, because the Node process is still up.
3. Do not restart the Render service during the demo. That wipes the session.
4. Leave `ALLOW_PHI` unset until someone has approved a real transcript.

## Backup: Railway for the API only

Use this only if Render cannot take a card before the demo. Keep the page on Vercel.

New Railway service from the same repo.

- Start command: `node server/index.js`
- Same environment variables as the Render list, including `CORS_ORIGIN` set to `https://mindscribe.health,https://www.mindscribe.health`

Railway’s free allowance is a small monthly credit, not a sleeping free dyno. If the credit runs out, the process stops and the session is gone. The Vercel env `VITE_BACKEND_URL` must be the Railway URL, then redeploy Vercel.

## Do not

- Commit `.env`.
- Use Render’s free sleeping web service during the judged demo.
- Point `VITE_BACKEND_URL` at `http://localhost:8787`.
- Add a new database. Tiger is already the sent-packet store.
