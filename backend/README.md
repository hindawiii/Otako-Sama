# Otaku Sama — Backend

Standalone Node.js + Express + MongoDB Atlas backend. 100% free-tier,
portable to any Node host (Render, Railway, Fly.io, Vercel, etc.).
No Lovable Cloud, no Supabase, no vendor lock-in.

## Phase 1 status

- ✅ Express skeleton with CORS + JSON
- ✅ MongoDB connection (Mongoose)
- ✅ 5 Mongoose models: `User`, `WansaMessage`, `ArenaPost`, `Game`, `AnimeManga`
- ✅ `/api/health` endpoint
- ⏳ Route logic — Phase 2 (awaiting approval)

## Getting started

```bash
cd backend
cp .env.example .env      # fill in MONGO_URI from Atlas M0
npm install
npm run dev
```

Health check: `GET http://localhost:5000/api/health`

## Layout

```
backend/
  server.js               # Express bootstrap
  config/db.js            # Mongoose connection
  models/                 # 5 approved schemas
    User.js
    WansaMessage.js
    ArenaPost.js
    Game.js
    AnimeManga.js
```
