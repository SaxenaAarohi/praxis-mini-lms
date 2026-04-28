# Mini LMS — A Small Learning Platform

A simple full-stack learning app where users:

- Read articles
- Take a small quiz at the end of each article (multiple-choice + one short-answer)
- Get scored by AI for the short-answer
- See their progress on a personal dashboard
- Compete on a live leaderboard
- Chat with an AI tutor for help

## What's it built with?

**Frontend** — React, Vite, TypeScript, Tailwind CSS

**Backend** — Node.js, Express, TypeScript, Prisma

**Database** — MongoDB (cloud — MongoDB Atlas)

**AI** — OpenRouter (one API key works with many models — GPT, Claude, Llama, etc.)

**Real-time** — Socket.io (for the live leaderboard)

## Folder structure

```
praxis-mini-lms/
├── backend/        ← the API (Express)
│   ├── prisma/     ← database schema + seed (sample data)
│   └── src/        ← all backend code
└── frontend/       ← the website (React)
    └── src/        ← all frontend code
```

The backend and frontend are two separate apps. You install and run them independently.

## What you need before starting

1. **Node.js 20** installed on your computer
2. A free **MongoDB Atlas** account — create a cluster, get the connection string. <https://www.mongodb.com/atlas>
3. (Optional) An **OpenRouter** API key for real AI replies. Without it, the app uses simple stub responses so you can still test everything. <https://openrouter.ai/keys>

## How to set it up

Open a terminal in the project folder.

### 1. Set up the backend

```bash
cd backend
npm install
```

Copy the example environment file and fill in your values:

```bash
cp .env.example .env
```

Open `backend/.env` and set:

- `DATABASE_URL` — your MongoDB connection string (must include a database name like `/mini_lms` at the end)
- `JWT_SECRET` — any long random string (used to sign login tokens)
- `OPENROUTER_API_KEY` — paste your key here, or leave blank to use stubs

Now create the database tables and load some sample data:

```bash
npm run prisma:generate
npm run prisma:push     # creates collections in MongoDB
npm run seed            # adds sample users and articles
```

### 2. Set up the frontend

In a new terminal:

```bash
cd frontend
npm install
cp .env.example .env
```

The frontend `.env` already points at `http://localhost:4000` which matches the backend default. No changes needed unless you change the backend port.

## How to run it

You need **two terminals** open at the same time.

**Terminal 1 — backend:**

```bash
cd backend
npm run dev
```

You should see `🚀 mini-lms backend listening on http://localhost:4000`.

**Terminal 2 — frontend:**

```bash
cd frontend
npm run dev
```

You should see something like `Local: http://localhost:5174/`.

Now open **http://localhost:5174** in your browser.

## Login accounts (created by the seed)

| Who   | Email             | Password      |
|-------|-------------------|---------------|
| Admin | `admin@lms.dev`   | `Admin@123`   |
| User  | `student@lms.dev` | `Student@123` |

The seed also creates 3 sample articles (about JavaScript, React, and MongoDB) and a small quiz for each.

- **Admin** can create / edit / delete articles and assignments at `/admin`.
- **User** reads articles, takes quizzes, sees their dashboard, and competes on the leaderboard.

## How AI is used

There are 4 places where AI helps the user. All of them go through OpenRouter, so one API key works for many different models.

1. **Short-answer grading** — when you submit a short-answer question, the AI reads your answer and gives a score from 0 to 100 with feedback.
2. **Article summary** — click "Summarize with AI" on any article and the AI gives you a quick bullet-point version.
3. **Hint** — stuck on a short-answer question? Click "Get a hint" and the AI gives a Socratic nudge (it never gives away the answer).
4. **AI Tutor chat** — go to the `/chat` page and ask anything. Replies stream in word-by-word, like ChatGPT.

If you didn't set an `OPENROUTER_API_KEY` in `.env`, all four still work but with simple stub responses.

## How AI usage explained — short version

When a user submits a short-answer:

```
User answer  →  Backend  →  OpenRouter (one API key, many models)  →  { score, feedback }  →  saved to MongoDB  →  shown to user
```

The model is set in `OPENROUTER_MODEL` (defaults to `openai/gpt-4o-mini`). You can change it to any model OpenRouter supports without touching the code.

## Deliverables checklist

- Login + Signup (with JWT)
- Two roles (Admin, User)
- Articles — read, search, filter by tag, track reading progress
- Each article has a small quiz (MCQ + short-answer)
- Short-answer is graded by AI
- Personal dashboard with charts
- Live leaderboard (updates in real-time)
- AI summary, AI hint, AI chat
- Gamification: badges, daily streak, points
- Admin panel to manage articles
- Mobile-friendly design
