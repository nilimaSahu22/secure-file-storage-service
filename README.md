# Meridian — AI-Powered EHR Demo

A client-facing product demo/POC for an AI-assisted electronic health record system,
inspired by Greenway Health's Novare positioning. Built to show a unified patient chart,
AI-assisted charting and coding, and a revenue-cycle story — **not** a real EHR.

> **This is a demo environment. All patients, notes, and metrics are synthetic sample
> data.** No real patient information is used or stored. Nothing here is validated for
> real clinical use, billing, or coding decisions.

## Stack

- **Next.js 16 (App Router) + TypeScript** — Server Components for reads, Server Actions
  for mutations, Route Handlers for the three AI features and the admin reset endpoint
- **PostgreSQL + Prisma** — all patient/clinical/appointment data (see [Decisions](#why-a-real-database) below)
- **Tailwind CSS**, **Recharts** for the ROI dashboard chart, **lucide-react** for icons
- **Anthropic API** (`@anthropic-ai/sdk`) — Claude Haiku 4.5, called only from server-side
  route handlers

## Prerequisites

- Node.js 20+
- A PostgreSQL database (a free-tier hosted instance such as [Neon](https://neon.tech)
  is the easiest path — no local Postgres install needed)
- An Anthropic API key

## Setup

```bash
npm install
cp .env.example .env   # fill in DATABASE_URL, ANTHROPIC_API_KEY, ADMIN_RESET_TOKEN
npx prisma migrate deploy
npm run db:seed
npm run dev             # http://localhost:3000
```

### Environment variables

| Variable | Description |
| --- | --- |
| `DATABASE_URL` | PostgreSQL connection string |
| `ANTHROPIC_API_KEY` | Anthropic API key, used server-side only |
| `ANTHROPIC_MODEL` | Model ID for all three AI features (default `claude-haiku-4-5-20251001`) |
| `ADMIN_RESET_TOKEN` | Shared secret required to call `POST /api/admin/reset-demo` from outside the app (see below) |

## Resetting demo data before a client meeting

The app is served from a single hosted link and reused across separate client
meetings. **Reset the data before every meeting** so nobody sees state left over from a
prior session:

- **In-app**: log in, switch role to Admin, go to **Admin → Reset Demo Data**, confirm.
- **From a script** (e.g. a pre-meeting CI step): 

  ```bash
  curl -X POST https://your-deployment/api/admin/reset-demo \
    -H "x-admin-reset-token: $ADMIN_RESET_TOKEN"
  ```

Both paths truncate every table and re-run `prisma/fixtures.ts`, so the result is
identical either way.

## Architecture notes

### Cosmetic authentication

Register/Login on the landing page do not validate against anything real — submitting
either sets a mock session (`{name, role}`) in `localStorage` and routes into the app.
There is no password hashing and no persisted account, even though a real database
exists for clinical data. The role switcher in the dashboard topbar lets you view the
app as Doctor, Nurse, or Admin at any time.

### Why a real database

Mock JSON was the original plan, but two things ruled it out once the delivery model
was pinned down: the app is a single hosted link reused across separate client demos,
not something run fresh per session. Serverless API routes don't reliably share
in-process memory across invocations, so writes (AI-generated notes, tasks) could
silently fail to persist within one demo. And a long-lived in-memory process would let
one client's demo data bleed into the next client's session — a real risk in a sales
context. Postgres + Prisma, reset before each meeting, solves both.

### The three AI features

All three call `claude-haiku-4-5-20251001` (configurable via `ANTHROPIC_MODEL`) from
server-side route handlers only — the Anthropic client is never instantiated in client
code, and the API key never reaches the browser.

- **`POST /api/chart-summary`** — plain-text 3–4 sentence chart summary, triggered by
  "Summarize Chart" on a patient's Unified Chart View.
- **`POST /api/generate-note`** — structured-output SOAP note (via
  `output_config.format` / Zod schema, not free-text parsing), triggered by "Generate
  Note" on the Start Visit screen. Auto-generates 2–3 rule-based follow-up tasks on
  save.
- **`POST /api/suggest-codes`** — structured-output array of 2–3 ICD-10/CPT code
  suggestions with rationale, triggered by "Suggest Codes" on a saved note.

Every AI-generated artifact carries a visible **"AI Preview"** badge in the UI. No
screen implies AI output is validated for clinical or billing use.

### Clinical Decision Support

Rule-based, not AI: adding a medication checks it against the patient's documented
allergies (`lib/clinical/rules.ts`) and flags conflicts as a Clinical Alert; recording a
vital compares it against hardcoded normal ranges and flags abnormal values inline. Both
are illustrative rule sets for demo purposes, not a substitute for a real
drug-interaction database.

### Revenue Cycle / ROI Dashboard

All figures on `/dashboard/roi` are static, clearly labeled illustrative estimates — not
computed from this environment's data.

## Project structure

```
app/
  api/                      chart-summary, generate-note, suggest-codes, admin/reset-demo
  dashboard/                patient list, patient chart, tasks, appointments, ROI, admin
  login/ register/          cosmetic auth
lib/
  actions/                  Server Actions (mutations)
  services/                 Prisma-backed data accessors — the layer every route/page reads through
  ai/                       Anthropic client + chart-context builder
  clinical/rules.ts         drug-allergy conflict + vital-range rules
  auth/                     cosmetic session (localStorage + React context)
prisma/
  schema.prisma
  fixtures.ts               seed data — also what "Reset Demo Data" re-runs
  seed.ts                   thin runner for `npm run db:seed`
components/
  ui/                       shared primitives (Button, Input, Card, Badge, Modal, Select)
  chart/                    Unified Chart View and its sections
  dashboard/                shell, patient list, tasks, appointments
```

## Known limitations / scope cuts

Deliberately trimmed to keep the build focused on the sales-demo narrative:

- **Patient Portal** — cut entirely. Wrong audience for a clinician/admin-facing pitch.
- **Referrals** are a minimal create-and-list flow (no accept/complete workflow beyond
  status display).
- **Appointment scheduling** is a list-based book/reschedule/cancel flow, not a
  day/week calendar widget.
- **No real auth** — see [Cosmetic authentication](#cosmetic-authentication) above.
