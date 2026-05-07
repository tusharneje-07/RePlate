# RePlate

RePlate is a multi-role food rescue and redistribution platform built for the Indian market. It connects food **Sellers** (restaurants, home kitchens, cloud kitchens) with **Consumers** who buy surplus food at a discount, **NGOs** that collect bulk donations for redistribution, and food safety **Inspectors** who verify compliance and handle complaints. The goal is to reduce food waste while making affordable meals accessible.

---

## Table of Contents

- [Architecture Overview](#architecture-overview)
- [Tech Stack](#tech-stack)
- [Prerequisites](#prerequisites)
- [Getting Started](#getting-started)
- [Environment Variables](#environment-variables)
- [Database Migrations](#database-migrations)
- [Project Structure](#project-structure)
- [User Roles & Routing](#user-roles--routing)
- [Authentication Flow](#authentication-flow)
- [API Reference](#api-reference)
- [AI Agent System](#ai-agent-system)
- [Frontend Modules](#frontend-modules)
- [Key Implementation Notes](#key-implementation-notes)

---

## Architecture Overview

```
Browser ──── React + Vite (TypeScript) ──── Axios ────┐
                                                       ▼
                                            FastAPI (Python)
                                                 │
                              ┌──────────────────┼──────────────────┐
                              ▼                  ▼                  ▼
                        MySQL (async         WorkOS Auth        Groq LLM
                        SQLAlchemy)          (OAuth + JWT)      (AI Agents)
```

- **Backend:** FastAPI with async SQLAlchemy 2.0 + MySQL (aiomysql)
- **Auth:** WorkOS AuthKit (OAuth hosted UI) → backend issues its own HS256 JWT
- **AI:** 6 Groq-powered agents (Llama 3.3-70b) for pricing, matching, safety, and recommendations
- **Frontend:** React 19 + Vite 7, Zustand for state, TanStack Query for server state, Tailwind CSS v4

---

## Tech Stack

### Backend

| Layer | Technology | Version |
|---|---|---|
| Language | Python | 3.12+ |
| Framework | FastAPI | 0.115+ |
| ASGI Server | Uvicorn | 0.32+ |
| ORM | SQLAlchemy (async) | 2.0+ |
| Async MySQL driver | aiomysql | 0.2+ |
| Sync MySQL driver (Alembic) | PyMySQL | 1.1+ |
| Database | MySQL | 8.x |
| Migrations | Alembic | 1.14+ |
| Data validation | Pydantic v2 | 2.10+ |
| Settings | pydantic-settings | 2.7+ |
| Auth provider | WorkOS AuthKit | SDK 5.x |
| JWT | python-jose (HS256) | 3.3+ |
| AI / LLM | Groq SDK (Llama 3.3-70b) | latest |
| HTTP client | httpx | 0.28+ |
| Package manager | uv | latest |
| Linter | Ruff | 0.8+ |

### Frontend

| Layer | Technology | Version |
|---|---|---|
| Language | TypeScript | 5.9 |
| Framework | React | 19 |
| Build tool | Vite | 7 |
| Package manager | Bun | latest |
| Routing | React Router DOM | v7 |
| Server state | TanStack Query | v5 |
| Client state | Zustand | v5 |
| HTTP client | Axios | 1.x |
| Styling | Tailwind CSS | v4 |
| Component library | shadcn/ui (Radix UI) | latest |
| Animation | motion/react (Framer Motion) | 12.x |
| Icons | lucide-react | 0.577+ |
| Map | Leaflet + react-leaflet | 1.9 / 5.x |
| Linter / Formatter | Biome | 2.x |

---

## Prerequisites

- **Python 3.12+** and **uv** (Python package manager)
- **Node.js** and **Bun** (JavaScript package manager)
- **MySQL 8.x** running locally
- A **WorkOS** account with an AuthKit application configured
- A **Groq** API key (for AI features)

---

## Getting Started

### 1. Clone and enter the project

```bash
git clone <repo-url>
cd RePlate
```

### 2. Set up the database

Create a MySQL database and user:

```sql
CREATE DATABASE replate_db;
CREATE USER 'replate_user'@'localhost' IDENTIFIED BY 'your_password';
GRANT ALL PRIVILEGES ON replate_db.* TO 'replate_user'@'localhost';
FLUSH PRIVILEGES;
```

### 3. Configure environment variables

Copy the example files and fill in your values (see [Environment Variables](#environment-variables)):

```bash
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
```

### 4. Install backend dependencies and run migrations

```bash
cd backend
uv sync
uv run alembic upgrade head
```

### 5. Install frontend dependencies

```bash
cd frontend
bun install
```

### 6. Start both services

From the repo root you can start each in a separate terminal, or use the provided script:

```bash
# Backend (from RePlate/backend/)
uv run uvicorn app.main:app --reload --port 8000

# Frontend (from RePlate/frontend/)
bun run dev
```

Or use the convenience script from the repo root:

```bash
bash startApp.sh
```

| Service | URL |
|---|---|
| Frontend app | http://localhost:5173 |
| Backend API | http://localhost:8000/api/v1 |
| Swagger UI (dev) | http://localhost:8000/docs |
| Health check | http://localhost:8000/health |

If port 8000 is already in use:

```bash
fuser -k 8000/tcp
```

---

## Environment Variables

### Backend — `RePlate/backend/.env`

```env
APP_NAME="RePlate API"
DEBUG=true
ENVIRONMENT=development

ALLOWED_ORIGINS=http://localhost:5173,http://localhost:3000

DB_HOST=localhost
DB_PORT=3306
DB_NAME=replate_db
DB_USER=replate_user
DB_PASSWORD=your_mysql_password

WORKOS_API_KEY=sk_...
WORKOS_CLIENT_ID=client_...
WORKOS_REDIRECT_URI=http://localhost:8000/api/v1/auth/callback

JWT_SECRET_KEY=generate_with_openssl_rand_hex_32
JWT_ALGORITHM=HS256
JWT_ACCESS_TOKEN_EXPIRE_MINUTES=10080   # 7 days

GROQ_API_KEY=gsk_...

FRONTEND_URL=http://localhost:5173
BACKEND_URL=http://localhost:8000
```

Generate a secure JWT secret:

```bash
openssl rand -hex 32
```

> **Local dev without WorkOS:** Set `SKIP_WORKOS=true` in `.env` to use the local email/password fallback (bcrypt hashed). This bypasses the OAuth redirect entirely.

### Frontend — `RePlate/frontend/.env`

```env
VITE_API_URL=http://localhost:8000
```

---

## Database Migrations

All migrations are managed with Alembic from the `backend/` directory:

```bash
# Apply all pending migrations
uv run alembic upgrade head

# Create a new migration after model changes
uv run alembic revision --autogenerate -m "short description"

# Downgrade one step
uv run alembic downgrade -1
```

The 13 migrations in `alembic/versions/` cover the full schema progression: initial users/profiles, food listings and orders, NGO tables, seller domain expansion, inspector backend tables, extended profile fields, geolocation columns, and auth additions (WorkOS + local password support).

---

## Project Structure

```
RePlate/
├── startApp.sh
├── project_compact.md
├── requirements.txt               # Top-level pip requirements (mirrors backend)
│
├── backend/
│   ├── .env / .env.example
│   ├── pyproject.toml
│   ├── alembic.ini
│   ├── test_smart_pricing_agent.py # Standalone AI agent test (no DB needed)
│   ├── alembic/
│   │   └── versions/              # 13 migration files
│   ├── agent_systems/             # Groq AI agents
│   │   ├── groq_client.py
│   │   ├── smart_pricing_agent.py
│   │   ├── food_rescue_strategy_agent.py
│   │   ├── ngo_matching_agent.py
│   │   ├── food_safety_agent.py
│   │   ├── consumer_recommendation_agent.py
│   │   └── demand_forecast_agent.py
│   ├── scripts/                   # Seed and utility scripts
│   └── app/
│       ├── main.py                # App factory, middleware
│       ├── core/
│       │   ├── config.py          # Pydantic Settings
│       │   ├── database.py        # Async engine + session
│       │   ├── deps.py            # FastAPI dependency injectors
│       │   ├── security.py        # JWT helpers
│       │   └── impact_constants.py
│       ├── models/
│       │   ├── base.py            # DeclarativeBase, mixins
│       │   ├── user.py            # User, UserRole enum
│       │   ├── profiles.py        # ConsumerProfile, SellerProfile, NGOProfile, InspectorProfile
│       │   ├── food.py            # FoodListing, Order, OrderItem, Favorite, ImpactStat,
│       │   │                      # SellerReview, SellerNotification, InventoryTracking,
│       │   │                      # NGOListingRequest, PickupRecord, FoodInspection,
│       │   │                      # ViolationRecord, ComplaintRecord, + more
│       │   └── ngo.py             # NGO-specific models
│       ├── schemas/               # Pydantic request/response schemas
│       ├── repositories/          # Async SQLAlchemy query layer
│       ├── services/              # Business logic layer
│       └── api/v1/
│           ├── router.py          # Registers all 21 sub-routers
│           ├── auth.py            # /auth
│           ├── profiles.py        # /profiles
│           ├── admin.py           # /admin
│           ├── listings.py        # /listings
│           ├── orders.py          # /orders
│           ├── favorites.py       # /favorites
│           ├── impact.py          # /impact
│           ├── seller.py          # /seller (dashboard-facing)
│           ├── uploads.py         # /uploads
│           ├── ngo.py             # /ngo-backend
│           ├── consumer.py        # /consumer
│           ├── ai_features.py     # /ai
│           ├── inspector_module.py    # /inspector-backend
│           ├── sellers_module.py      # /seller-backend/profile
│           ├── listings_module.py     # /seller-backend/listings
│           ├── inventory_module.py    # /seller-backend/inventory
│           ├── orders_module.py       # /seller-backend/orders
│           ├── donations_module.py    # /seller-backend/donations
│           ├── pickups_module.py      # /seller-backend/pickups
│           ├── notifications_module.py # /seller-backend/notifications
│           └── analytics_module.py   # /seller-backend/analytics
│
└── frontend/
    ├── .env / .env.example
    ├── package.json
    ├── vite.config.ts
    ├── tsconfig.json
    ├── biome.json
    ├── components.json            # shadcn/ui config
    └── src/
        ├── main.tsx
        ├── App.tsx                # All routes + guards
        ├── types/index.ts         # All TypeScript interfaces (~920 lines)
        ├── contexts/
        │   └── AuthContext.tsx
        ├── hooks/
        │   └── useAuth.ts
        ├── lib/
        │   ├── api.ts             # Axios client + all typed API objects
        │   ├── utils.ts
        │   ├── mappers.ts         # Backend ↔ frontend shape converters
        │   ├── geolocation.ts
        │   ├── motion.ts          # Shared animation variants
        │   └── query-keys.ts
        ├── stores/                # 9 Zustand stores
        │   ├── cart-store.ts      # Persisted to localStorage
        │   ├── seller-store.ts / seller-ui-store.ts
        │   ├── ngo-store.ts / ngo-ui-store.ts
        │   ├── inspector-store.ts / inspector-ui-store.ts
        │   ├── ui-store.ts
        │   └── location-store.ts
        ├── components/
        │   ├── layout/            # 4 role layouts × (layout + navbar + sidebar + mobile-nav)
        │   ├── common/            # Shared: food-card, order-card, seller-card,
        │   │                      # search-bar, filter-panel, floating-cart-bar,
        │   │                      # pickup-qr-code, impact-stat-card, rating, etc.
        │   ├── ui/                # shadcn/ui primitives
        │   └── ai/                # AIRecommendations, ComplaintTriagePanel,
        │                          # DemandForecastCard, NGOMatchPanel
        ├── pages/
        │   ├── auth/              # login, callback, select-role
        │   ├── onboarding/        # consumer (shared onboarding entry)
        │   ├── consumer/          # 13 pages
        │   ├── seller/            # 9 pages (incl. onboarding)
        │   ├── ngo/               # 9 pages (incl. onboarding)
        │   └── inspector/         # 10 pages
        └── data/                  # Mock data (DO NOT DELETE — used in dev)
            ├── mock.ts
            ├── seller-mock.ts
            ├── ngo-mock.ts
            └── inspector-mock.ts
```

---

## User Roles & Routing

| Role | Self-onboarding | Onboarding route | Dashboard route |
|---|---|---|---|
| consumer | Yes | `/consumer/onboarding` | `/consumer/dashboard` |
| seller | Yes | `/seller/onboarding` | `/seller/dashboard` |
| ngo | Yes | `/ngo/onboarding` | `/ngo/dashboard` |
| inspector | No (admin-provisioned) | — | `/inspector/dashboard` |
| admin | No | — | `/admin/dashboard` |

- Role is set during `/auth/select-role` after first login.
- `is_onboarded` is flipped to `true` when the user completes their onboarding form.
- `AuthGuard` blocks all module routes from unauthenticated users.
- `OnboardingGuard` redirects users who haven't completed onboarding (except `inspector` and `admin`).
- `RootRedirect` at `/` routes users to the correct dashboard based on their role and onboarding state.

---

## Authentication Flow

```
Browser → WorkOS AuthKit (hosted login UI)
       → WorkOS redirects to: GET /api/v1/auth/callback?code=...
       → Backend exchanges code with WorkOS → gets WorkOS user
       → Backend upserts User in MySQL → issues own HS256 JWT
       → Redirects to: FRONTEND_URL/auth/callback#token=<jwt>
       → Frontend reads token from URL fragment → stores in localStorage as replate_token
       → All subsequent API calls: Authorization: Bearer <token>
```

- **JWT payload:** `sub` (user_id), `email`, `role`, `is_onboarded`
- **Token TTL:** 7 days
- **Axios interceptor** in `lib/api.ts` attaches the token automatically and handles `401` (redirect to login) and `403` (redirect to role dashboard).

---

## API Reference

All endpoints are under `/api/v1`.

### Auth — `/auth`

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/auth/login` | Public | Redirect to WorkOS hosted login |
| GET | `/auth/callback` | Public | WorkOS OAuth callback → issues JWT |
| POST | `/auth/login` | Public | Local login (SKIP_WORKOS only) |
| POST | `/auth/register` | Public | Local register (SKIP_WORKOS only) |
| GET | `/auth/me` | JWT | Get current user |
| PATCH | `/auth/me` | JWT | Update first/last name |
| PATCH | `/auth/me/role` | JWT | Set role (consumer/seller/ngo) |
| DELETE | `/auth/me` | JWT | Hard-delete account |
| POST | `/auth/signout` | JWT | Sign out |

### Profiles — `/profiles`

| Method | Path | Auth | Description |
|---|---|---|---|
| GET/PUT | `/profiles/consumer` | Consumer | Consumer profile |
| GET/PUT | `/profiles/seller` | Seller | Seller profile |
| GET/PUT | `/profiles/ngo` | NGO | NGO profile |
| GET/PUT | `/profiles/inspector` | Inspector | Inspector profile |

### Listings — `/listings`

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/listings` | Optional | Browse all active listings (geo-aware, filterable) |
| GET | `/listings/{id}` | Optional | Get single listing |
| POST | `/listings` | Seller | Create a listing |
| PUT | `/listings/{id}` | Seller | Update listing |
| DELETE | `/listings/{id}` | Seller | Delete listing |

### Orders — `/orders`

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/orders` | Consumer | List my orders |
| POST | `/orders` | Consumer | Place order (triggers impact stat update) |
| GET | `/orders/{id}` | Consumer | Order detail |
| PATCH | `/orders/{id}/cancel` | Consumer | Cancel order |

### Favorites — `/favorites`

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/favorites` | Consumer | List favorites |
| POST | `/favorites` | Consumer | Add food or seller to favorites |
| DELETE | `/favorites/{id}` | Consumer | Remove favorite |

### Impact — `/impact`

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/impact/me` | Consumer | Consumer sustainability stats (CO₂, savings, meals rescued, streak) |

### Uploads — `/uploads`

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/uploads` | JWT | Upload image or PDF (max 10 MB, UUID filename) |

### Seller Dashboard — `/seller`

Full seller dashboard: listings CRUD, orders management, analytics, notifications, reviews + replies, inspection request/status, AI pricing.

### Seller Backend — `/seller-backend`

Domain-split seller backend modules:

| Prefix | Module |
|---|---|
| `/seller-backend/profile` | Seller profile |
| `/seller-backend/listings` | Listings with auto-expire |
| `/seller-backend/inventory` | Inventory tracking |
| `/seller-backend/orders` | Order management |
| `/seller-backend/donations` | Donation management |
| `/seller-backend/pickups` | Pickup management |
| `/seller-backend/notifications` | Notifications |
| `/seller-backend/analytics` | Analytics (today / weekly / monthly / yearly) |

### NGO Backend — `/ngo-backend`

Profile, donation discovery/browse, donation requests, pickups, distributions, dashboard analytics, notifications, service areas.

### Inspector Backend — `/inspector-backend`

Profile, seller/NGO verifications, inspections, violations, complaints, schedules, listing moderation, pending inspection queue, approve/reject listings, analytics, impact, notifications.

### Consumer — `/consumer`

Consumer-initiated surplus donation creation, listing, and detail.

### Admin — `/admin`

Admin-only: create and provision inspector accounts via WorkOS.

### AI Features — `/ai`

| Method | Path | Description |
|---|---|---|
| POST | `/ai/smart-pricing` | Dynamic pricing suggestions (expiry, weather, demand) |
| POST | `/ai/ngo-matching` | Match NGOs to optimal donations |
| POST | `/ai/complaint-triage` | Triage and prioritise food safety complaints |
| POST | `/ai/safety-score` | Score a listing for food safety risk |
| POST | `/ai/recommendations` | Personalised food recommendations for a consumer |
| POST | `/ai/demand-forecast` | Demand forecast + waste risk alerts |
| GET | `/ai/health` | AI subsystem health check |

### Health

| Method | Path | Description |
|---|---|---|
| GET | `/health` | Server health check |

---

## AI Agent System

All agents live in `backend/agent_systems/` and share a single Groq client (`groq_client.py`) configured for `llama-3.3-70b-versatile`.

| Agent | File | Purpose |
|---|---|---|
| Smart Pricing | `smart_pricing_agent.py` | Suggests dynamic price reductions based on time-to-expiry, weather conditions, and local demand signals |
| Food Rescue Strategy | `food_rescue_strategy_agent.py` | Generates food rescue and redistribution strategies for sellers; used by the seller dashboard AI pricing endpoint |
| NGO Matching | `ngo_matching_agent.py` | Matches available food donations to the most suitable registered NGOs |
| Food Safety | `food_safety_agent.py` | Triages consumer complaints and scores listings for food safety risk |
| Consumer Recommendations | `consumer_recommendation_agent.py` | Generates personalised food recommendations based on consumer history and preferences |
| Demand Forecast | `demand_forecast_agent.py` | Forecasts demand and identifies waste risk alerts for sellers |

All agents read credentials via `app.core.config.settings` — no separate agent `.env` file is needed. The `GROQ_API_KEY` and `GROQ_MODEL` values come from `backend/.env`.

---

## Frontend Modules

### Consumer (13 pages)

`dashboard`, `browse`, `food/:foodId`, `cart`, `checkout`, `orders`, `orders/:orderId`, `favorites`, `impact`, `profile`, `settings`, `list-food`, `my-donations`

### Seller (9 pages)

`dashboard`, `listings`, `listings/new`, `listings/:listingId`, `orders`, `orders/:orderId`, `analytics`, `notifications`, `reviews`, `profile`, `settings`

### NGO (8 pages)

`dashboard`, `discover`, `pickups`, `pickups/:pickupId`, `impact`, `notifications`, `profile`, `settings`

### Inspector (10 pages)

`dashboard`, `listings`, `listings/:listingId`, `complaints`, `complaints/:complaintId`, `inspections`, `history`, `impact`, `profile`, `settings`

---

## Frontend Utilities

```bash
# From RePlate/frontend/

bun run dev          # Start dev server
bun run build        # Production build (tsc + vite build)
bun run preview      # Preview production build locally
bun run tsc --noEmit # TypeScript type-check only
bun run check        # Biome lint + format check
bun run lint:fix     # Auto-fix lint issues
bun run format       # Auto-format all files
```

---

## Key Implementation Notes

- **CSS design tokens** — Each role has its own CSS custom property namespace: Consumer uses `--color-brand-*`, Seller uses `--color-seller-*`, NGO uses `--color-ngo-*`, Inspector uses `--color-inspector-*`. Never mix role tokens across modules.

- **Delete Account** — Hard delete: calls `DELETE /auth/me`, which removes the user from WorkOS (best-effort, errors swallowed), then hard-deletes the MySQL row. All child rows cascade via `ON DELETE CASCADE` at both the DB and ORM level. `AuthContext.deleteAccount()` then clears `localStorage`, `sessionStorage`, all cookies, resets user state, and redirects to `/auth/login`.

- **CORS on 500** — `CORSOnErrorMiddleware` in `main.py` injects CORS headers even on unhandled 500 errors, preventing a misleading double-error in the browser console.

- **Seller onboarding map** — Step 2 uses an interactive Leaflet map with a draggable pin, auto-GPS on mount, and Nominatim reverse geocoding (debounced 600 ms). Manual address fields are shown below the map.

- **Cart persistence** — The Zustand cart store uses the `persist` middleware, storing cart state in `localStorage` under the key `replate-cart`.

- **Impact stats** — Calculated server-side using constants in `impact_constants.py` (CO₂ per food kg, meals per kg, etc.). Stats are updated when an order is placed and can be recalculated in bulk via `scripts/recalculate_impact_stats.py`.

- **Mock data** — `src/data/mock.ts` must not be deleted; it is used across the consumer module and potentially other roles in development. Seller, NGO, and Inspector mock data are in their own files in `src/data/`.

- **Static file serving** — Uploaded files are stored in `backend/uploads/` and served at `/uploads/<filename>` via FastAPI's `StaticFiles` mount.

- **Alembic heads** — Two merge migrations have been applied: `c1d2e3f4a5b6` (NGO + auth branch merge) and `cd9d50548025` (donor_role + password_hash merge). Always run `uv run alembic heads` to check for multiple heads before creating a new migration. If you see multiple heads, run `uv run alembic merge heads -m "merge_description"` then `uv run alembic upgrade heads`.
