# AutoParts Pro — Inventory & Billing (Multi-company SaaS)

A multi-company Inventory & Billing system for car-parts businesses, built with
**React + Vite + Tailwind CSS** and backed by **Supabase** (Postgres + Auth +
row-level security). Currency: **South African Rand (R / ZAR)**.

Each company is an isolated tenant with its own inventory, customers, invoices,
expenses and settings. A platform **admin** provisions and manages company
accounts; each company only ever sees its own data (enforced at the database
level by RLS).

## Roles

- **Admin** — platform owner. Manages companies (create / edit / block /
  unblock / delete), can view & edit any company's data, and sees a
  platform-wide overview.
- **Company** — a tenant. Uses Dashboard, Inventory, Billing, Customers,
  Expenses, Reports and Settings for its own data only.

## Features

- **Inventory** — parts with 3 selling tiers (Actual / Medium / High), cost,
  stock, low-stock alerts, restock ("Add Stock"), Excel export.
- **Billing** — invoices with per-line price tier, salesperson, discount/tax,
  Paid/Partial/Credit status, edit & void (stock adjusts), branded **PDF**.
- **Customers** — ledger with running balance, Settled / Pending status,
  record payments (oldest-first), Excel statement.
- **Expenses**, **Reports** (date-range filter, per-report + combined Excel),
  **Dashboard** (KPIs + charts), **Settings** (invoice address / bank / terms).

## Tech

- React 18 + Vite + Tailwind CSS (light/dark), lucide-react icons
- Supabase JS (`@supabase/supabase-js`) — Auth + Postgres + RLS
- jsPDF + jspdf-autotable (invoices), SheetJS/xlsx (exports)

## Environment variables

Both are safe to expose in the frontend (publishable/anon key; access is
governed by RLS). Copy `.env.example` to `.env`:

```
VITE_SUPABASE_URL=https://<your-project-ref>.supabase.co
VITE_SUPABASE_ANON_KEY=sb_publishable_xxx
```

## Getting started

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # production build → dist/
npm run preview  # preview the production build
```

## Deploy to Vercel

1. Push this repo to GitHub and **Import** it in Vercel.
2. Vercel auto-detects Vite (build `npm run build`, output `dist`). A
   `vercel.json` is included with an SPA rewrite.
3. **Add the environment variables** in Vercel → Project → Settings →
   Environment Variables (for Production **and** Preview):
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
4. Deploy. If the vars are missing the app shows a clear "Configuration
   needed" screen instead of a blank page — add them and redeploy.

> Vite inlines `VITE_*` variables at **build time**, so after changing them in
> Vercel you must trigger a new deployment.

## Default demo accounts

- Admin: `maaz` / `maaz123`
- Company: `demo` / `demo123`
