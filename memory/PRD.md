# EraCool AI Financial Analyst — PRD

## Original Problem Statement
Build an AI-powered finance app per uploaded PRD: an AI Financial Analyst for CV Eracool Teknik Solution (AC/Refrigeration service business, Indonesia, IDR). Core principle: **"Financial Engine calculates. AI explains."** — the engine computes all numbers deterministically; the AI only explains, investigates, detects patterns, and recommends. It never invents financial figures.

## User Choices
- AI: Gemini (`gemini-3-flash-preview`) via Emergent Universal LLM key
- Scope: full core MVP
- Auth: JWT email/password with roles (owner / finance / accountant)
- Data: dummy demo data (EraCool 2025)
- Language: mixed Indonesian + English accounting terms

## Architecture
- Frontend: React + Tailwind + shadcn/ui + recharts + phosphor-icons. Bearer-token auth (localStorage `eracool_token`), axios interceptor.
- Backend: FastAPI. Modules: `auth.py` (JWT, bcrypt, brute-force lockout), `models.py`, `demo_data.py` (chart of accounts + balanced double-entry generator), `financial_engine.py` (deterministic P&L/BS/CF/ratios/KPI/health/data-quality), `ai_gateway.py` (Gemini structured JSON + guardrails), `server.py` (routes).
- DB: MongoDB — collections: users, companies, accounts, journal_lines, service_jobs, audit_logs, login_attempts.
- Principle enforced: AI receives only validated engine output as context; system prompt forbids inventing numbers.

## User Personas
- Owner: sees full dashboard, health, AI insights, reports.
- Finance/Admin: manages data import, reconciliation.
- Accountant: reviews statements & chart of accounts.

## Core Requirements (static)
- Deterministic Financial Engine (single source of truth for all numbers).
- AI as explainer/analyst only, with confidence + data lineage/sources.
- Balance Sheet must always balance (double-entry).
- Cash-on-hand distinct from bank; profit ≠ cash.
- Plain-Indonesian "What is this? / Why does it matter?" explanations.
- Green/Yellow/Red KPI status.

## Implemented (2026-06)
- JWT auth (register/login/logout/me) with roles, brute-force lockout (429 after 5 fails), min password length, token in body + cookies. Seeded owner: owner@eracool.id / eracool123.
- Company setup wizard + auto-seed demo data.
- Demo dataset (EraCool 2025): Revenue Rp181,230,000 · Net Profit Rp49,169,996 · Net Margin 27.13% · 120 service jobs · Balance Sheet balanced · positive inventory.
- Dashboard: 8 KPI cards, Financial Health gauge (94), Data Quality gauge, revenue & cash-flow charts, alerts, top problems/opportunities.
- Financial statements: Profit & Loss, Balance Sheet (balanced badge), Cash Flow, Cash on Hand.
- KPI page: financial + service KPIs with status colors; technician & customer rankings.
- Service Jobs table with search.
- Ask Finance AI (structured: summary/metrics/findings/risks/recommendations/confidence/sources) + AI Insights.
- Import wizard: upload XLSX/CSV → auto column mapping → validation → commit (full-file, not truncated) → delete imported.
- Reports: PDF + XLSX export.
- Settings: company profile, chart of accounts, audit log.

## Verified
- Testing agent iteration 1: 94% backend (50/53), 100% frontend flows. All 3 HIGH issues fixed & re-verified (negative inventory, quick>current ratio, import >20-row truncation). Brute-force lockout, password validation added.

## Backlog (P1/P2, not blocking)
- P1: Bank reconciliation module; per-customer/technician detail drill-downs; scenario/what-if modeling UI.
- P1: Make `/auth/refresh` work with Bearer flow; server-side token revocation on logout.
- P2: Restrict CORS to explicit origins; cache/aggregate engine computations; migrate `on_event` → lifespan.
- P2: Multi-period comparison (MoM/YoY) on P&L; alerts thresholds config.

## Next Tasks
- Await user feedback; prioritize Bank Reconciliation and What-if scenarios next.
