# Filework — Secure File Storage Service

A secure file storage application that lets authenticated users upload, manage, and share
files. Files are private by default; owners can flip a file to public to generate a
shareable link. Uploads support files up to 500MB.

## Architecture

Two independent deployables:

```
backend/    Express + TypeScript REST API (auth, file metadata, S3 orchestration)
frontend/   React + TypeScript (Vite) single-page app
```

- **Auth**: stateless JWT — a short-lived access token is kept in memory on the client and
  sent as a `Bearer` header; a longer-lived refresh token lives in an `httpOnly`, `Secure`,
  `SameSite=Strict` cookie scoped to `/api/auth`. There is no refresh-token database table
  (an accepted simplification — see [Known limitations](#known-limitations)), so refreshing
  never rotates the cookie, it only issues a new access token.
- **Storage**: files are uploaded directly from the browser to AWS S3 using a presigned
  POST URL, so large uploads never pass through the Express server. The backend only ever
  handles file *metadata* (owner, name, size, visibility, share token) in PostgreSQL via
  Prisma.
- **Upload lifecycle**: `POST /api/files` creates a `PENDING` row and returns a presigned
  POST; the browser uploads straight to S3; `PATCH /api/files/:id/confirm` verifies the
  object actually landed (via `HeadObject`, comparing size) before flipping the row to
  `COMPLETED`. Only `COMPLETED` files are ever listed or shared.

## Prerequisites

- Node.js 20+ (developed against Node 24)
- A PostgreSQL database (local or hosted)
- An AWS account with an S3 bucket and an IAM user/role scoped to that bucket

## AWS S3 setup

1. **Create a bucket** (any region). Block public access can stay fully enabled — all
   reads/writes go through presigned URLs, the bucket itself is never public.
2. **Create a least-privilege IAM user** (or role) with a policy scoped to just this
   bucket:

   ```json
   {
     "Version": "2012-10-17",
     "Statement": [
       {
         "Effect": "Allow",
         "Action": ["s3:PutObject", "s3:GetObject", "s3:HeadObject", "s3:DeleteObject"],
         "Resource": "arn:aws:s3:::YOUR_BUCKET_NAME/*"
       }
     ]
   }
   ```

3. **Configure CORS on the bucket** so the browser can POST directly to it from the
   frontend origin (this is separate from the Express `cors()` middleware — without this,
   uploads fail with a browser CORS error, not a server error):

   ```json
   [
     {
       "AllowedHeaders": ["*"],
       "AllowedMethods": ["POST", "GET", "HEAD"],
       "AllowedOrigins": ["http://localhost:5173"],
       "ExposeHeaders": ["ETag"]
     }
   ]
   ```

   Add your deployed frontend origin to `AllowedOrigins` as well when you deploy.

## Backend setup

```bash
cd backend
npm install
cp .env.example .env   # then fill in real values, see table below
npx prisma migrate dev # applies prisma/migrations against your database
npm run dev             # http://localhost:4000
```

### Backend environment variables

| Variable                | Description                                              |
| ------------------------ | --------------------------------------------------------- |
| `PORT`                  | Port the API listens on (default `4000`)                 |
| `FRONTEND_URL`          | Origin allowed by CORS, e.g. `http://localhost:5173`      |
| `DATABASE_URL`          | PostgreSQL connection string                              |
| `JWT_ACCESS_SECRET`     | Secret for signing access tokens (15m expiry)             |
| `JWT_REFRESH_SECRET`    | Secret for signing refresh tokens (7d expiry)              |
| `AWS_ACCESS_KEY_ID`     | IAM user access key, scoped to the bucket above            |
| `AWS_SECRET_ACCESS_KEY` | IAM user secret key                                        |
| `AWS_REGION`            | Region the bucket lives in, e.g. `us-east-1`                |
| `AWS_S3_BUCKET`         | Bucket name                                                 |

## Frontend setup

```bash
cd frontend
npm install
cp .env.example .env   # points VITE_API_URL at the backend
npm run dev             # http://localhost:5173
```

### Frontend environment variables

| Variable        | Description                          |
| ---------------- | -------------------------------------- |
| `VITE_API_URL`  | Base URL of the backend API             |

## Running both together

Start the backend and frontend dev servers in separate terminals as shown above; the
frontend proxies API calls to `VITE_API_URL` and relies on the backend's CORS
configuration (`FRONTEND_URL`) to allow cookie-bearing requests.

## Security

- Passwords hashed with bcrypt (cost factor 12); never stored or logged in plaintext.
- `/register` and `/login` are rate-limited to 10 requests / 15 minutes / IP.
- Access tokens are held in memory only on the client (never `localStorage` or
  `sessionStorage`); the refresh token is an `httpOnly` cookie, unreadable from JS.
- Every file-scoped route runs an `ownsFile` check (404 if the file doesn't exist, 403 if
  it belongs to someone else) before any read/write/delete.
- The public share endpoint (`GET /api/share/:token`) returns an identical 404 response
  whether the token doesn't exist or the file has been set back to private — this prevents
  distinguishing "wrong token" from "valid token, now private."
- Upload size is enforced at three layers: client-side pre-check, a Zod schema on
  `POST /api/files`, and S3's own `content-length-range` POST policy condition (the
  authoritative, un-bypassable enforcement point since the browser talks to S3 directly).
- `helmet()` for standard security headers; CORS locked to `FRONTEND_URL` with
  `credentials: true`.
- All request bodies validated with Zod before touching business logic.
- Centralized error handler never leaks stack traces or internal error details to clients.

### Known limitations

- **No server-side refresh-token revocation.** Since there's no refresh-token table,
  logging out clears the cookie client-side but a stolen refresh token remains valid until
  its natural 7-day expiry. A production system would track refresh tokens (or their
  hashes) server-side to support revocation.

## Future scope

Deliberately left out of this build to keep scope focused on the core flows:

- **Trash / soft delete** — move deleted files to a recoverable trash instead of hard
  deleting, with restore and permanent-delete actions.
- **Activity / audit log** — a record of uploads, visibility changes, downloads, and
  deletes per user.
- **Server-side refresh-token revocation** — see [Known limitations](#known-limitations).
