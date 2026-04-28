# Mini LMS — Full-Stack Learning Management System

A production-grade Mini Learning Management System where learners read articles, take per-article assignments (MCQ + short answer), receive AI feedback through OpenRouter (any LLM in its catalog), track their performance on a personal dashboard, and compete on a real-time leaderboard.

> **Tech stack:** React 18 + Vite + TypeScript + TailwindCSS · Node.js + **Express** + TypeScript · MongoDB via Prisma · **OpenRouter** (OpenAI-compatible chat completions, model selectable per env var) · Socket.io for live updates · Recharts for data visualisation.

---

## Architecture

```
gracious-heyrovsky-cd1a66/
├── backend/                  # Node.js + Express + Prisma + Socket.io
│   ├── prisma/
│   │   ├── schema.prisma     # Models, composite types, enums (single source of truth)
│   │   └── seed.ts           # Idempotent demo data
│   └── src/
│       ├── server.ts         # http + socket.io bootstrap
│       ├── app.ts            # Express middleware stack
│       ├── config/           # env (zod-validated), prisma singleton, pino logger
│       ├── routes/           # auth, articles, assignments, submissions, leaderboard, dashboard, ai
│       ├── controllers/      # thin HTTP layer
│       ├── services/         # business logic + Mongo aggregation pipelines
│       ├── middleware/       # auth, role, validate, rateLimit, error, notFound
│       ├── validators/       # zod schemas
│       ├── utils/            # ApiError, asyncHandler, jwt, slugify, ai-prompts
│       └── sockets/          # JWT-authenticated socket.io with leaderboard:updated
└── frontend/                 # React + Vite + TS + Tailwind
    └── src/
        ├── main.tsx          # ErrorBoundary + providers (Auth, Toast, Query)
        ├── App.tsx           # Route table (protected + admin routes)
        ├── pages/            # LoginPage, SignupPage, DashboardPage, ArticleListPage,
        │                     # ArticleDetailPage, LeaderboardPage, ProfilePage, ChatPage,
        │                     # NotFoundPage, admin/{Layout,Dashboard,Articles,ArticleEdit,
        │                     # AssignmentEdit,Users}
        ├── components/
        │   ├── ui/           # Button, Input, Textarea, Modal, Spinner, Skeleton, Badge, Tag, EmptyState
        │   ├── layout/       # Navbar, AppShell (responsive, mobile menu)
        │   ├── articles/     # ArticleCard, TagFilter, MarkdownView, ReadingProgressBar
        │   ├── assignments/  # AssignmentForm, ResultPanel, HintButton
        │   ├── dashboard/    # StatCard, ScoreOverTimeChart, TagBreakdownChart, RecentActivity
        │   ├── leaderboard/  # LeaderboardTable, RankBadge
        │   ├── ai/           # SummaryButton (article summary)
        │   ├── ErrorBoundary.tsx
        │   ├── ProtectedRoute.tsx
        │   └── AdminRoute.tsx
        ├── hooks/            # useReadingProgress, useLeaderboard (live socket)
        ├── context/          # AuthContext, ToastContext
        ├── lib/              # api (axios + interceptors), socket, queryClient, format
        ├── types/api.ts      # Shared API types
        └── utils/            # cn, storage
```

### Design highlights

- **Layered backend:** routes → controllers → services → Prisma. Cross-cutting concerns (auth, role, validate, error, rate-limit) live in dedicated middleware. Centralised error handler maps `ZodError`, `Prisma.PrismaClientKnownRequestError`, and `ApiError` to consistent JSON shape.
- **Prisma + MongoDB:** typed Prisma Client for everything except aggregation pipelines, which use `prisma.<model>.aggregateRaw({ pipeline })` for the leaderboard, dashboard charts, and per-tag analytics. Embedded sub-documents (questions, answers) use Prisma **composite types**.
- **Express stack:** `cors`, `compression`, JSON limit, request-id, structured `pino` logging, role-aware rate limiting on `/auth` and `/ai`.
- **Socket.io with JWT handshake:** the leaderboard page subscribes to `leaderboard:updated` and refreshes in real time after any submission anywhere on the platform.
- **AI integration is real, not decorative.** The AI service ([backend/src/services/ai.service.ts](backend/src/services/ai.service.ts)) calls OpenRouter's OpenAI-compatible chat-completions endpoint (`POST /api/v1/chat/completions`) via native `fetch` — no SDK lock-in. The model is configurable through `OPENROUTER_MODEL` (defaults to `openai/gpt-4o-mini`; works with any catalog model: `anthropic/claude-3.5-haiku`, `meta-llama/llama-3.1-70b-instruct`, etc.). Four pure functions:
  - `evaluateAnswer` — JSON-mode (`response_format: { type: 'json_object' }`) for short-answer grading; returns `{ score: 0-100, feedback }`. On failure marks the submission `PENDING` with friendly fallback text — never silently dropped.
  - `summarizeArticle` — caches the first generation onto `Article.summary`; learners see "Summarize with AI" → ~120-word bullet summary.
  - `generateHint` — Socratic nudges that explicitly never reveal the model answer.
  - `chat` — a system-prompted study assistant with conversation history (translates the frontend's `model` role to OpenRouter's `assistant`).
  When `OPENROUTER_API_KEY` is missing, all four endpoints fall back to deterministic stubs so dev environments still function.
- **Frontend resilience:** root `ErrorBoundary` plus per-route `ErrorBoundary` (a crash on one page never blows up the layout). All forms use `react-hook-form` + zod resolvers. Loading states use `Skeleton` and `Spinner`. Errors surface through a global `ToastProvider`.
- **Mobile first:** Tailwind responsive utilities throughout; `Navbar` includes a hamburger menu and `LeaderboardTable` swaps to a card layout under `md`.
- **Gamification:** streak tracking (today / yesterday / reset), idempotent badge awarding (`first-submission`, `perfect-score`, `streak-3`, `streak-7`, `polyglot`, `top-10`), running total of points.

---

## Prerequisites

- **Node.js 20.x** (use `.nvmrc`)
- **MongoDB Atlas cluster** (free M0 tier works). The connection string MUST include a database name (e.g. `/mini_lms`).
- **OpenRouter API key** from [openrouter.ai/keys](https://openrouter.ai/keys) (optional in dev — the app falls back to deterministic stubs if missing). Pick any model from the [catalog](https://openrouter.ai/models); cheap defaults that handle JSON well include `openai/gpt-4o-mini` and `anthropic/claude-3.5-haiku`.

---

## Setup

The two apps are independent — install and run each from its own folder.

```bash
# 1. Backend
cd backend
npm install
cp .env.example .env             # set DATABASE_URL, JWT_SECRET, OPENROUTER_API_KEY
npm run prisma:generate
npm run prisma:push              # creates collections + indexes in Atlas
npm run seed                     # loads demo data
cd ..

# 2. Frontend
cd frontend
npm install
cp .env.example .env             # adjust VITE_API_URL / VITE_SOCKET_URL if backend port differs
cd ..
```

After seeding you'll have:

| Role  | Email             | Password      |
|-------|-------------------|---------------|
| Admin | `admin@lms.dev`   | `Admin@123`   |
| User  | `student@lms.dev` | `Student@123` |

…plus three articles (JavaScript, React, Databases) each with a 3-question assignment (2 MCQ + 1 short).

---

## Run

Open **two terminals** — one per app.

```bash
# terminal 1 — backend (default http://localhost:4000)
cd backend
npm run dev

# terminal 2 — frontend (default http://localhost:5174)
cd frontend
npm run dev
```

- API base: <http://localhost:4000/api>
- App: <http://localhost:5174>

The two ports are configurable: backend reads `PORT` from `backend/.env`, frontend reads `port` from [`vite.config.ts`](frontend/vite.config.ts). Whatever you choose, make sure the **frontend's `VITE_API_URL` / `VITE_SOCKET_URL`** and the **backend's `CLIENT_ORIGIN`** point at each other, or CORS will block requests.

### Production build

```bash
# backend
cd backend && npm run build && npm start

# frontend (deploy the dist/ output to Vercel/Netlify/etc.)
cd frontend && npm run build
```

---

## Deployment

The project is set up to deploy as **one GitHub repo** with two services pulling from their own subfolder:

| Service | Platform | Subfolder | Config file |
|---|---|---|---|
| Backend (Express + Prisma + Socket.io) | [Render](https://render.com) | `backend/` | [`backend/render.yaml`](backend/render.yaml) |
| Frontend (Vite + React) | [Vercel](https://vercel.com) | `frontend/` | [`frontend/vercel.json`](frontend/vercel.json) |
| Database | [MongoDB Atlas](https://www.mongodb.com/atlas) | — | — |

### Backend on Render

1. Push the repo to GitHub.
2. On Render: **New → Blueprint** → connect your GitHub account → pick the repo. Render reads [`backend/render.yaml`](backend/render.yaml), creates the service, and asks for the four secret env vars.
3. Paste:
   - `DATABASE_URL` — your MongoDB Atlas connection string (must include the database name, e.g. `/praxisassignmentdb2`)
   - `JWT_SECRET` — a strong random string (32+ chars)
   - `OPENROUTER_API_KEY` — from <https://openrouter.ai/keys>
   - `CLIENT_ORIGIN` — leave blank for now; you'll set it after the frontend is live (e.g. `https://praxis-mini-lms.vercel.app`)
4. Render builds with `npm install && npx prisma generate && npm run build` and starts with `node dist/server.js`.
5. Once the service is live, copy its public URL (e.g. `https://praxis-mini-lms-api.onrender.com`) — you'll paste it into Vercel.

### Frontend on Vercel

1. **Add New Project** → import the same GitHub repo.
2. Set **Root Directory** to `frontend`. Vercel auto-detects Vite.
3. Add these env vars (Settings → Environment Variables) — using the Render URL from above:
   - `VITE_API_URL` = `https://praxis-mini-lms-api.onrender.com/api`
   - `VITE_SOCKET_URL` = `https://praxis-mini-lms-api.onrender.com`
4. Deploy. Vercel gives you a URL like `https://praxis-mini-lms.vercel.app`.

### Final wiring

5. Back on Render → your service → Environment → set `CLIENT_ORIGIN` to the Vercel URL (e.g. `https://praxis-mini-lms.vercel.app`). Save → Render redeploys → CORS now allows the live frontend.
6. Run the seed once against the production database (locally with the prod `DATABASE_URL`):
   ```bash
   cd backend
   DATABASE_URL="<prod-mongo-url>" npm run prisma:push
   DATABASE_URL="<prod-mongo-url>" npm run seed
   ```
7. Open the Vercel URL → log in as `student@lms.dev / Student@123`. Done.

> **Cold starts:** Render's free tier sleeps a service after ~15 min of inactivity, so the first request after a pause may take ~30s while it boots. Upgrade to a paid plan or add a keep-alive ping if this is a concern.

---

## Environment variables

### `backend/.env`

| Key | Required | Description |
|-----|----------|-------------|
| `NODE_ENV` | no | `development` / `production` |
| `PORT` | no | default `4000` |
| `CLIENT_ORIGIN` | yes | CORS origin for the frontend (e.g. `http://localhost:5174`) |
| `DATABASE_URL` | **yes** | MongoDB connection string with database name |
| `JWT_SECRET` | **yes** | min 16 chars; sign access tokens |
| `JWT_EXPIRES_IN` | no | default `7d` |
| `OPENROUTER_API_KEY` | no* | required for real AI; without it stubs are used |
| `OPENROUTER_MODEL` | no | default `openai/gpt-4o-mini` |
| `OPENROUTER_BASE_URL` | no | default `https://openrouter.ai/api/v1` |
| `OPENROUTER_APP_NAME` | no | sent as `X-Title` to OpenRouter analytics; default `Mini LMS` |
| `LOG_LEVEL` | no | pino level |
| `RATE_LIMIT_WINDOW_MS` / `RATE_LIMIT_MAX` | no | global rate limit |

### `frontend/.env`

| Key | Description |
|-----|-------------|
| `VITE_API_URL` | backend REST URL incl. `/api`, e.g. `http://localhost:4000/api` |
| `VITE_SOCKET_URL` | backend origin for Socket.io, e.g. `http://localhost:4000` |

---

## REST API

Base: `/api`. All non-auth routes require `Authorization: Bearer <token>`. Admin routes additionally require `role=ADMIN`. Errors return `{ ok: false, error: { status, message, code, details? } }`.

### Auth

| Method | Path | Auth | Body |
|--------|------|------|------|
| `POST` | `/auth/signup` | public | `{ name, email, password }` |
| `POST` | `/auth/login` | public | `{ email, password }` |
| `GET`  | `/auth/me` | user | — |
| `POST` | `/auth/logout` | user | — |

### Articles

| Method | Path | Auth |
|--------|------|------|
| `GET` | `/articles?tag=&q=&page=&limit=&sort=recent\|popular` | user (optional) |
| `GET` | `/articles/tags` | user (optional) |
| `GET` | `/articles/:slug` | user (optional) |
| `POST` | `/articles` | admin |
| `PATCH` | `/articles/:id` | admin |
| `DELETE` | `/articles/:id` | admin |
| `POST` | `/articles/:id/progress` | user — `{ percent: 0..100 }` |

### Assignments

| Method | Path | Auth |
|--------|------|------|
| `GET` | `/articles/:articleId/assignment` | user (answers stripped) |
| `POST` | `/articles/:articleId/assignment` | admin (full upsert) |
| `GET` | `/assignments/:id/admin` | admin (full data) |
| `PATCH` | `/assignments/:id` | admin |
| `DELETE` | `/assignments/:id` | admin |

### Submissions

| Method | Path | Auth |
|--------|------|------|
| `POST` | `/submissions` | user — `{ articleId, answers: [...] }` |
| `GET` | `/submissions/me?page=&limit=` | user |
| `GET` | `/submissions/me/article/:articleId` | user — latest |
| `GET` | `/submissions/:id` | user (owner) / admin |
| `GET` | `/submissions/admin/recent` | admin |

### Leaderboard / Dashboard / AI

| Method | Path | Auth | Notes |
|--------|------|------|-------|
| `GET` | `/leaderboard?limit=20` | user | Composite ranking via `aggregateRaw` |
| `GET` | `/leaderboard/me/rank` | user | rank + neighbors |
| `GET` | `/dashboard/me` | user | totals + recent activity + chart series |
| `GET` | `/dashboard/admin` | admin | platform stats |
| `POST` | `/ai/summarize` | user | `{ articleId, refresh? }` — caches into `Article.summary` |
| `POST` | `/ai/hint` | user | `{ articleId, questionId, draft? }` |
| `POST` | `/ai/chat` | user | `{ messages: [{ role, content }, …] }` |

Live: Socket.io on the same origin emits `leaderboard:updated` to clients in the `leaderboard` room after every submission.

---

## AI usage explained

The assignment requires AT LEAST ONE AI feature. This project ships THREE plus a chatbot, all through [backend/src/services/ai.service.ts](backend/src/services/ai.service.ts) which calls **OpenRouter** (`POST https://openrouter.ai/api/v1/chat/completions`) via native `fetch`. The model is configurable via `OPENROUTER_MODEL` — defaults to `openai/gpt-4o-mini` but works with any catalog model (`anthropic/claude-3.5-haiku`, `meta-llama/llama-3.1-70b-instruct`, free-tier models like `meta-llama/llama-3.1-8b-instruct:free`, etc.).

1. **AI-graded short-answer questions.** When a learner submits, every short-answer is sent to OpenRouter with `response_format: { type: 'json_object' }` and an instruction to return strict JSON `{ score: 0-100, feedback }`. The response is parsed defensively (handles ```json fences and stray prose). Score × point weight → points awarded, surfaced in `ResultPanel` with AI feedback. If the AI call fails, the submission is saved with status `PENDING` and friendly fallback text — never silently dropped.
2. **Article summarisation ("Explain this in simple terms").** The `SummaryButton` on every article fetches a ~120-word bulleted summary and caches it onto `Article.summary` so subsequent loads are instant.
3. **Hint generation ("Check my answer").** On every short-answer question, learners can press the lightbulb to get a Socratic nudge based on their current draft. Prompting explicitly forbids revealing the answer.
4. **AI study chat (bonus).** A full chatbot at `/chat` with conversation history, system instruction, and starter prompts. The frontend uses Gemini-style `{role: 'user' | 'model'}` messages; the service translates `model → assistant` for OpenRouter.

All AI calls are rate-limited (`/api/ai/*` → 30/min/IP) and inputs are zod-validated. OpenRouter analytics headers (`HTTP-Referer`, `X-Title`) are set per request.

---

## Verification — manual demo flow

1. Start the backend (`cd backend && npm run dev`) and the frontend (`cd frontend && npm run dev`) in two terminals, then open <http://localhost:5174>.
2. Sign up a brand-new account → redirected to dashboard with empty state.
3. In a second browser, log in as **admin@lms.dev / Admin@123** → `/admin/articles` → "New article". Markdown editor with live preview. Add tags, save → redirected to assignment editor → add 2 MCQ + 1 short answer → save.
4. Back in the first browser, refresh `/articles`. Filter by tag, open the article. Watch the reading-progress bar fill as you scroll.
5. Click **"Summarize with AI"** → OpenRouter summary appears (cached on next visit).
6. On the inline assignment, click **"Get a hint"** on the short-answer question → tutor responds without leaking the answer.
7. Submit a mix of correct and incorrect answers. Result panel shows per-question scores, AI feedback for the short answer, and any newly unlocked badges.
8. Open `/leaderboard` in the first browser. In the second, submit the same assignment as `student@lms.dev` → **the first browser's leaderboard updates without refresh** (Socket.io).
9. `/dashboard` shows updated totals, score-over-time line chart, tag breakdown bar chart, and recent activity feed.
10. `/profile` shows badges, streak, and full submission history.
11. `/chat` — ask "Explain useEffect" and verify a useful OpenRouter reply.

Negative paths to validate:

- Wrong password → toast error, no token saved.
- Non-admin hits `/admin` → redirected by `<AdminRoute>`.
- `curl http://localhost:4000/api/articles` (no token) → `401`.
- Stop MongoDB → API requests fail with 5xx; the frontend axios interceptor surfaces a toast on the next request.

---

## Deliverables checklist

- [x] JWT signup/login with `USER` and `ADMIN` roles
- [x] Articles CRUD (admin), list/read (user), tag filter, reading-progress %
- [x] Per-article assignment with MCQ (auto-graded) + short answer (AI-graded)
- [x] AI: evaluation + summarisation + hint + chat — all wired through OpenRouter
- [x] Performance dashboard: totals, score %, recent activity, charts
- [x] Leaderboard ranked by composite of avg-score AND completion-rate, real-time via Socket.io
- [x] Mongo collections `User`, `Article`, `Assignment`, `Submission` with proper relations + `aggregateRaw` pipelines
- [x] Pages: Login/Signup, Dashboard, Article list (filterable), Article detail with inline assignment, Leaderboard, Admin panel
- [x] Loading states, **ErrorBoundary** (mandatory), form validation, mobile responsive
- [x] Centralised error middleware, zod input validation, env vars, structured logging
- [x] Bonus: live leaderboard, AI chatbot, badges/streak, Recharts visualisations, role-based admin

---

## License

MIT — for portfolio and educational use.
