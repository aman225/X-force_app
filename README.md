# X-Force Thunder Slash ⚡

> A Fruit Ninja-style mini-game embedded in Blinkit's order tracking page,  
> created as a branded activation for **Coca-Cola India's X-Force energy drink**.

---

## Overview

When a user places an order on Blinkit and the rider is out for delivery, a mini-game appears on the order tracking page. Thunder bolts fall from the top of the screen. The user slashes them with their finger (mobile) or mouse (desktop). One bolt is a special glowing **X-Force bolt** — if the user slices it, they win a free X-Force can on their next Blinkit order.

### Architecture

```
X-force_app/
├── game/    PixiJS v8 game engine (TypeScript + Vite)
├── api/     Fastify backend (Node.js + TypeScript + Prisma + Redis)
├── ui/      React component for Blinkit integration
└── infra/   Docker Compose (postgres, redis, api, game-dev)
```

---

## Prerequisites

- **Node.js** ≥ 20
- **Docker Desktop** (for the full stack)
- **pnpm** or **npm** (commands below use `npm`)

---

## Quick Start (Docker)

### 1. Configure environment

```bash
cp .env.example .env
# Edit .env — set BLINKIT_JWT_SECRET and SESSION_JWT_SECRET
```

### 2. Start all services

```bash
docker compose up --build
```

Services started:
| Service | URL |
|---|---|
| API | http://localhost:3001 |
| API health | http://localhost:3001/health |
| Game dev (Vite) | http://localhost:5173 |
| PostgreSQL | localhost:5432 |
| Redis | localhost:6379 |

### 3. Run database migrations

Migrations run automatically inside the `api` container on startup (`prisma migrate deploy`).

For manual migration (local dev):
```bash
cd api
npx prisma migrate dev --name init
```

---

## Local Development (without Docker)

### API

```bash
cd api
npm install
cp ../.env.example .env   # Edit with your local DB/Redis URLs
npx prisma generate
npx prisma migrate dev
npm run dev               # Starts on port 3001 with tsx watch
```

### Game Engine (PixiJS testbed)

```bash
cd game
npm install
npm run dev               # Opens http://localhost:5173 — standalone game testbed
```

The testbed (`game/index.html`) lets you:
- Click **▶ Start Game** to begin spawning bolts
- Slash bolts with your mouse/touch
- See the X-Force bolt index logged (for testing purposes only)
- No API required

### React Widget Demo

```bash
cd ui
npm install
# Open ui/demo/index.html directly in a browser (no build needed)
# or serve it: npx serve ui/demo
```

---

## API Reference

All routes are prefixed with `/api/v1`.

### `POST /api/v1/game/session/start`

Starts a new game session for an order.

**Request body:**
```json
{
  "orderId": "ord_abc123",
  "userId": "usr_xyz789",
  "orderToken": "<Blinkit-issued JWT>"
}
```

**Response (eligible):**
```json
{
  "sessionId": "clx...",
  "sessionToken": "<15-min JWT>",
  "totalBolts": 17,
  "gameConfig": {
    "boltSpeedMin": 150,
    "boltSpeedMax": 280,
    "durationSeconds": 30
  },
  "eligible": true
}
```

**Response (cooldown — won within 7 days):**
```json
{ "eligible": false, "reason": "cooldown" }
```

> ⚠️ `xforceBoltIdx` is **never** returned. It lives only in PostgreSQL.

---

### `POST /api/v1/game/slash`

Records a bolt slash. The server compares `boltIndex` to the stored `xforceBoltIdx`.

**Request body:**
```json
{
  "sessionToken": "<session JWT>",
  "boltIndex": 7,
  "slashX": 214.5,
  "slashY": 180.2,
  "timestamp": 1714920000000
}
```

**Response (regular bolt):**
```json
{ "hit": true, "isXForce": false, "score": 150 }
```

**Response (X-Force bolt):**
```json
{
  "hit": true,
  "isXForce": true,
  "score": 200,
  "reward": {
    "id": "clx...",
    "couponCode": "XFORCE-AB12CD34",
    "expiresAt": "2024-08-15T00:00:00.000Z"
  }
}
```

**Anti-cheat checks:**
- Timestamp must be within ±500ms of server clock
- Max 3 slashes per 200ms window (Redis sorted set)

---

### `POST /api/v1/game/session/end`

Marks session as ended. Must be called when game timer expires or order is delivered.

**Request body:**
```json
{ "sessionToken": "<session JWT>", "finalScore": 250 }
```

---

### `GET /api/v1/rewards/status/:userId`

Returns all active (non-expired) rewards for a user.

---

## Security Design

| Concern | Implementation |
|---|---|
| X-Force bolt index never exposed | Stored only in PostgreSQL, never in JWT/response |
| Slash timestamp anti-cheat | Server rejects if `|clientTs - serverTs| > 500ms` |
| Slash rate anti-cheat | Redis sorted set: reject if >3 slashes in 200ms |
| One reward per 7 days | Redis TTL key `reward:cooldown:{userId}` |
| Session token expiry | 15-minute JWT, signed with `SESSION_JWT_SECRET` |
| CORS | Allowlist only (`ALLOWED_ORIGINS` env var) |
| Rate limiting | 60 req/min per IP (`@fastify/rate-limit`) |

---

## Blinkit Integration

### 1. Install the widget package

```bash
npm install @yourscope/xforce-thunderslash-ui
```

### 2. Add to your order tracking page

```tsx
import { ThunderSlashWidget } from '@yourscope/xforce-thunderslash-ui';

// Inside your order tracking component:
<ThunderSlashWidget
  orderId={order.id}
  userId={currentUser.id}
  orderToken={order.jwtToken}   // Blinkit's signed order JWT
  orderStatus={order.status}     // "rider_assigned" | "out_for_delivery" | ...
  apiBaseUrl="https://api.xforce-thunderslash.internal/api/v1"
  onRewardWon={(couponCode) => {
    // Show coupon in Blinkit wallet / notification
    blinkitWallet.addCoupon(couponCode);
  }}
/>
```

### 3. The widget:
- Only renders when `orderStatus` is `"rider_assigned"` or `"out_for_delivery"`
- Automatically ends the game when `orderStatus` changes to `"delivered"`
- Handles all API communication internally
- Lazy-loads the PixiJS game engine (no impact on initial page load)

---

## Analytics Events

All events are emitted via `Analytics.track()` (currently a Pino log stub).

| Event | When |
|---|---|
| `game_session_started` | Session created |
| `bolt_sliced` | Any bolt sliced |
| `xforce_hit` | X-Force bolt confirmed by server |
| `reward_issued` | Coupon generated |
| `game_ended` | Timer expires or delivered |
| `reward_redeemed` | Coupon used (tracked separately) |

To wire real Mixpanel: edit `api/src/services/analytics.ts` and `ui/src/components/ThunderSlashWidget.tsx`.

---

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `DATABASE_URL` | ✅ | PostgreSQL connection string |
| `REDIS_URL` | ✅ | Redis connection string |
| `BLINKIT_JWT_SECRET` | ✅ | Shared secret for Blinkit order tokens |
| `SESSION_JWT_SECRET` | ✅ | Secret for API session tokens |
| `ALLOWED_ORIGINS` | ✅ | Comma-separated CORS allowed origins |
| `PORT` | ➖ | API port (default: 3001) |
| `LOG_LEVEL` | ➖ | Pino log level (default: info) |

---

## Stubs (TBD Integration)

- **`api/src/services/blinkitCoupon.ts`** — `BlinkitCouponService.issueCoupon()` logs the coupon but doesn't call real Blinkit API. Contact Blinkit platform team for the API shape.
- **`api/src/services/analytics.ts`** — `Analytics.track()` logs to Pino. Replace body with `mixpanel.track()` call.

---

## Development Notes

- Strict TypeScript (`"strict": true`) everywhere — no `any` types
- All async routes have try/catch with typed errors
- `xforceBoltIdx` appears in **zero** client-facing code paths (grep: `xforceBoltIdx` only in `api/src/routes/session.ts` and `api/src/routes/slash.ts`)
- PixiJS game uses `requestAnimationFrame` via the PixiJS Ticker only — no blocking the main thread
- Mobile performance target: 60fps on mid-range Android (no heavy blur/filter effects in game)

---

*Built with PixiJS v8, Fastify, Prisma, Redis, React, Tailwind CSS.*  
*Branded activation for Coca-Cola India × Blinkit.*
