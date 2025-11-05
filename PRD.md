Awesome — here’s your **single, consolidated Cursor/Claude prompt** updated to your exact 4-section layout and interactions (orders grouped by `ClOrdID`, full message list, selectable details table, and an ingest area that also shows POSTed messages). Paste this whole thing into Cursor for Claude Code.

---

# Prompt for Cursor (Claude Code)

**Role & Goal**
You are a senior full-stack engineer. Build a **production-ready web app** for **Limina FIX Analyzer** with **four sections**:

1. **Ingest** – paste/upload FIX or **view externally POSTed messages**
2. **Orders** – parsed messages **grouped by `ClOrdID`** with key fields
3. **Messages** – list of all parsed messages with the most important fields
4. **Details** – when a parsed message is selected, show full **tag=value** table with sorting
   Also: **Selecting an order filters/populates the messages list** with messages for that order.

The UI should be visually similar to `https://preview--fix-insight.lovable.app/` but implemented cleanly with our stack and original styling.

---

## Tech

* Next.js 14 (App Router) + TypeScript
* Tailwind CSS + shadcn/ui + lucide-react
* Framer Motion (subtle, reduced-motion aware)
* API routes (Edge for parsing; Node for storage/stream)
* Vercel-ready (scripts, envs, CORS)
* ESLint + Prettier

---

## Data model

```ts
// Core tags referenced frequently
type FixTag = string; // numeric string

export type FixField = { tag: FixTag; value: string; name?: string; description?: string };

export type ParsedMessage = {
  id: string;                // uuid
  receivedAt: string;        // ISO
  raw: string;               // normalized with '|' for display
  sohRaw: string;            // SOH-delimited canonical
  fields: FixField[];
  summary: {
    MsgType?: string;        // 35
    TransactTime?: string;   // 60
    ClOrdID?: string;        // 11
    OrderID?: string;        // 37
    Symbol?: string;         // 55
    Side?: string;           // 54
    OrderQty?: string;       // 38
    Price?: string;          // 44
    OrdStatus?: string;      // 39
    ExecType?: string;       // 150
    TransType?: string;      // 167 or 25? (use 60/standard mapping if provided)
  };
  warnings: string[];
  orderKey: string;          // ClOrdID (11) or fallback `${SenderCompID}-${MsgSeqNum}`
};

export type OrderRow = {
  orderKey: string;                  // ClOrdID
  firstSeenAt: string;
  lastSeenAt: string;
  count: number;                     // number of messages in this order
  symbol?: string;
  originalQty?: string;              // 38
  orderId?: string;                  // 37 (if present)
  side?: string;                     // 54
  latestStatus?: string;             // 39 or 150
};
```

---

## FIX parsing

Implement two parsers:

1. **Relaxed parser** (client)

   * Accepts `|`, `^`, or SOH; normalizes to SOH internally.
   * Builds `fields`, `summary`, `warnings`.

2. **Strict parser** (default for API + “Strict Parse” button in UI)

   * Requires valid SOH delimiters and `tag=value`.
   * Throws with structured issues (`NO_SOH`, `MISSING_EQUALS`, `TAG_NOT_NUMERIC`, `EMPTY_VALUE`).

**Repair flow** (when strict fails):

* Show issues; propose deterministic repairs (delimiter normalization, whitespace cleanup, insert missing `=` after numeric tag).
* Preview diffs; user can apply/modify and retry.
* Optional **AI Clean** button (server route) that only fixes formatting (never invents/reorders fields). If model can’t fix → returns 422.

**Dictionary subset** (names only; extendable):
`8,9,35,49,56,34,52,11,37,55,54,38,40,44,59,150,39,60`

---

## Storage & “see POSTed messages”

We must **store parsed messages** so the app can show ones POSTed by external systems.

* Default: **in-memory store** (Node runtime).
* Optional: use **Vercel KV** if `KV_URL`/`KV_REST_API_URL` etc. provided (feature-flag).
* Provide simple **SSE stream** for new messages (Node runtime) so the UI updates live without manual refresh. Fallback to polling.

**Store contract**

```ts
interface MessageStore {
  add(msg: ParsedMessage): Promise<void>;
  list(opts?: { limit?: number; cursor?: string; orderKey?: string }): Promise<{ items: ParsedMessage[]; nextCursor?: string }>;
  listOrders(): Promise<OrderRow[]>;
  getById(id: string): Promise<ParsedMessage | null>;
  stream(controller: ReadableStreamDefaultController<ParsedMessage>): void; // pushes newly added
}
```

---

## APIs

* `POST /api/fix/parse` (Edge): parse only; returns JSON with parsed structure. Optional `Authorization: Bearer <FIX_API_TOKEN>`.
* `POST /api/messages/ingest` (Node): **parse (strict by default) + store + broadcast** to SSE. Accepts `text/plain` or `{ message }`. Returns stored `ParsedMessage`. (If parsing fails, return 400 with issues and repair suggestions.)
* `GET /api/messages` (Node): list messages; supports `?orderKey=` and pagination (`limit`, `cursor`).
* `GET /api/orders` (Node): aggregated orders grouped by `ClOrdID`.
* `GET /api/messages/stream` (Node): SSE; emits each new `ParsedMessage` as NDJSON.
* `POST /api/fix/repair` (Node, optional): AI cleaning route behind `ENABLE_AI_REPAIR=true`.

Rate-limit write routes; CORS configurable via `ALLOWED_ORIGINS`.

---

## UI — 4 Sections (exact behavior)

### 1) Ingest (paste/upload & “see POSTed”)

* Left panel: `Textarea` + file upload (`.txt`). Buttons: **Strict Parse**, **Relaxed Parse**, **Clear**, **Use Sample**.
* A small form to **POST to /api/messages/ingest** (server side store).
* Right below: **Live feed** of latest POSTed messages (subscribes to `/api/messages/stream`; fallback to polling `/api/messages?limit=50` every 5s). Each row shows timestamp, `MsgType`, `ClOrdID`, `Symbol`, `OrdStatus` (if any). Clicking a row selects that message (updates **Details**).

### 2) Orders (grouped by `ClOrdID`)

* Table or cards of **OrderRow** grouped by `orderKey = ClOrdID`.
* Show: **ClOrdID**, **OrderID**, **Symbol**, **Side**, **OriginalQuantity**, **Latest OrdStatus**, **Count**, **First/Last Seen**.
* **Selecting an order** filters the **Messages** section to only messages for that order and highlights it (and scrolls Messages into view).

### 3) Messages (all parsed)

* Paginated table with the **most important fields** per message:
  `receivedAt`, `MsgType (35)`, `TransType (if available)`, `OrdStatus (39)`, `ClOrdID (11)`, `OrderID (37)`, `Symbol (55)`, `Side (54)`, `Qty (38)`, `Price (44)`.
* If an order is currently selected, show a breadcrumb/Chip “Filter: ClOrdID=… (Clear)”.
* Clicking a message selects it and focuses the **Details** section.

### 4) Details (selected message)

* A dedicated panel with a **sortable Tag/Name/Value table** of all fields (client-side sort on tag or name).
* Show a compact summary header (MsgType badge, OrdStatus, ClOrdID, Symbol, Qty, Price).
* Buttons: **Copy JSON**, **Export JSON**, **Copy Raw**.
* When selection changes in Messages or feed, Details updates.

---

## File structure

```
app/
  layout.tsx
  page.tsx
  globals.css
  api/
    fix/
      parse/route.ts          // Edge
      repair/route.ts         // Node (optional, AI)
    messages/
      ingest/route.ts         // Node
      route.ts                // GET list (Node)
      stream/route.ts         // GET SSE (Node)
    orders/
      route.ts                // GET aggregated (Node)
components/
  header.tsx
  hero.tsx
  sections/
    ingest.tsx
    orders.tsx
    messages.tsx
    details.tsx
  demo/
    parser.ts                 // relaxed parser (isomorphic)
    strict.ts                 // strict parser (throws issues)
    repair.ts                 // deterministic suggestions
    dictionary.ts
    samples.ts
lib/
  theme.ts
  store/
    memory.ts                 // default MessageStore impl
    kv.ts                     // optional Vercel KV
  server/
    cors.ts
    ratelimit.ts
    sse.ts                    // helper to write NDJSON events
```

---

## Key implementation notes

### Parsing + Summary

* Normalize display `raw` to use `|` (human friendly), keep `sohRaw` internally.
* Compute `orderKey = fields["11"] ?? \`${fields["49"]}-${fields["34"]}``.
* `TransType`: if client wants this, surface from the tag actually used in your message flow (commonly `150/39` combo or `60` for time). If not available, leave blank.

### Orders aggregation

* For each `orderKey`:

  * `originalQty` = first non-empty `38` encountered for that key
  * `latestStatus` = last seen `39` or `150`
  * `orderId` = last seen `37`
  * `symbol` & `side` = most recent non-empty
  * `firstSeenAt` / `lastSeenAt` from message timestamps

### SSE

* Send `Content-Type: text/event-stream` & `Cache-Control: no-cache`.
* Emit events as lines of JSON (`data: {...}\n\n`).
* On `store.add`, broadcast to all open streams.

### Tables & sorting

* Use shadcn `Table` + client sort controls.
* Details table sortable by Tag or Name; default sort by numeric `tag`.

### Repair flow

* On strict parse failure from **Ingest** textarea, show issues + repair suggestions; user can preview & apply; then try strict parse again.
* AI Clean button (if `ENABLE_AI_REPAIR=true`) calls `/api/fix/repair`. Display privacy blurb.

---

## Environment

```
FIX_API_TOKEN=              # optional auth for /api/fix/parse & ingest
ALLOWED_ORIGINS=*           # CORS allowlist
ENABLE_AI_REPAIR=false      # show/hide AI Clean
FIX_AI_PROVIDER=            # optional (e.g., openai, bedrock, claude)
FIX_AI_KEY=                 # key for provider
USE_KV=false                # toggle Vercel KV store
KV_URL=                     # KV connection (if used)
```

---

## README (deliver)

* Quick start (`pnpm i && pnpm dev`)
* How parsing works (relaxed vs strict)
* Four-section UX and interactions
* API docs (`/api/messages/ingest`, `/api/messages`, `/api/orders`, `/api/messages/stream`, `/api/fix/parse`, `/api/fix/repair`)
* Env variables & deployment notes
* Privacy note for AI Clean

---

## Tests (at minimum)

* `strict.test.ts` — malformed cases catch correct issues; corrected messages pass
* `parser.test.ts` — relaxed parser parses samples; warnings on type errors
* `orders.test.ts` — aggregation produces expected `OrderRow` fields
* `api.messages.test.ts` — ingest, list, filter by `orderKey`, SSE basic smoke
* `repair.test.ts` — deterministic proposals produced
* `ai.repair.test.ts` — returns 422 for unrepairable (mock model)

---

## Acceptance criteria

* Four sections implemented exactly as specified
* External `POST /api/messages/ingest` shows up in the feed in Ingest section
* Selecting an **Order** filters **Messages** to that order
* Selecting a **Message** shows **Details** table with sortable tag/name/value
* Parser + strict + repair flow implemented; optional AI Clean behind flag
* Lighthouse (desktop): Perf ≥ 90, A11y ≥ 95
* No TS/ESLint errors; mobile responsive ≥ 360px

---

## Developer steps (do in this order)

1. Scaffold Next.js + Tailwind + shadcn + dark mode
2. Implement relaxed & strict parsers, dictionary, repair suggestions
3. Implement **/api/messages/ingest**, storage, SSE stream, orders aggregation
4. Build the 4 sections and wiring (order → messages filter; message → details)
5. Add **/api/fix/parse** and optional **/api/fix/repair**
6. Polish UI (tables, sorting, chips, toasts, motion)
7. Write tests + README

---

Paste this into Cursor and ship. If you want, I can also provide the exact component skeletons and route stubs to accelerate step 3–4.
