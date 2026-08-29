# Leadership English Community — a personal Skool-style community

A self-hosted, fully-controlled community platform: a social feed, a
message-board ("threads"), video courses, and subscriptions. Built for a
single owner who wants everything under their own roof.

## Features

- **Social feed** — posts (with image / YouTube / Vimeo embeds), comments, likes.
- **Threads board** — 7 categories (general, philosophy, body, spirit,
  world-news, vent, questions), nested replies, threads bump on activity,
  pinning.
- **Courses** — modules of lessons with embedded video, progress tracking, a
  per-lesson discussion area, and a learning dashboard (`/learn`) that resumes
  where you left off.
- **Engagement points** — members earn points by posting, commenting, replying,
  and receiving likes. A daily cap prevents farming. Points are recognition,
  not access: every course and lesson is open to all members.
- **Subscriptions** — optional Stripe monthly subscription to support the
  community.
- **Reports & moderation** — any member can flag content; an admin queue to
  resolve or dismiss.
- **Admin dashboard** — courses/lessons management, moderation queue, point
  values, member management.

## Stack

- Next.js 16 (App Router, Server Actions, TypeScript, Tailwind v4)
- Supabase (Auth, Postgres, RLS)
- Stripe (subscriptions)
- Video hosted externally (YouTube/Vimeo embeds) — no self-hosted streaming

## Getting started

### 1. Create a Supabase project

1. Go to https://supabase.com and create a project.
2. Open the **SQL editor** and run the schema in
   `supabase/migrations/0001_init.sql`.
3. Under **Project Settings → API**, copy the project URL and anon key.

### 2. Configure environment

```bash
cp .env.local.example .env.local
```

Fill in the values:

| Variable | Purpose |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | Service-role key (Stripe webhook writes) |
| `STRIPE_SECRET_KEY` / `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Stripe API keys |
| `STRIPE_PRICE_ID` | Your monthly subscription price id |
| `STRIPE_WEBHOOK_SECRET` | Stripe webhook signing secret |
| `NEXT_PUBLIC_APP_URL` | Your app URL (e.g. `http://localhost:3000`) |
| `ENABLE_STRIPE` | `false` until you configure Stripe; `true` after |
| `ADMIN_USER_IDS` | Optional: comma-separated user ids to force as admin |

### 3. Run it

```bash
npm install
npm run dev
```

Open http://localhost:3000, **sign up**, and complete the username step. The
**first member to sign up is automatically made admin** (you can also set
`ADMIN_USER_IDS`). From then on, the admin dashboard is available at `/admin`.

### 4. Configure Stripe (optional)

1. Create a Product + recurring Price in the Stripe dashboard and set
   `STRIPE_PRICE_ID`.
2. In Stripe → Webhooks, add an endpoint pointing to
   `https://YOUR_APP/api/stripe/webhook` and subscribe to at least
   `checkout.session.completed`, `customer.subscription.updated`, and
   `customer.subscription.deleted`.
3. Set `STRIPE_WEBHOOK_SECRET` from the webhook signing secret.
4. Set `ENABLE_STRIPE=true`.

While `ENABLE_STRIPE` is `false`, subscriptions are simply not offered — use it
to develop without a payment setup.

## How points work

Points are awarded automatically by database triggers whenever content is
created (a like awards the author). Values live in the `settings` table and are
editable in the admin dashboard:

| Action | Default |
|---|---|
| Feed post | +10 |
| New thread | +8 |
| Comment / reply | +3 |
| Like received | +1 |
| Daily cap | 50 |

Points measure participation (the leaderboard on `/board` and profiles use
them), but they never restrict access — all courses are open by default.

## Layout

```
src/
  actions/          Server Actions (auth, feed, threads, lessons, reports, admin)
  components/       UI components (feed, board, auth, admin, account)
  lib/
    supabase/       client.ts (browser), server.ts (server), admin.ts (service role)
    queries.ts      data access
    config.ts       categories, point kinds
    stripe.ts       lazy Stripe client
    utils.ts        formatting, video-embed conversion
  app/
    feed/           social feed
    learn/          learning dashboard (resume, course progress)
    board/          category index + [category] thread lists
    thread/[id]/    thread + replies
    courses/ course/[id]/ lesson/[id]   video lessons + lesson discussions
    members/ member/[username]          member directory + profiles
    account/        points breakdown + subscription management
    admin/          dashboard (reports, courses, points, members)
    api/stripe/     checkout, billing portal, webhook
  proxy.ts          session refresh (Next 16 middleware)
supabase/
  migrations/       database schema + RLS + triggers
```

## Notes & tradeoffs

- **Video** is embedded, not hosted. Use unlisted YouTube links or Vimeo for
  private-ish playback; Mux or Vimeo OTT are the upgrade path if you need
  privacy + custom player.
- **Real-time chat** is out of scope for v1. The feed/board revalidate on
  mutations (no sockets).
- **Moderation** is manual (you). Reports land in `/admin/reports`.
- RLS locks everything down: content is only readable by signed-in members;
  writes to `activity`, `likes`, and `subscriptions` go through security-definer
  functions only.
