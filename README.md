# WithTama

「出会ったその日から、命は家族になる。」

責任あるブリーダーと、犬猫を家族として迎えたい購入希望者をつなぐ会員制Webサービスです。

## Stack

- Next.js App Router / TypeScript
- Tailwind CSS / shadcn/ui-compatible structure
- Supabase Auth, PostgreSQL, Storage, RLS
- Stripe subscriptions
- Dify, n8n, Resend

## Setup

1. Copy `.env.example` to `.env.local`.
2. Fill in the Supabase variables first.
3. Run `npm install`.
4. Run `npm run dev`.
5. Open `http://localhost:3000`.

Node.js 20.9 or later is required. Node.js 22 LTS is recommended for development and CI.

## Important security rules

- Never expose `SUPABASE_SERVICE_ROLE_KEY` to the browser.
- All public-key database access must be protected by RLS.
- Stripe payment state is synchronized from verified webhooks.
- AI output is always a draft requiring breeder review and administrator approval.

## Repository responsibilities

- Google Docs: requirements and human-readable design decisions.
- GitHub: executable code, SQL migrations, RLS policies, and integrations.
