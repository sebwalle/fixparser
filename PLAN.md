# Limina FIX Analyzer - Implementation Plan

## Overview
Building a production-ready FIX protocol analyzer with 4 main sections: Ingest, Orders, Messages, and Details.

## Phase 1: Project Setup & Foundation
- [x] Create PLAN.md and CLAUDE.md
- [x] Initialize Next.js 14 (App Router) with TypeScript
- [x] Configure Tailwind CSS
- [x] Set up shadcn/ui components
- [x] Configure ESLint + Prettier
- [x] Set up Vitest + React Testing Library
- [x] Create basic dark mode theme
- [x] Set up environment variables structure

## Phase 2: Core FIX Parsing Logic ✅
- [x] Implement FIX data types and interfaces (`lib/types.ts`)
- [x] Create FIX tag dictionary (minimal set from PRD)
- [x] Implement relaxed parser (accepts |, ^, or SOH)
  - [x] Normalize delimiters to SOH internally
  - [x] Build fields array
  - [x] Extract summary fields
  - [x] Generate warnings
  - [x] Calculate orderKey
- [x] Implement strict parser
  - [x] Validate SOH delimiters
  - [x] Validate tag=value format
  - [x] Return structured issues
- [x] Implement repair suggestion logic
  - [x] Delimiter normalization
  - [x] Whitespace cleanup
  - [x] Missing equals after numeric tags
- [x] Write parser tests (`strict.test.ts`, `parser.test.ts`, `repair.test.ts`)

## Phase 3: Storage & Backend Infrastructure ✅
- [x] Create MessageStore interface
- [x] Implement in-memory store (`lib/store/memory.ts`)
  - [x] add() method
  - [x] list() with pagination and orderKey filter
  - [x] listOrders() with aggregation logic
  - [x] getById() method
  - [x] stream() for SSE broadcasting
- [x] Implement optional Vercel KV store (`lib/store/kv.ts`)
- [x] Create store factory based on USE_KV env
- [x] Implement orders aggregation logic
  - [x] Group by orderKey (ClOrdID)
  - [x] Extract originalQty, latestStatus, orderId, etc.
  - [x] Track firstSeenAt/lastSeenAt
- [x] Write storage tests (`orders.test.ts`)

## Phase 4: API Routes ✅
- [x] Implement `/api/fix/parse` (Edge runtime)
  - [x] Parse-only endpoint
  - [x] Optional Bearer token auth
  - [x] Return parsed structure
- [x] Implement `/api/messages/ingest` (Node runtime)
  - [x] Accept text/plain or JSON
  - [x] Parse with strict parser
  - [x] Store message
  - [x] Broadcast to SSE clients
  - [x] Return 400 with repair suggestions on parse failure
- [x] Implement `/api/messages` GET (Node runtime)
  - [x] List messages with pagination
  - [x] Support orderKey filter
- [x] Implement `/api/orders` GET (Node runtime)
  - [x] Return aggregated OrderRow list
- [x] Implement `/api/messages/stream` GET (Node runtime)
  - [x] SSE endpoint
  - [x] NDJSON format
  - [x] Broadcast new messages
- [ ] Implement `/api/fix/repair` POST (Node runtime, optional)
  - [ ] AI-powered repair behind ENABLE_AI_REPAIR flag
  - [ ] Provider-agnostic interface (OpenAI first)
  - [ ] Return 422 if unrepairable
- [x] Add CORS middleware
- [x] Add rate limiting
- [x] Write API tests (`api.messages.test.ts`, `ai.repair.test.ts`)

## Phase 5: UI Components - Section 1 (Ingest)
- [ ] Create basic layout (`app/layout.tsx`, `app/page.tsx`)
- [ ] Create Header component
- [ ] Create Hero component
- [ ] Create Ingest section component
  - [ ] Textarea for pasting FIX messages
  - [ ] File upload (.txt)
  - [ ] Buttons: Strict Parse, Relaxed Parse, Clear, Use Sample
  - [ ] Form to POST to /api/messages/ingest
  - [ ] Live feed of POSTed messages
  - [ ] SSE subscription (fallback to polling)
  - [ ] Message row click handler
- [ ] Create sample FIX messages

## Phase 6: UI Components - Section 2 (Orders)
- [ ] Create Orders section component
  - [ ] Fetch from `/api/orders`
  - [ ] Table/cards displaying OrderRow data
  - [ ] Show: ClOrdID, OrderID, Symbol, Side, OriginalQty, Status, Count, First/Last Seen
  - [ ] Click handler to filter Messages section
  - [ ] Highlight selected order
  - [ ] Scroll Messages section into view on selection

## Phase 7: UI Components - Section 3 (Messages)
- [ ] Create Messages section component
  - [ ] Fetch from `/api/messages`
  - [ ] Paginated table with key fields
  - [ ] Show: receivedAt, MsgType, TransType, OrdStatus, ClOrdID, OrderID, Symbol, Side, Qty, Price
  - [ ] Support filtering by orderKey
  - [ ] Breadcrumb/chip for active filter
  - [ ] Click handler to select message and update Details
  - [ ] Pagination controls

## Phase 8: UI Components - Section 4 (Details)
- [ ] Create Details section component
  - [ ] Compact summary header (MsgType badge, status, key fields)
  - [ ] Sortable tag/name/value table
  - [ ] Client-side sorting by tag or name
  - [ ] Buttons: Copy JSON, Export JSON, Copy Raw
  - [ ] Update when selection changes

## Phase 9: Component Integration & State Management
- [ ] Create global state for:
  - [ ] Selected order
  - [ ] Selected message
  - [ ] Parsed messages list
  - [ ] Orders list
  - [ ] Filter state
- [ ] Wire up order → messages filter
- [ ] Wire up message → details view
- [ ] Wire up SSE updates to UI

## Phase 10: Polish & UX
- [ ] Add Framer Motion animations (subtle, reduced-motion aware)
- [ ] Add toast notifications for actions
- [ ] Style tables with shadcn components
- [ ] Add loading states
- [ ] Add error boundaries
- [ ] Implement repair flow UI
  - [ ] Show parse issues
  - [ ] Display repair suggestions
  - [ ] Preview diffs
  - [ ] Apply repairs and retry
- [ ] Add AI Clean button UI (behind feature flag)
- [ ] Responsive design (≥360px mobile)
- [ ] Dark mode polish

## Phase 11: Documentation
- [ ] Write comprehensive README
  - [ ] Quick start
  - [ ] Parsing explanation
  - [ ] Four-section UX guide
  - [ ] API documentation
  - [ ] Environment variables
  - [ ] Deployment notes
  - [ ] Privacy note for AI Clean
- [ ] Add inline code comments
- [ ] Create API route documentation

## Phase 12: Testing & Quality
- [ ] Run all unit tests
- [ ] Add integration tests for full flows
- [ ] Test SSE streaming
- [ ] Test repair flow end-to-end
- [ ] Fix any TypeScript errors
- [ ] Fix any ESLint errors
- [ ] Test mobile responsiveness
- [ ] Run Lighthouse audit (target: Perf ≥90, A11y ≥95)
- [ ] Manual QA of all 4 sections

## Phase 13: Deployment Prep
- [ ] Verify Vercel deployment configuration
- [ ] Test with Vercel KV (optional)
- [ ] Verify environment variables
- [ ] Test CORS configuration
- [ ] Test rate limiting
- [ ] Verify API authentication

## Environment Variables Required
```
FIX_API_TOKEN=              # optional auth for /api/fix/parse & ingest
ALLOWED_ORIGINS=*           # CORS allowlist
ENABLE_AI_REPAIR=false      # show/hide AI Clean
FIX_AI_PROVIDER=            # optional (e.g., openai)
FIX_AI_KEY=                 # key for provider
USE_KV=false                # toggle Vercel KV store
KV_URL=                     # KV connection (if used)
KV_REST_API_READ_ONLY_TOKEN=
KV_REST_API_TOKEN=
KV_REST_API_URL=
```

## Key Technical Decisions
1. **Package Manager**: npm
2. **Testing**: Vitest + React Testing Library
3. **AI Provider**: Provider-agnostic interface, OpenAI as first implementation
4. **Storage**: In-memory first, Vercel KV as optional enhancement
5. **Rate Limiting**: 100 requests/5min per IP for write endpoints
6. **TransType**: Support tags 60, 150, 39 - show whichever is present
7. **Sample Messages**: Create realistic FIX 4.4 samples for common order lifecycle

## File Structure
```
fixparser/
├── app/
│   ├── layout.tsx
│   ├── page.tsx
│   ├── globals.css
│   └── api/
│       ├── fix/
│       │   ├── parse/
│       │   │   └── route.ts          # Edge runtime
│       │   └── repair/
│       │       └── route.ts          # Node runtime (AI)
│       ├── messages/
│       │   ├── ingest/
│       │   │   └── route.ts          # Node runtime
│       │   ├── route.ts              # GET list
│       │   └── stream/
│       │       └── route.ts          # SSE
│       └── orders/
│           └── route.ts              # GET aggregated
├── components/
│   ├── ui/                           # shadcn components
│   ├── header.tsx
│   ├── hero.tsx
│   └── sections/
│       ├── ingest.tsx
│       ├── orders.tsx
│       ├── messages.tsx
│       └── details.tsx
├── lib/
│   ├── types.ts                      # Core type definitions
│   ├── theme.ts
│   ├── fix/
│   │   ├── parser.ts                 # Relaxed parser
│   │   ├── strict.ts                 # Strict parser
│   │   ├── repair.ts                 # Repair suggestions
│   │   ├── dictionary.ts             # Tag definitions
│   │   └── samples.ts                # Sample messages
│   ├── store/
│   │   ├── interface.ts              # MessageStore interface
│   │   ├── memory.ts                 # In-memory implementation
│   │   └── kv.ts                     # Vercel KV implementation
│   └── server/
│       ├── cors.ts
│       ├── ratelimit.ts
│       └── sse.ts                    # SSE helpers
├── __tests__/
│   ├── strict.test.ts
│   ├── parser.test.ts
│   ├── repair.test.ts
│   ├── orders.test.ts
│   ├── api.messages.test.ts
│   └── ai.repair.test.ts
├── public/
├── .env.local
├── .env.example
├── next.config.js
├── tailwind.config.ts
├── tsconfig.json
├── vitest.config.ts
├── package.json
├── README.md
├── PLAN.md
├── CLAUDE.md
└── PRD.md
```

## Progress Tracking
- Total phases: 13
- Completed: 4 (Phase 1, Phase 2, Phase 3, Phase 4)
- In progress: 0
- Remaining: 9

## Notes
- Focus on clean, readable code following user's test guidelines
- Use table-based tests in Go style where applicable
- Prefer maps for checking values
- Use require vs assert appropriately
- Keep components simple and testable
- Ensure SSE has polling fallback for compatibility
