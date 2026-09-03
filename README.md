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
| `AUTH_SECRET` | NextAuth v5 JWT signing secret (generate with `openssl rand -base64 32` or similar) |
| `AUTH_URL` | Base URL NextAuth uses for callbacks (`http://localhost:3000` in dev) |
| `AWS_ACCESS_KEY_ID` | AWS access key with `s3:PutObject`/`s3:GetObject` on the target bucket |
| `AWS_SECRET_ACCESS_KEY` | AWS secret key |
| `AWS_REGION` | AWS region the S3 bucket lives in (e.g. `us-east-1`) |
| `AWS_S3_BUCKET` | S3 bucket used for Secure File Storage; needs CORS allowing `PUT`/`POST` from the app's origin |

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

### Authentication

Real credential-checked login (NextAuth v5 / Auth.js, Credentials provider, JWT
sessions, bcrypt-hashed passwords, no cosmetic session). `middleware.ts` gates
`/dashboard/*` to staff sessions and `/portal/*` to patient sessions. Registering on
`/register` creates a real `StaffUser` row with Doctor access.

**Demo credentials** (seeded by `prisma/fixtures.ts` / "Reset Demo Data" — password is
the same for every seeded account):

| Role | Email | Password |
| --- | --- | --- |
| Doctor | `elena.ramirez@meridian.health` | `Demo1234!` |
| Doctor | `marcus.chen@meridian.health` | `Demo1234!` |
| Nurse | `aisha.patel@meridian.health` | `Demo1234!` |
| Admin | `sam.reyes@meridian.health` | `Demo1234!` |
| Patient portal | `harold.bramwell@patientmail.example` | `Demo1234!` |

These credentials are intentionally not surfaced anywhere in the app UI.

### Why a real database

Mock JSON was the original plan, but two things ruled it out once the delivery model
was pinned down: the app is a single hosted link reused across separate client demos,
not something run fresh per session. Serverless API routes don't reliably share
in-process memory across invocations, so writes (AI-generated notes, tasks) could
silently fail to persist within one demo. And a long-lived in-memory process would let
one client's demo data bleed into the next client's session — a real risk in a sales
context. Postgres + Prisma, reset before each meeting, solves both.

### AI features

All AI calls run from server-side route handlers only — the Anthropic client is never
instantiated in client code, and the API key never reaches the browser. Most use
`ANTHROPIC_MODEL` (`claude-haiku-4-5-20251001`); document-heavy features use
`ANTHROPIC_DOC_MODEL` (same default, override with a stronger model).

- **`POST /api/chart-summary`** — plain-text chart summary ("Summarize Chart").
- **`POST /api/visits`** — structured-output SOAP note **and** a draft prescription
  from the visit transcript ("Generate Note" on Start Visit). Creates a DRAFT visit;
  `POST /api/visits/[id]/regenerate-note` re-runs it from the review screen.
- **`POST /api/visits/[id]/patient-summary`** — plain-language patient version of a
  signed visit, generated strictly from the finalized note + prescription.
- **`POST /api/files/[id]/check`** — reads an uploaded document (PDF/image) and returns
  type, date, identity match vs the account, legibility, findings, and extracted test
  results (drives the patient-upload intake check + extraction).
- **`POST /api/suggest-codes`** — 2–3 ICD-10/CPT code suggestions for a saved note.
- **`POST /api/patients/[id]/trend-flags`** — a short non-diagnostic narrative on top of
  deterministically detected vital/lab trends ("Check Trends").

AI-generated artifacts carry visible labels; no screen implies AI output is validated
for clinical or billing use.

### Visit record & prescriptions

Recording a visit creates a DRAFT `Visit` with a structured SOAP note and an editable
`Prescription` (items with dose/route/frequency/duration, investigations, advice,
follow-up date). The review screen (`/dashboard/patients/[id]/visit/[visitId]/review`)
edits both with live drug-allergy warnings (reusing `lib/clinical/rules.ts`).
**Sign & finalize** locks the visit (finalize-once, no amendments), copies prescription
items into `Medication` rows, renders a prescription PDF (`pdf-lib`, stored in S3), and
publishes a plain-language patient summary + a follow-up checklist to the portal.

### Clinical Decision Support

Rule-based, not AI: adding a medication checks it against the patient's documented
allergies (`lib/clinical/rules.ts`) and flags conflicts as a Clinical Alert; recording a
vital compares it against hardcoded normal ranges and flags abnormal values inline. Both
are illustrative rule sets for demo purposes, not a substitute for a real
drug-interaction database.

### Revenue Cycle / ROI Dashboard

All figures on `/dashboard/roi` are static, clearly labeled illustrative estimates — not
computed from this environment's data.

### Secure File Storage

Real AWS S3 (the user's own bucket — not a mock), via presigned POST uploads
(`lib/services/files.ts`, `app/api/files/*`): the browser uploads directly to S3, the
server never proxies file bytes. **Uploading is patient-portal only** — the clinician
Documents card is read-only. Each patient upload is staged as `PENDING`, run through
cheap integrity + duplicate checks, then one Claude pass (`POST /api/files/[id]/check`,
reading the file as a `document`/`image` block — no `pdf-parse`) that decides:
`ACCEPTED` (identity matches, readable), `BOUNCED` (wrong person / not medical — the
clinician never sees it), or `NEEDS_CLEARER_COPY`. Accepted documents have their text +
test results extracted in the same pass. Only `ACCEPTED` files feed the grounded chat.
Re-uploads create a new versioned `MedicalFile` row. Downloads go through a short-lived
presigned GET URL.

### Grounded AI Chat (chart + patient portal)

`lib/ai/groundedChat.ts` + `POST /api/chart-chat` — answers only from a patient's uploaded
document text, injected directly into the system prompt (no vector search at this scale).
It's instructed to decline plainly rather than fall back on general medical knowledge when
the documents don't cover a question, and to cite source filenames, which are matched back
to `MedicalFile` rows for the citation chips shown in the UI. Doctor-side and patient-side
conversations about the same patient are separate `ChatMessage` threads (`actorType`), each
only visible to their own side.

### Patient Portal

`/portal/*` — a separate, deliberately simpler surface for patients: upcoming
appointments, a **Visits** tab with a plain-language summary and downloadable
prescription PDF for each signed visit, grouped **reminders** (tests to complete,
results ready, visit prep — the `FollowUpItem` model), self-service document upload with
the AI intake check, and grounded chat about their own accepted documents. Its own login
(`/portal/login`); its `ChatMessage` thread never overlaps with the doctor-side
conversation.

### Predictive trend flags

`lib/clinical/trends.ts` detects rising/falling/fluctuating trends across a patient's
historical vitals and labs (illustrative, hardcoded thresholds — not clinically
validated). "Check Trends" on the chart computes them and adds a short non-diagnostic
AI narrative. Doctor-facing only, never shown in the portal, and explicitly labelled
"not a diagnosis or risk score".

### Departmental Workflows

`/dashboard/admin/workflows` lets Admins edit each department's intake steps, simple
"if X → priority Y" triage rules, and escalation path (`DepartmentWorkflow`, JSON columns —
intentionally not a full workflow engine). The same data drives the department preview on
the public landing page, so an edit here is visible there immediately.

### Audit Log

`lib/audit.ts` — a `logAudit()` helper called from every tracked mutation (login
success/failure, note created, file uploaded, codes suggested, prior auth submitted,
appointment requested/confirmed/declined).
Writes never throw — a failed audit write is logged to the server console rather than
breaking the action it's recording. Viewable, with filters, at
`/dashboard/admin/audit-log` (Admin only).

## Project structure

```
app/
  api/                      chart-summary, generate-note, suggest-codes, chart-chat,
                             files (+confirm, [id]/download), inquiries, admin/reset-demo, auth
  dashboard/                patient list, patient chart, tasks, appointments, ROI,
                             admin (reset, audit-log, workflows)
  portal/                   patient-facing surface — (app)/ is the auth-guarded group,
                             login/ is not
  login/ register/          real NextAuth credentials login/registration
lib/
  actions/                  Server Actions (mutations)
  services/                 Prisma-backed data accessors — the layer every route/page reads through
                             (files.ts, workflows.ts, portal.ts, auditLog.ts, inquiries.ts, …)
  ai/                       Anthropic client, chart-context builder, groundedChat.ts
  clinical/rules.ts         drug-allergy conflict + vital-range rules
  auth.ts                   NextAuth v5 config (Credentials provider, JWT sessions)
  audit.ts                  logAudit() — write side of the Audit Log
middleware.ts                staff/patient route gating
prisma/
  schema.prisma
  fixtures.ts               seed data — also what "Reset Demo Data" re-runs
  seed.ts                   thin runner for `npm run db:seed`
components/
  ui/                       shared primitives (Button, Input, Card, Badge, Modal, Select)
  landing/                  public landing page sections
  chart/                    Unified Chart View and its sections (incl. FilesSection, AiChatPanel)
  portal/                   patient portal shell
  dashboard/                shell, patient list, tasks, appointments, WorkflowEditor
```

## Known limitations / scope cuts

Deliberately trimmed to keep the build focused on the sales-demo narrative:

- **Patient Portal** is read-mostly: documents and grounded chat. Appointments are
  request-only — a patient submits a preferred date/time and provider, which lands as
  a `REQUESTED` appointment that staff confirms or declines from the dashboard; there's
  no direct self-service booking or patient-side rescheduling/cancellation.
- **Referrals** are a minimal create-and-list flow (no accept/complete workflow beyond
  status display).
- **Appointment scheduling** is a list-based book/reschedule/cancel flow, not a
  day/week calendar widget.
