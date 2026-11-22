# BreatheWise AI — Intelligent Air Quality & Winter Smog Assistant

BreatheWise AI is a full-stack environmental intelligence assistant designed for families, students, working professionals, elderly households, outdoor workers, and local communities navigating urban air pollution and severe winter smog.

## Architecture & Technology Stack

- **Frontend**: React 19, TypeScript, Tailwind CSS v4, Recharts, Lucide Icons
- **Backend**: Node.js + Express (`server.ts`) with Vite middleware in development and static production serving
- **Database**: SQLite (`better-sqlite3`, WAL mode, foreign keys, indexed tables persisted under `data/breathewise.db`)
- **GenAI Engine**: Server-side `@google/genai` SDK (`gemini-4-hydrogen`, configurable via `GEMINI_MODEL`) with structured JSON `responseSchema`, Zod output validation, prompt-injection defense, and exponential-backoff retry
- **Environmental Data**: Live Open-Meteo Air Quality, Weather, and Geocoding APIs normalized through official **CPCB India NAQI (2014)** and **US EPA (2024)** breakpoint engines (never mixed; never fabricated when offline)
- **Authentication & Security**: `bcryptjs` password hashing, `jsonwebtoken` (JWT) Bearer tokens, isolated guest sessions, `helmet`, `cors`, `express-rate-limit`, Zod request validation, and input sanitization

## Setup & Local Execution

1. Install dependencies:
   ```bash
   npm install
   ```
2. Configure environment variables (copy `.env.example` to `.env` and set `GEMINI_API_KEY` and `JWT_SECRET`).
3. Start development server on port 3000:
   ```bash
   npm run dev
   ```
4. Run unit tests:
   ```bash
   npm test
   ```
5. Type-check and build production bundle:
   ```bash
   npm run lint
   npm run build
   npm start
   ```

## Core API Endpoints

- `GET /api/health` — Service health check
- `POST /api/auth/register` | `POST /api/auth/login` | `GET /api/auth/me` — Account authentication
- `GET /api/locations/search?q=...` | `GET /api/locations/reverse?lat=...&lon=...` — Geocoding & approximate reverse lookup
- `GET/POST/PATCH/DELETE /api/locations` — Saved user locations
- `GET /api/air-quality` — Live/cached AQI, 6 pollutants, meteorology, 24h history, 24h forecast, and 7-day daily summary
- `GET/PUT /api/profile` — Household composition, commute, budget, and indoor air profile
- `GET /api/planner` | `PATCH /api/planner/:taskKey` — Forecast-aware 9-block daily routine & task completion tracking
- `GET /api/indoor` | `PATCH /api/indoor/checklist/:itemId` — Room CADR sizing, ventilation window, and checklist
- `GET /api/impact` | `POST /api/impact/log` | `DELETE /api/impact/:id` — Sustainable lifestyle alternatives & auditable CO₂e/fuel/cost tracker
- `GET /api/alerts` | `PUT /api/alerts/settings` | `POST /api/alerts/:alertId/read` — 5-part family protection alerts
- `GET /api/community` | `POST /api/community/:id/join` — Privacy-preserving voluntary clean-air challenges & ward aggregates
- `GET/DELETE /api/ai/history` | `POST /api/ai/chat` | `POST /api/ai/daily-brief` | `POST /api/ai/feedback` — Grounded GenAI environmental advisor
