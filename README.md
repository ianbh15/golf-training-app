# Golf Performance OS

> A mobile-first performance tool for a 3-handicap golfer. Practice accountability + round pattern recognition + AI synthesis = lower scores.

**Not a beginner app.** Built for one specific practice routine. Think Whoop meets a caddie yardage book.

---

## Tech Stack

| Layer | Choice |
|---|---|
| Framework | React Native + Expo (managed workflow) |
| Language | TypeScript |
| Navigation | Expo Router (file-based) |
| Backend / DB | Supabase (Postgres + Auth + RLS) |
| AI | Anthropic Claude (`claude-sonnet-4-20250514`) via Edge Function |
| State | Zustand |
| Charts | Victory Native |
| Styling | NativeWind (Tailwind for RN) |
| Storage | Supabase + AsyncStorage (offline draft sessions) |

---

## Getting Started

### 1. Clone & install

```bash
git clone https://github.com/ianbh15/golf-training-app.git
cd golf-training-app
npm install --legacy-peer-deps
```

### 2. Set environment variables

```bash
cp .env.example .env
```

Fill in:
```
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

> ⚠️ `ANTHROPIC_API_KEY` must **never** be in the client app. Set it as a Supabase secret for the Edge Function.

### 3. Run the database migration

In your Supabase dashboard → SQL Editor, paste and run:
```
supabase/migrations/001_initial_schema.sql
```

### 4. Start the dev server

```bash
npm start
```

Scan the QR with Expo Go, or press `a` for Android emulator.

---

## CI/CD (GitHub Actions)

| Workflow | Trigger |
|---|---|
| `ci.yml` | Every push/PR — TypeScript check + lint |
| `deploy.yml` | Push to `main` — EAS build (Android preview) + Edge Function deploy |

### Required GitHub Secrets

| Secret | Description |
|---|---|
| `EXPO_TOKEN` | From [expo.dev](https://expo.dev) → Account Settings → Access Tokens |
| `SUPABASE_PROJECT_ID` | From Supabase dashboard URL |
| `SUPABASE_ACCESS_TOKEN` | From [supabase.com](https://app.supabase.com/account/tokens) |

---

## Build Phases

| Phase | Status | Description |
|---|---|---|
| Phase 1 | ✅ | Foundation — Expo setup, Supabase schema, routine data model, Zustand stores |
| Phase 2 | ✅ | Practice Core — All 5 tabs, Today screen, session logger, history, Supabase write |
| Phase 3 | 🔲 | Round Logging — Form, history list, handicap differential |
| Phase 4 | 🔲 | AI Layer — Claude Edge Function, round debrief, weekly summary, pre-session cue |
| Phase 5 | 🔲 | Stats — Handicap trend, SG radar, practice consistency charts (Victory Native) |

> Phase 3 screens are included (rounds/log.tsx, rounds/index.tsx) as part of Phase 2 completion.

---

## Project Structure

```
app/
├── (auth)/         # Login + Signup
├── (tabs)/         # 5-tab layout
│   ├── index.tsx       # Today
│   ├── practice/       # Session logger + history
│   ├── rounds/         # Round log + history
│   ├── coach.tsx       # AI Coach
│   └── stats.tsx       # Stats dashboard
components/
├── ui/             # Card, QualityRating, MetricBadge, SequenceToggle, SectionHeader
lib/
├── supabase.ts     # Supabase client
├── claude.ts       # Claude wrapper (dev only — prod uses Edge Function)
├── store/          # Zustand: sessionStore, roundStore
└── types/          # Database types
constants/
└── routine.ts      # Source of truth for all practice blocks
supabase/
├── migrations/     # SQL schema
└── functions/      # Edge Functions (ai-coach)
.github/workflows/  # CI + EAS deploy
```

---

*Golf Performance OS · Ian Hodge · April 2026*
