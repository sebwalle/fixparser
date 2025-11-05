# Limina FIX Analyzer

A production-ready web application for analyzing FIX protocol messages with a clean 4-section UI (Ingest, Orders, Messages, and Details).

## Project Status

**Phase 1: Project Setup & Foundation** ✅ COMPLETED

The foundation is ready for development. All core infrastructure has been set up and verified.

## Quick Start

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build

# Run tests
npm test

# Type check
npm run type-check

# Lint code
npm run lint
```

The app will be available at [http://localhost:3000](http://localhost:3000)

## Tech Stack

- **Framework**: Next.js 14 (App Router) + TypeScript
- **Styling**: Tailwind CSS v4 + shadcn/ui components
- **Testing**: Vitest + React Testing Library
- **Code Quality**: ESLint + Prettier
- **Runtime**: Node.js for storage/SSE, Edge for parsing

## Project Structure

```
fixparser/
├── app/                      # Next.js app directory
│   ├── layout.tsx           # Root layout with dark mode
│   ├── page.tsx             # Home page
│   ├── globals.css          # Global styles + Tailwind
│   └── api/                 # API routes (to be implemented)
│       ├── fix/             # Parse and repair endpoints
│       ├── messages/        # Ingest, list, and stream
│       └── orders/          # Aggregated orders
├── components/              # React components
│   ├── ui/                  # shadcn/ui components (to be added)
│   └── sections/            # Main sections (to be implemented)
├── lib/                     # Core logic
│   ├── utils.ts             # Utility functions
│   ├── fix/                 # FIX parsing logic (to be implemented)
│   ├── store/               # Storage implementations (to be implemented)
│   └── server/              # Server utilities (to be implemented)
├── __tests__/               # Test files
└── public/                  # Static assets
```

## Environment Variables

Copy `.env.example` to `.env.local` and configure:

```bash
# API Authentication (optional)
FIX_API_TOKEN=

# CORS Configuration
ALLOWED_ORIGINS=*

# AI Repair Feature (optional)
ENABLE_AI_REPAIR=false
FIX_AI_PROVIDER=
FIX_AI_KEY=

# Storage Configuration
USE_KV=false
```

## Development

The project follows the implementation plan in [PLAN.md](PLAN.md).

### Completed (Phase 1)
- ✅ Next.js 14 with TypeScript and App Router
- ✅ Tailwind CSS v4 configuration
- ✅ shadcn/ui setup and utilities
- ✅ ESLint + Prettier configuration
- ✅ Vitest + React Testing Library
- ✅ Dark mode theme
- ✅ Environment variables structure
- ✅ Project directory structure

### Next Steps (Phase 2)
- Implement FIX data types and interfaces
- Create FIX tag dictionary
- Build relaxed and strict parsers
- Implement repair suggestion logic
- Write comprehensive tests

## Configuration Files

- `tsconfig.json` - TypeScript configuration (strict mode enabled)
- `tailwind.config.ts` - Tailwind CSS configuration with design tokens
- `vitest.config.ts` - Vitest test configuration
- `.eslintrc.json` - ESLint rules
- `.prettierrc` - Prettier formatting rules
- `components.json` - shadcn/ui configuration

## Scripts

- `npm run dev` - Start development server (with hot reload)
- `npm run build` - Build production bundle
- `npm run start` - Start production server
- `npm run lint` - Run ESLint
- `npm run type-check` - Check TypeScript types
- `npm test` - Run tests with Vitest

## Features (Planned)

### 4-Section UI
1. **Ingest** - Paste/upload FIX messages and view POSTed messages
2. **Orders** - Grouped by ClOrdID with key fields
3. **Messages** - List of all parsed messages
4. **Details** - Selected message with sortable tag/value table

### Parsing
- **Relaxed Parser**: Accepts `|`, `^`, or SOH delimiters
- **Strict Parser**: Validates SOH delimiters and tag=value format
- **Repair Suggestions**: Deterministic fixes for common issues
- **AI Repair** (Optional): AI-powered message repair

### Storage
- In-memory store (default)
- Vercel KV support (optional)
- SSE streaming for live updates
- Polling fallback

## Testing Guidelines

Following project coding standards from [CLAUDE.md](CLAUDE.md):

- Readability is paramount - don't over-complicate
- Use maps for value checking instead of multiple variables
- Use table-based tests where applicable
- Use `require` instead of `assert` when missed assertion makes rest of test obsolete

Example test pattern:
```typescript
describe('Feature', () => {
  it('should do something correctly', () => {
    const result = doSomething()

    const wantFields = {
      field1: 'value1',
      field2: 'value2',
    }

    const gotFields: Record<string, string> = {}
    result.fields.forEach(f => {
      gotFields[f.name] = f.value
    })

    expect(gotFields).toEqual(wantFields)
  })
})
```

## Contributing

See [PLAN.md](PLAN.md) for the complete implementation roadmap and [CLAUDE.md](CLAUDE.md) for project-specific guidelines.

## License

ISC
