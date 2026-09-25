# Optimum Personal Schedule Recommender

A personal task scheduler that doesn't just list your to-dos — it actually decides *when* you'll do them. You give it tasks (with an importance rating, an estimate, and a due date) and your fixed commitments (sleep, work, classes), and a deterministic, math-based algorithm — not an LLM, not machine learning — slots each task into your free time, highest priority first, splitting a task across multiple days if it has to.

## What this is

- **The algorithm** (`algorithm/priority.ts`, `algorithm/schedule.ts`) is the core of this project — kept in its own folder, separate from everything else, since it's the part I built and debugged myself; the app around it (UI, database, auth) was built with Claude Code. It scores every task on a combination of importance and a pace-driven urgency curve, then places tasks into available time using classic scheduling/CS techniques — interval merging, gap-finding, bin packing (Best-Fit), and a Shortest-Processing-Time-style ranking for anything that slips past its due date. It's pure and deterministic: the same inputs always produce the same output, `now` is always passed in rather than read from the system clock, and it's been verified with both hand-picked edge cases and a 2000-run randomized fuzz test.
- **The app around it** is a Next.js (App Router) UI with Neon Auth for authentication and a Neon Postgres database (via Drizzle), giving you a calendar view, a Kanban board, a timetable for recurring commitments, an overdue list, and settings for how many hours a day you actually have.

## Where to find things

Everything I built myself — the algorithm, its docs, and its decision log — lives together under **`algorithm/`**, kept separate from the app around it:

- **`algorithm/priority.ts`**, **`algorithm/schedule.ts`** — the algorithm itself.
- **`algorithm/documentation/priority.md`** — how task priority is computed (importance + urgency), including the bugs found and fixed along the way.
- **`algorithm/documentation/scheduling.md`** — how the free-time/slotting algorithm works, and the bugs found and fixed there too.
- **`algorithm/issues/`** — the full decision log behind the algorithm, written as the reasoning happened rather than after the fact:
  - `priority-issues.md` — priority-ranking design decisions.
  - `scheduling-issues.md` — scheduling/slotting design decisions.
  - `open-issues-&-improvement.md` — ideas considered and either deferred or explicitly declined (e.g. an LLM-based natural-language input layer).

`idea.md` / `rambling.md` at the project root are the original, unfiltered product vision this was built from.

## Tech stack

Next.js · TypeScript · Tailwind CSS · shadcn/ui · Neon Auth · Neon (Postgres) · Drizzle ORM

## Running it locally

```bash
pnpm install
```

Create a `.env.local` in the project root (see the placeholders already scaffolded there) with:

```
DATABASE_URL=                # from your Neon project
NEON_AUTH_BASE_URL=          # enable Auth in the Neon Console (Project → Branch → Auth → Configuration)
NEON_AUTH_COOKIE_SECRET=     # any random string, 32+ characters (e.g. `openssl rand -base64 32`)
```

Then push the schema to your database and start the dev server:

```bash
pnpm drizzle-kit push
pnpm dev
```

## Deploying to Vercel

Push this repo to GitHub and import it into Vercel, or run `vercel` from the project root. Add the same environment variables from `.env.local` in the Vercel project's settings before the first deploy — the build will fail without a reachable `DATABASE_URL` and a valid `NEON_AUTH_BASE_URL`.
