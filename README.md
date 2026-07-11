# MatchDeck

Mobile-first app for secret brainstorming, dramatic reveals, and matching ideas with friends. Create a temporary room, join by code, submit as many folded cards as you like, reveal, and group close matches.

## Stack

- Next.js, React, TypeScript
- Tailwind CSS
- Framer Motion, GSAP, canvas-confetti
- Supabase schema included for production persistence

## Run

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

## Checks

```bash
npm run check
npm run test
npm run build
```

## Supabase

Copy `.env.local.example` to `.env.local` and fill:

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
```

Run `supabase/schema.sql` in Supabase SQL editor.

## Current Limitation

Runtime uses a tiny in-memory Next API store so the app works immediately without Supabase. Rooms reset when the dev server restarts. Swap `src/lib/store.ts` for Supabase calls when persistent realtime is needed.
