# ShortcutVid

Production-oriented SaaS scaffold for AI short-form video generation: idea → script → scenes → voiceover → subtitles → Remotion MP4, with PostgreSQL persistence and BullMQ background workers.

## Phase status

| Phase | Scope | Status |
| --- | --- | --- |
| **1 — MVP** | Auth, projects, script generation, asset/voice pipeline, Remotion render, preview/download, job progress | **Implemented** |
| 2 — SaaS | Stripe, credit ledger hardening, Docker deploy polish | Planned |
| 3 — Social | YouTube / Instagram / LinkedIn OAuth + publishing + scheduling | Planned |
| 4 — Advanced AI | Animated subtitles, music, generative video providers | Planned |
| 5 — Production | Observability, load testing, ops runbooks | Planned |

## Stack

- **Web:** Next.js 15 App Router, TypeScript, Tailwind, shadcn-style UI
- **Auth:** Auth.js (NextAuth v5) + Prisma adapter, credentials provider
- **DB:** PostgreSQL + Prisma
- **Queue:** Redis + BullMQ (`worker/` process)
- **AI / media:** OpenAI (script + TTS + optional Whisper alignment), Pexels stock video
- **Render:** Remotion + FFmpeg (worker)

## Repository layout

```text
src/                 Next.js app, API routes, domain services
prisma/              Schema + migrations
remotion/            Remotion compositions (VideoComposition, subtitles, scenes)
worker/              BullMQ consumer + pipeline + Remotion render
docker-compose.yml   Postgres, Redis, MinIO, web, worker
```

## Prerequisites

- Node.js 20+
- Docker (recommended for Postgres/Redis/MinIO)
- FFmpeg + Chromium (worker render) — included in Dockerfile
- API keys: `OPENAI_API_KEY`, `PEXELS_API_KEY` for full Phase 1 runs

## Quick start (local)

1. Copy environment file:

```bash
cp .env.example .env
```

2. Start infrastructure:

```bash
docker compose up -d postgres redis minio minio-init
```

3. Install and migrate:

```bash
npm install
npx prisma migrate dev --name init
```

4. Run web + worker in separate terminals:

```bash
npm run dev
npm run worker
```

5. Open [http://localhost:3000](http://localhost:3000), register, create a project, generate/approve script, then **Generate video**.

## Environment variables

See [`.env.example`](.env.example). Required for Phase 1:

- `DATABASE_URL`, `DIRECT_URL`
- `REDIS_URL`
- `AUTH_SECRET`
- `OPENAI_API_KEY`
- `PEXELS_API_KEY`

Optional:

- S3/MinIO settings (defaults work with docker MinIO)
- `LOCAL_STORAGE_PATH` when S3 is not configured (dev fallback)

Social and Stripe variables are documented for later phases and are not required for MVP.

## API (Phase 1)

| Method | Path | Description |
| --- | --- | --- |
| POST | `/api/auth/register` | Email/password signup |
| GET/POST | `/api/auth/[...nextauth]` | Auth.js session |
| GET/POST | `/api/projects` | List/create projects |
| GET/PATCH/DELETE | `/api/projects/:id` | Project CRUD |
| POST | `/api/projects/:id/generate-script` | LLM scene manifest |
| POST | `/api/projects/:id/approve-script` | Persist approved manifest + scenes |
| POST | `/api/projects/:id/generate-video` | Enqueue pipeline job |
| GET | `/api/projects/:id/download` | Signed/local download URL |
| GET | `/api/jobs/:id` | Job status/progress |
| POST | `/api/jobs/:id/retry` | Retry failed job |
| POST | `/api/jobs/:id/cancel` | Cancel queued job |
| GET | `/api/health` | Health check |

## Tests

```bash
npm test
```

Unit tests cover script manifest validation, scene timing, and credit balance helpers. Integration tests with Postgres/Redis can be added in Phase 2.

## Docker production-style run

```bash
docker compose up --build
```

Ensure `.env` is populated and migrations have been applied (`npx prisma migrate deploy` in CI/CD).

## Known limitations (Phase 1)

- Social OAuth/publishing UI is not wired; schema includes `SocialAccount` / `ScheduledPost` for Phase 3.
- Stripe billing endpoints are not implemented; free tier credits are stored on `User`.
- Remotion rendering runs in the worker process (not Lambda); requires FFmpeg/Chromium on the worker host.
- Without valid OpenAI/Pexels keys, script generation and stock footage steps fail with explicit errors (no fake success responses).
- Instagram/LinkedIn/YouTube publishing requires platform developer approval — not claimed here.

## Next recommended phase

**Phase 2 — SaaS foundations:** Stripe Checkout + webhooks, credit reservation hardening, usage dashboard, improved retries/DLQ, secure signed storage-only downloads, and deployment hardening.
