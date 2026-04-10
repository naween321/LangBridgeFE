# LexAI — AI-Powered Legal Assistant Platform

## Overview
LexAI is a full-stack AI-powered legal assistant platform built with React+Vite frontend and Express/PostgreSQL backend in a pnpm monorepo.

## Architecture

### Monorepo Structure
- `artifacts/lexai/` — React+Vite frontend (main web app, port via `PORT` env var)
- `artifacts/api-server/` — Express API backend (port 8080)
- `lib/db/` — Drizzle ORM schema and database client
- `lib/api-spec/` — OpenAPI spec (openapi.yaml)
- `lib/api-client-react/` — Generated React Query hooks (via orval codegen)
- `lib/api-zod/` — Generated Zod schemas (via orval codegen)

### Key Technologies
- **Frontend**: React 19, Vite 7, Tailwind CSS v4, wouter v3 (routing), @tanstack/react-query
- **Backend**: Express.js, Drizzle ORM, PostgreSQL
- **Auth**: JWT tokens stored in localStorage ("lexai_token"), SHA256+salt hashing
- **API Client**: Auto-generated from OpenAPI spec via orval, `setAuthTokenGetter` injects token globally

## Color Theme
Deep navy + gold: `--background: 222 47% 8%`, `--primary: 43 96% 56%`

## Features
1. **Landing Page** — Marketing page with features and pricing
2. **Auth** — Login/Register with role selection (Normal User or Lawyer)
3. **Dashboard** — Usage stats, recent chats/documents, quick actions
4. **AI Chat** — Chat sessions with AI legal assistant, document attachment
5. **Documents** — Upload documents, AI analysis (summarize/simplify/detect risks/translate)
6. **LawyerNet** — Browse/filter verified attorneys by specialization, language, rating
7. **Lawyer Profile** — View profile, book meeting, chat, write reviews
8. **Messages** — Direct messaging between users and lawyers
9. **Bookings** — View/cancel scheduled meetings with attorneys
10. **Membership** — Free/Premium plans ($10/month), upgrade/cancel
11. **Settings** — Profile settings, lawyer professional profile, account info

## API Routes
All routes under `/api`:
- `/api/auth` — register, login, logout, me
- `/api/users` — profile (GET/PATCH), lawyer-profile (POST), usage (GET)
- `/api/chat` — sessions (GET/POST), session detail (GET/DELETE), send message (POST)
- `/api/documents` — list (GET), upload (POST), delete (DELETE), analyze (POST)
- `/api/lawyers` — list with filters (GET), stats (GET), single (GET), reviews (GET/POST), availability (GET)
- `/api/messages` — conversations (GET/POST), conversation detail (GET), send message (POST)
- `/api/bookings` — list (GET), create (POST), cancel (DELETE)
- `/api/membership` — get (GET), upgrade (POST), cancel (DELETE)

## Vite Proxy
Vite is configured to proxy `/api/*` requests to `http://localhost:8080` in development.

## Database
PostgreSQL with tables: users, sessions, membership, usage_tracking, chat_sessions, messages, documents, lawyer_profiles, reviews, conversations, direct_messages, bookings.

## Environment Secrets
- `SESSION_SECRET` — used for session security
- `DATABASE_URL` — PostgreSQL connection string (auto-provided by Replit)

## Test Accounts
- demo@lexai.com / password123 (Normal User)
- lawyer@lexai.com / password123 (Lawyer)
- michael.chen@lexai.com / password123 (Immigration Lawyer)
- priya.patel@lexai.com / password123 (Family Law)
- james.williams@lexai.com / password123 (Criminal Defense)
