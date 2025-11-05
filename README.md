# Limina FIX Analyzer

A production-ready web application for analyzing FIX protocol messages with a clean 4-section UI: Ingest, Orders, Messages, and Details.

## Features

- **Flexible Parsing**: Strict and relaxed modes for FIX message parsing
- **Real-Time Updates**: Server-Sent Events (SSE) with polling fallback
- **Order Aggregation**: Automatic grouping by ClOrdID with lifecycle tracking
- **Interactive UI**: Four-section workflow for efficient message analysis
- **Dark Mode**: Full dark mode support with system preference detection
- **Storage Options**: In-memory (default) or Vercel KV
- **Rate Limiting**: Built-in protection for API endpoints
- **CORS Support**: Configurable cross-origin access
- **Optional AI Repair**: Feature-flagged AI-powered message repair

## Quick Start

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Open browser to http://localhost:3000
```

### Production Build

```bash
# Build for production
npm run build

# Start production server
npm start
```

## Four-Section UX Guide

### 1. Ingest Section

The entry point for adding FIX messages to the analyzer.

**Features:**
- **Textarea Input**: Paste FIX messages directly
- **File Upload**: Upload `.txt` files containing FIX messages
- **Parse Modes**:
  - **Relaxed Parse**: Accepts `|`, `^`, or SOH delimiters (forgiving)
  - **Strict Parse**: Validates SOH delimiters and exact FIX format
- **Sample Messages**: Pre-loaded FIX 4.4 examples for testing
- **Live Feed**: Real-time stream of ingested messages with SSE

**Workflow:**
1. Paste or upload a FIX message
2. Click "Strict Parse" (validates format) or "Relaxed Parse" (more forgiving)
3. Message is stored and appears in the live feed
4. Failed parses show repair suggestions

### 2. Orders Section

Aggregated view of orders grouped by ClOrdID.

**Features:**
- Automatic grouping of related messages by ClOrdID (tag 11)
- Key order information at a glance:
  - ClOrdID, OrderID, Symbol
  - Side (Buy/Sell)
  - Original Quantity
  - Latest Status (New, Partial Fill, Filled, etc.)
  - Message Count
  - First Seen / Last Seen timestamps
- Click to filter Messages section by selected order
- Highlights selected order

**Workflow:**
1. Review list of orders
2. Click an order to see all related messages
3. Messages section auto-filters and scrolls into view

### 3. Messages Section

Complete list of all parsed messages with pagination.

**Features:**
- Paginated table (50 messages per page, configurable)
- Key fields displayed: MsgType, TransType, OrdStatus, ClOrdID, OrderID, Symbol, Side, Qty, Price
- Filter by orderKey when an order is selected
- Breadcrumb shows active filter with clear button
- Click to view full message details
- Responsive design for mobile viewing

**Workflow:**
1. Browse all messages or filtered by order
2. Use pagination for large datasets
3. Click a message to see full details

### 4. Details Section

Full field-level view of a selected message.

**Features:**
- **Compact Summary**: MsgType badge, status, and key order fields
- **Sortable Table**: All FIX tags with tag number, name, and value
- **Client-Side Sorting**: Sort by tag number or field name
- **Export Actions**:
  - Copy JSON (structured format)
  - Export JSON (download file)
  - Copy Raw (original FIX message)
- Updates automatically when message selection changes

**Workflow:**
1. Select a message from Messages section
2. Review summary and full tag breakdown
3. Sort by tag or name for easier analysis
4. Export data as needed

## Parsing Modes

### Relaxed Mode (Default)

Accepts FIX messages with various delimiter formats:
- `|` (pipe character)
- `^` (caret character)
- `\x01` (SOH character)

Normalizes all delimiters to SOH internally for consistent parsing. Generates warnings for format issues but does not reject messages.

**Use Cases:**
- Testing and development
- Importing messages from logs with normalized delimiters
- Exploratory analysis of malformed messages

### Strict Mode

Validates FIX messages according to strict protocol rules:
- Only SOH (`\x01`) delimiters accepted
- Validates `tag=value` format
- Checks for required tags (8, 9, 35)
- Validates checksum (if present)

Returns structured issues when validation fails, along with repair suggestions.

**Use Cases:**
- Production message validation
- Compliance checking
- Pre-ingest validation

### Repair Suggestions

When strict parsing fails, the system generates deterministic repair suggestions:

1. **Delimiter Normalization**: Replace `|` or `^` with SOH
2. **Whitespace Cleanup**: Remove extra spaces around equals signs
3. **Missing Equals**: Add `=` after numeric tags

Suggestions include a preview of the repaired message.

## API Documentation

All API endpoints support CORS (configurable) and optional Bearer token authentication.

### POST /api/fix/parse

Parse-only endpoint (no storage). Edge runtime for optimal performance.

**Query Parameters:**
- `mode`: `strict` or `relaxed` (default: `relaxed`)

**Request Body:**
```
Content-Type: text/plain or application/json

# text/plain
8=FIX.4.4|9=100|35=D|...

# application/json
{
  "message": "8=FIX.4.4|9=100|35=D|..."
}
```

**Response (Success):**
```json
{
  "data": {
    "fields": [
      {"tag": "8", "name": "BeginString", "value": "FIX.4.4"},
      ...
    ],
    "summary": {
      "msgType": "D",
      "clOrdID": "ORDER123",
      ...
    },
    "warnings": []
  }
}
```

**Response (Error - Strict Mode):**
```json
{
  "error": "Parse failed: Invalid delimiter format",
  "issues": [
    {
      "type": "delimiter",
      "message": "Expected SOH delimiter",
      "position": 10
    }
  ],
  "suggestions": [
    {
      "type": "delimiter_normalization",
      "description": "Replace | with SOH",
      "preview": "8=FIX.4.4\x019=100\x0135=D..."
    }
  ]
}
```

### POST /api/messages/ingest

Parse, store, and broadcast messages. Node runtime.

**Rate Limit:** 100 requests per 5 minutes per IP

**Request Body:** Same as `/api/fix/parse`

**Response (Success):**
```json
{
  "data": {
    "id": "msg_abc123",
    "rawMessage": "8=FIX.4.4|...",
    "fields": [...],
    "summary": {...},
    "warnings": []
  }
}
```

**Response (Error):** Same as `/api/fix/parse` strict mode errors

### GET /api/messages

List messages with pagination and filtering.

**Rate Limit:** 300 requests per 5 minutes per IP

**Query Parameters:**
- `limit`: Number of messages to return (1-200, default: 50)
- `cursor`: Pagination cursor from previous response
- `orderKey`: Filter by ClOrdID

**Response:**
```json
{
  "data": [
    {
      "id": "msg_abc123",
      "rawMessage": "...",
      "fields": [...],
      "summary": {...},
      "warnings": []
    },
    ...
  ],
  "meta": {
    "nextCursor": "msg_xyz789",
    "total": 150
  }
}
```

### GET /api/orders

Get aggregated orders list.

**Rate Limit:** 300 requests per 5 minutes per IP

**Response:**
```json
{
  "data": [
    {
      "orderKey": "ORDER123",
      "orderId": "12345",
      "symbol": "AAPL",
      "side": "Buy",
      "originalQty": "100",
      "latestStatus": "Filled",
      "latestTransType": "Trade",
      "messageCount": 5,
      "firstSeenAt": "2025-01-01T10:00:00Z",
      "lastSeenAt": "2025-01-01T10:05:00Z"
    },
    ...
  ]
}
```

### GET /api/messages/stream

Server-Sent Events (SSE) endpoint for real-time updates.

**Response Format:**
```
Content-Type: text/event-stream

data: {"type":"connected"}

data: {"id":"msg_abc123","rawMessage":"...","fields":[...],"summary":{...},"warnings":[]}

data: {"id":"msg_xyz789",...}
```

**Client Example:**
```javascript
const eventSource = new EventSource('/api/messages/stream');

eventSource.onmessage = (event) => {
  const message = JSON.parse(event.data);
  if (message.type === 'connected') {
    console.log('Connected to stream');
  } else {
    console.log('New message:', message);
  }
};

eventSource.onerror = () => {
  eventSource.close();
  // Implement polling fallback
};
```

## Environment Variables

Create a `.env.local` file (see `.env.example`):

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `FIX_API_TOKEN` | No | - | Bearer token for API authentication. If set, requests to `/api/fix/parse` and `/api/messages/ingest` must include `Authorization: Bearer <token>` header. |
| `ALLOWED_ORIGINS` | No | `*` | Comma-separated list of allowed CORS origins. Use `*` for all origins (development) or specific domains for production (e.g., `https://example.com,https://api.example.com`). |
| `USE_KV` | No | `false` | Enable Vercel KV storage. Set to `true` to use KV instead of in-memory storage. Requires KV environment variables. |
| `KV_URL` | No | - | Vercel KV connection URL. Required if `USE_KV=true`. |
| `KV_REST_API_URL` | No | - | Vercel KV REST API URL. Required if `USE_KV=true`. |
| `KV_REST_API_TOKEN` | No | - | Vercel KV REST API token (write access). Required if `USE_KV=true`. |
| `KV_REST_API_READ_ONLY_TOKEN` | No | - | Vercel KV REST API read-only token. Required if `USE_KV=true`. |
| `ENABLE_AI_REPAIR` | No | `false` | Feature flag for AI-powered message repair. Set to `true` to enable (requires AI provider configuration). |
| `FIX_AI_PROVIDER` | No | - | AI provider name (e.g., `openai`). Required if `ENABLE_AI_REPAIR=true`. |
| `FIX_AI_KEY` | No | - | API key for AI provider. Required if `ENABLE_AI_REPAIR=true`. |

### Example Configuration

**Development:**
```bash
ALLOWED_ORIGINS=*
```

**Production (without KV):**
```bash
FIX_API_TOKEN=your-secret-token-here
ALLOWED_ORIGINS=https://yourapp.com
```

**Production (with KV):**
```bash
FIX_API_TOKEN=your-secret-token-here
ALLOWED_ORIGINS=https://yourapp.com
USE_KV=true
KV_URL=your-kv-url
KV_REST_API_URL=your-kv-rest-api-url
KV_REST_API_TOKEN=your-kv-token
KV_REST_API_READ_ONLY_TOKEN=your-kv-readonly-token
```

## Deployment

### Vercel (Recommended)

1. **Install Vercel CLI:**
   ```bash
   npm install -g vercel
   ```

2. **Deploy:**
   ```bash
   vercel
   ```

3. **Set Environment Variables:**
   - Go to Vercel Dashboard → Your Project → Settings → Environment Variables
   - Add required variables from table above

4. **Deploy to Production:**
   ```bash
   vercel --prod
   ```

### Vercel KV Setup (Optional)

1. **Create KV Store:**
   - In Vercel Dashboard, go to Storage → Create Database → KV
   - Copy connection details

2. **Link to Project:**
   - In project settings, link the KV database
   - Environment variables are automatically added

3. **Enable in Application:**
   - Set `USE_KV=true` in environment variables

### Other Platforms

The application can run on any Node.js platform (18+):

- **Docker**: Build with `docker build` and deploy to container platform
- **Traditional Hosting**: Run `npm run build && npm start` on server
- **Serverless**: Compatible with AWS Lambda, Google Cloud Functions (with adapter)

**Requirements:**
- Node.js 18+ runtime
- Support for Edge runtime (for `/api/fix/parse` endpoint)
- Support for SSE (for `/api/messages/stream` endpoint)

## Privacy & AI Clean Feature

The optional AI Clean feature (`ENABLE_AI_REPAIR=true`) sends malformed FIX messages to a third-party AI provider (e.g., OpenAI) for repair suggestions.

**Privacy Considerations:**
- This feature is **disabled by default**
- When enabled, FIX message content is sent to the configured AI provider
- AI providers may store or analyze message data per their privacy policies
- **Do not enable** if messages contain sensitive or regulated information
- Consider using anonymized/redacted test data when AI repair is enabled

**Alternative:** Use the built-in deterministic repair suggestions, which process messages locally without external API calls.

## Testing

```bash
# Run all tests
npm test

# Run tests in watch mode
npm test -- --watch

# Run specific test file
npm test -- parser.test.ts

# Run tests with coverage
npm test -- --coverage
```

### Test Files

- `__tests__/parser.test.ts` - Relaxed parser tests
- `__tests__/strict.test.ts` - Strict parser tests
- `__tests__/repair.test.ts` - Repair suggestion tests
- `__tests__/orders.test.ts` - Order aggregation tests
- `__tests__/api.messages.test.ts` - API endpoint tests

## Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript (strict mode)
- **Styling**: Tailwind CSS v4
- **UI Components**: shadcn/ui (Radix UI primitives)
- **Testing**: Vitest + React Testing Library
- **State Management**: React Context + hooks
- **Real-Time**: Server-Sent Events (SSE)
- **Storage**: In-memory or Vercel KV
- **Runtime**: Node.js (storage/SSE) + Edge (parse-only)
- **Deployment**: Vercel (or any Node.js 18+ platform)

## Project Structure

```
fixparser/
├── app/                            # Next.js App Router
│   ├── layout.tsx                 # Root layout with providers
│   ├── page.tsx                   # Home page (4 sections)
│   ├── globals.css                # Global styles + Tailwind
│   └── api/                       # API routes
│       ├── fix/
│       │   └── parse/route.ts    # Parse-only endpoint (Edge)
│       ├── messages/
│       │   ├── ingest/route.ts   # Ingest endpoint (Node)
│       │   ├── route.ts          # List endpoint (Node)
│       │   └── stream/route.ts   # SSE endpoint (Node)
│       └── orders/route.ts        # Orders endpoint (Node)
├── components/                     # React components
│   ├── ui/                        # shadcn/ui primitives
│   ├── error-boundary.tsx         # Error boundary component
│   ├── header.tsx                 # App header
│   ├── hero.tsx                   # Hero section
│   └── sections/                  # Main UI sections
│       ├── ingest.tsx            # Section 1: Ingest
│       ├── orders.tsx            # Section 2: Orders
│       ├── messages.tsx          # Section 3: Messages
│       └── details.tsx           # Section 4: Details
├── lib/                            # Core logic
│   ├── types.ts                   # TypeScript type definitions
│   ├── utils.ts                   # Utility functions
│   ├── fix/                       # FIX parsing logic
│   │   ├── parser.ts             # Relaxed parser
│   │   ├── strict.ts             # Strict parser
│   │   ├── repair.ts             # Repair suggestions
│   │   ├── dictionary.ts         # FIX tag definitions
│   │   └── samples.ts            # Sample FIX messages
│   ├── store/                     # Storage layer
│   │   ├── interface.ts          # MessageStore interface
│   │   ├── index.ts              # Store factory
│   │   ├── memory.ts             # In-memory implementation
│   │   └── kv.ts                 # Vercel KV implementation
│   └── server/                    # Server utilities
│       ├── auth.ts               # API authentication
│       ├── cors.ts               # CORS middleware
│       ├── ratelimit.ts          # Rate limiting
│       └── sse.ts                # SSE helpers
├── __tests__/                      # Test files
├── public/                         # Static assets
├── .env.example                    # Environment variables template
├── next.config.js                  # Next.js configuration
├── tailwind.config.ts              # Tailwind CSS configuration
├── tsconfig.json                   # TypeScript configuration
├── vitest.config.ts                # Vitest configuration
├── package.json                    # Dependencies and scripts
├── PLAN.md                         # Implementation roadmap
├── CLAUDE.md                       # Project guidelines
└── README.md                       # This file
```

## Commands

```bash
# Development
npm run dev              # Start development server
npm run build            # Production build
npm start                # Start production server

# Code Quality
npm run lint             # Run ESLint
npm run type-check       # TypeScript type checking

# Testing
npm test                 # Run all tests
npm test -- --watch      # Watch mode
npm test -- <file>       # Run specific test

# Deployment
vercel                   # Deploy to Vercel
vercel --prod            # Deploy to production
```

## License

ISC
