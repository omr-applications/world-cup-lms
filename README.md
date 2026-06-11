# World Cup Last Man Standing

A mobile-first Next.js App Router app backed by Convex DB and Convex Auth. Hosts create private World Cup Last Man Standing groups, players join by code, and everyone makes one winner pick per World Cup match day.

## Getting Started

Install dependencies, then configure Convex:

```bash
npm install
npm run convex
```

Copy the example environment file and fill in the Convex values:

```bash
cp .env.example .env.local
```

Generate Convex Auth keys and set the printed values in the Convex deployment environment:

```bash
npm run generate:auth-keys
```

Optional fixture/result sync is driven by Convex cron jobs. Set these in the Convex deployment environment when a feed is available:

```bash
FIFA_SCORES_FEED_URL=
FIFA_FIXTURES_FEED_URL=
```

Password reset emails use Resend from Convex Auth. Set these in the Convex deployment environment before using the forgot-password flow:

```bash
RESEND_API_KEY=
AUTH_EMAIL_FROM="World Cup LMS <no-reply@example.com>"
```

Start both Convex and Next.js during development:

```bash
npm run convex
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Useful Scripts

- `npm run dev` starts Next.js.
- `npm run convex` starts Convex and codegen.
- `npm run test` runs rule-helper tests.
- `npm run lint` runs ESLint.
- `npm run build` creates a production build.

## Current Scope

- World Cup 2026 only.
- Day-based Last Man Standing rounds.
- Email/password auth through Convex Auth.
- Forgot-password flow with emailed reset codes.
- Host-created groups with shareable join codes.
- One pick per group per day, with previously picked teams blocked per group.
- Draws, losses, and missed picks eliminate a player.
- Selection reset requests for late-stage agreement between remaining players.
- Backend-owned fixture and score sync hooks through Convex cron jobs.

Live sports API integration can be swapped in behind the existing sync functions without changing the core group, pick, or elimination model.
