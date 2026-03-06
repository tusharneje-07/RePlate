# RePlate — Project Compact

> Single-source reference for the entire project. Keep this up to date as the codebase evolves.

---

## What is RePlate?

RePlate is a food redistribution platform that connects food **Sellers** (restaurants, home kitchens) with **Consumers** who can buy surplus food at a discount, **NGOs** that can request bulk pickups, and **Inspectors** who verify compliance. The goal is to reduce food waste while making affordable meals accessible.

---

## Run Commands

### Kill port conflict first (if needed)
```bash
fuser -k 8000/tcp
```

### Backend
```bash
cd RePlate/backend
uv run uvicorn app.main:app --reload --port 8000
```
- API base: `http://localhost:8000/api/v1`
- Swagger UI (dev only): `http://localhost:8000/docs`
- Health check: `http://localhost:8000/health`

### Frontend
```bash
cd RePlate/frontend
bun run dev
```
- App: `http://localhost:5173`

### Database Migrations (Alembic)
```bash
cd RePlate/backend

# Apply all pending migrations
uv run alembic upgrade head

# Create a new migration after model changes
uv run alembic revision --autogenerate -m "description"

# Downgrade one step
uv run alembic downgrade -1
```

### Frontend Utilities
```bash
cd RePlate/frontend

bun run tsc --noEmit      # TypeScript type-check (no emit)
bun run check             # Biome check (lint + format)
bun run lint:fix          # Auto-fix lint issues
bun run format            # Auto-format all files
bun run build             # Production build (tsc + vite build)
bun run preview           # Preview production build locally
```

---

## Directory Structure

```
RePlate/
├── backend/
│   ├── app/
│   │   ├── main.py                  # FastAPI app factory, middleware
│   │   ├── core/
│   │   │   ├── config.py            # Pydantic Settings (reads .env)
│   │   │   ├── database.py          # Async SQLAlchemy engine + session
│   │   │   └── security.py          # JWT encode/decode helpers
│   │   ├── models/
│   │   │   ├── base.py              # SQLAlchemy DeclarativeBase
│   │   │   ├── user.py              # User model + all FK relationships
│   │   │   ├── profiles.py          # ConsumerProfile, SellerProfile, NgoProfile, InspectorProfile
│   │   │   └── food.py              # FoodListing, Order, Favorite, ImpactStats
│   │   ├── schemas/                 # Pydantic request/response schemas
│   │   ├── repositories/            # DB query layer (async SQLAlchemy ORM)
│   │   ├── services/                # Business logic (AuthService, WorkOSService, …)
│   │   └── api/v1/
│   │       ├── router.py            # Registers all sub-routers under /api/v1
│   │       ├── auth.py              # /auth/* — login, callback, /me, delete
│   │       ├── profiles.py          # /profiles/* — consumer, seller, ngo, inspector
│   │       ├── listings.py          # /listings/*
│   │       ├── orders.py            # /orders/*
│   │       ├── favorites.py         # /favorites/*
│   │       ├── impact.py            # /impact/*
│   │       └── admin.py             # /admin/*
│   ├── alembic/                     # Migration scripts
│   ├── alembic.ini
│   ├── pyproject.toml
│   └── .env                         # secrets (never commit)
│
└── frontend/
    ├── src/
    │   ├── App.tsx                  # Root router, RootRedirect (checks isOnboarded)
    │   ├── main.tsx
    │   ├── contexts/
    │   │   └── AuthContext.tsx      # AuthProvider: user state, login, logout, deleteAccount
    │   ├── hooks/
    │   │   └── useAuth.ts           # Thin hook wrapping AuthContext
    │   ├── lib/
    │   │   ├── api.ts               # Axios instance + all API call functions
    │   │   ├── motion.ts            # Shared framer-motion variants
    │   │   ├── utils.ts             # cn(), formatCurrency(), etc.
    │   │   └── mappers.ts           # Backend ↔ frontend shape converters
    │   ├── data/
    │   │   ├── mock.ts              # Consumer/shared mock data (DO NOT DELETE)
    │   │   └── seller-mock.ts       # Seller mock data
    │   ├── components/
    │   │   └── ui/                  # shadcn/ui components
    │   └── pages/
    │       ├── auth/                # login.tsx, callback.tsx, select-role.tsx
    │       ├── onboarding/          # consumer.tsx (shared onboarding entry)
    │       ├── consumer/            # dashboard, browse, food-detail, cart, checkout,
    │       │                        # orders, order-detail, favorites, impact,
    │       │                        # profile, settings, list-food
    │       ├── seller/              # dashboard, listings, orders, analytics,
    │       │                        # reviews, notifications, profile,
    │       │                        # settings, onboarding
    │       ├── ngo/                 # dashboard, discover, pickups, pickup-detail,
    │       │                        # impact, notifications, profile, settings, onboarding
    │       └── inspector/           # dashboard, listings, listing-detail,
    │                                # inspections, complaints, complaint-detail,
    │                                # history, impact, profile, settings
    ├── package.json
    ├── vite.config.ts
    ├── tsconfig.json
    ├── biome.json
    └── .env                         # secrets (never commit)
```

---

## Tech Stack

### Backend

| Layer | Technology | Version |
|---|---|---|
| Language | Python | 3.12+ |
| Framework | FastAPI | 0.115+ |
| ASGI Server | Uvicorn (standard) | 0.32+ |
| ORM | SQLAlchemy (async) | 2.0+ |
| Async MySQL driver | aiomysql | 0.2+ |
| Sync MySQL driver (Alembic) | PyMySQL | 1.1+ |
| Database | MySQL | 8.x |
| Migrations | Alembic | 1.14+ |
| Data validation | Pydantic v2 | 2.10+ |
| Settings | pydantic-settings | 2.7+ |
| Auth provider | WorkOS AuthKit | SDK 5.x |
| JWT | python-jose (HS256) | 3.3+ |
| HTTP client | httpx | 0.28+ |
| Package manager | uv | latest |
| Linter | Ruff | 0.8+ |
| Testing | pytest + pytest-asyncio | 8.x |

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

WORKOS_API_KEY=KEY_HERE
WORKOS_CLIENT_ID=ID_HERE
WORKOS_REDIRECT_URI=http://localhost:8000/api/v1/auth/callback

JWT_SECRET_KEY=generate_with_openssl_rand_hex_32
JWT_ALGORITHM=HS256
JWT_ACCESS_TOKEN_EXPIRE_MINUTES=10080   # 7 days

FRONTEND_URL=http://localhost:5173
```

Generate a JWT secret:
```bash
openssl rand -hex 32
```

### Frontend — `RePlate/frontend/.env`

```env
VITE_API_URL=http://localhost:8000
```

---

## Authentication Flow

```
Browser → WorkOS AuthKit (hosted login UI)
       → WorkOS redirects to: GET /api/v1/auth/callback?code=...
       → Backend exchanges code with WorkOS → gets WorkOS user
       → Backend upserts User in MySQL → issues own HS256 JWT
       → Redirects to: FRONTEND_URL/auth/callback?token=<jwt>
       → Frontend stores token in localStorage as replate_token
       → All subsequent API calls: Authorization: Bearer <token>
```

- JWT payload: `sub` (user_id), `email`, `role`, `is_onboarded`
- Token TTL: 7 days
- `RootRedirect` in `App.tsx` checks `user.isOnboarded` — sends to `/<role>/onboarding` if false, else `/<role>/dashboard`

---

## API Endpoints (v1)

All under `/api/v1`.

### Auth — `/auth`
| Method | Path | Description |
|---|---|---|
| GET | `/auth/login` | Redirect to WorkOS hosted login |
| GET | `/auth/callback` | WorkOS OAuth callback → issues JWT |
| GET | `/auth/me` | Get current user (requires JWT) |
| PATCH | `/auth/me` | Update first/last name |
| DELETE | `/auth/me` | Hard-delete account (WorkOS + DB cascade) |

### Profiles — `/profiles`
| Method | Path | Description |
|---|---|---|
| GET/PUT | `/profiles/consumer` | Consumer profile |
| GET/PUT | `/profiles/seller` | Seller profile |
| GET/PUT | `/profiles/ngo` | NGO profile |
| GET/PUT | `/profiles/inspector` | Inspector profile |

### Listings — `/listings`
| Method | Path | Description |
|---|---|---|
| GET | `/listings` | List all active food listings |
| POST | `/listings` | Create listing (seller) |
| GET | `/listings/{id}` | Get single listing |
| PUT | `/listings/{id}` | Update listing |
| DELETE | `/listings/{id}` | Delete listing |

### Orders — `/orders`
| Method | Path | Description |
|---|---|---|
| GET | `/orders` | List my orders |
| POST | `/orders` | Place order |
| GET | `/orders/{id}` | Order detail |
| PATCH | `/orders/{id}/status` | Update order status |

### Favorites — `/favorites`
| Method | Path | Description |
|---|---|---|
| GET | `/favorites` | List my favorites |
| POST | `/favorites/{listing_id}` | Add to favorites |
| DELETE | `/favorites/{listing_id}` | Remove from favorites |

### Impact — `/impact`
| Method | Path | Description |
|---|---|---|
| GET | `/impact/me` | Get my impact stats |

### Health
| Method | Path | Description |
|---|---|---|
| GET | `/health` | Server health check |

---

## Database Schema (key tables)

```
users
  id, workos_id, email, first_name, last_name
  role (consumer | seller | ngo | inspector | admin)
  is_onboarded, created_at, updated_at

consumer_profiles   → FK users.id ON DELETE CASCADE
seller_profiles     → FK users.id ON DELETE CASCADE
ngo_profiles        → FK users.id ON DELETE CASCADE
inspector_profiles  → FK users.id ON DELETE CASCADE

food_listings       → FK seller_profiles.id ON DELETE CASCADE
orders              → FK food_listings.id, consumer_profiles.id ON DELETE CASCADE
favorites           → FK consumer_profiles.id, food_listings.id ON DELETE CASCADE
impact_stats        → FK users.id ON DELETE CASCADE
```

All child tables cascade-delete when parent `users` row is deleted (both at DB level `ON DELETE CASCADE` and SQLAlchemy ORM level `cascade="all, delete-orphan"` + `passive_deletes=True`).

---

## User Roles & Onboarding

| Role | Onboarding route | Dashboard route |
|---|---|---|
| consumer | `/consumer/onboarding` | `/consumer/dashboard` |
| seller | `/seller/onboarding` | `/seller/dashboard` |
| ngo | `/ngo/onboarding` | `/ngo/dashboard` |
| inspector | — | `/inspector/dashboard` |
| admin | — | `/admin/dashboard` |

Role is set during `/auth/select-role` after first login. `is_onboarded` is flipped to `true` when the user completes their onboarding flow.

---

## Key Implementation Notes

- **Delete Account** — hard delete: calls `DELETE /auth/me`, which deletes from WorkOS (best-effort, swallows errors), then hard-deletes the DB row. All child rows cascade. `AuthContext.deleteAccount()` then clears `localStorage`, `sessionStorage`, all cookies, resets user state, and redirects to `/auth/login`.
- **CORS on 500** — `CORSOnErrorMiddleware` in `main.py` ensures CORS headers are injected even on unhandled 500 errors (avoids double-error in browser console).
- **Seller onboarding Step 2** — live Leaflet map with draggable pin, auto-GPS on mount, Nominatim reverse geocode (debounced 600ms), manual address fields below.
- **JWT stored** — `localStorage` key: `replate_token`. Axios interceptor in `lib/api.ts` attaches it as `Authorization: Bearer <token>` on every request.
- **mock data** — `src/data/mock.ts` must NOT be deleted (used across consumer + potentially other roles). Seller mock data is in `src/data/seller-mock.ts`.
- **CSS design tokens** — Consumer uses `--color-*` / `--color-brand-*`. Seller uses `--color-seller-*`. NGO and Inspector have their own prefix tokens. Never mix role tokens.
