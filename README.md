# AutoParts Pro — Inventory & Billing Management System

A **frontend-only** Inventory & Billing Management System for a car parts shop,
built with **React + Vite + Tailwind CSS**. There is no backend — all data lives
in-memory (React state) for the session and is seeded with realistic mock data.

Designed for a Pakistan / Saudi retail context: English UI, configurable
**PKR / SAR** currency, and a "khata / udhaar" (credit ledger) workflow.

## Features

| Module | What it does |
| --- | --- |
| **Dashboard** | KPI cards (total products, low-stock items, today's sales, total receivables), recent transactions and low-stock alerts. |
| **Inventory** | Add / edit / delete car parts, searchable + filterable table, low-stock rows highlighted, category filter, Excel export. |
| **Billing** | Build invoices with live product search, multiple line items, auto qty × price, discount, tax and grand total. Stock auto-decreases on sale. Mark **Paid / Partial / Credit (Udhaar)**. Download a clean **PDF** invoice. Record payments against a balance. |
| **Customers (Khata)** | Customer directory with running balances. Per-customer ledger (invoices + payments with a running balance). Record account payments (applied oldest-first). Export a customer **statement to Excel**. |
| **Expenses** | Log daily expenses, filter by date range / category, running total, Excel export. |
| **Reports** | Sales, expense and receivables summaries + inventory valuation, each exportable to **Excel**. |

## Tech

- **React 18** functional components + hooks (`useState`, `useReducer`, `useMemo`)
- Central store via `useReducer` in [`src/context/AppContext.jsx`](src/context/AppContext.jsx)
- **Tailwind CSS** (red / black auto-parts theme), fully responsive
- **Light / dark mode** toggle (persisted)
- **lucide-react** icons
- **jsPDF** + `jspdf-autotable` for PDF invoices
- **SheetJS (xlsx)** for Excel exports

## Getting started

```bash
npm install
npm run dev      # start dev server (http://localhost:5173)
npm run build    # production build
npm run preview  # preview the production build
```

## Project structure

```
src/
  main.jsx                 App bootstrap
  App.jsx                  Shell: sidebar + topbar + active page
  context/AppContext.jsx   In-memory store (useReducer) + currency/theme
  data/mockData.js         Seed products, customers, invoices, expenses
  components/
    Sidebar.jsx            Navigation
    ui.jsx                 Modal, StatusBadge, PageHeader, EmptyState
  pages/
    Dashboard.jsx
    Inventory.jsx
    Billing.jsx            Invoice list + builder + payment
    Customers.jsx          Directory + ledger/statement
    Expenses.jsx
    Reports.jsx
  utils/
    calc.js                Invoice / balance math
    format.js              Currency + date formatting
    pdf.js                 Invoice PDF generation
    excel.js               Excel (.xlsx) exports
```

> **Note:** Data resets on refresh — this is a demo with no persistence layer.