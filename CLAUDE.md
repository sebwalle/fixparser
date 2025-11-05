# CLAUDE.md - Project Guidelines for Limina FIX Analyzer

## Purpose
This file contains project-specific instructions for Claude when working on the Limina FIX Analyzer codebase.

## How to Use PLAN.md
1. **PLAN.md is the single source of truth** for implementation progress
2. **Always check PLAN.md** before starting work to understand current phase and context
3. **Update checkboxes** in PLAN.md as tasks are completed
4. **Follow the phase order** unless explicitly instructed otherwise
5. **Reference PLAN.md** when asking clarifying questions about what to build next
6. **Don't skip phases** - each builds on previous work

## Project-Specific Technical Decisions


#### Package Management
- **Package Manager**: `npm`

#### Testing Framework
- **Test Framework**: Vitest + React Testing Library
- **Test Location**: next to the file under test.
- **Test Naming**: `*.test.ts` or `*.test.tsx`
- Change by updating vitest.config.ts and package.json scripts


### Configuration Choices (Easily Changeable)
All technical decisions that might need adjustment are consolidated here. Update this section if preferences change.

#### AI Repair Feature
- **Primary Provider**: Provider-agnostic interface
- **First Implementation**: OpenAI
- **Future Providers**: Anthropic Claude, AWS Bedrock
- Interface defined in `lib/server/ai-provider.ts` (to be created)
- Add new providers by implementing the interface

#### Storage Backend Priority
- **Phase 1**: In-memory store (default)
- **Phase 2**: Vercel KV (optional, feature-flagged)
- Toggle via `USE_KV` environment variable

#### Rate Limiting Defaults
- **Write Endpoints**: 100 requests per 5 minutes per IP
- **Read Endpoints**: 300 requests per 5 minutes per IP
- Configurable in `lib/server/ratelimit.ts`

#### TransType Field Handling
- **Supported Tags**: 60 (TransactTime - primary), 150 (ExecType), 39 (OrdStatus)
- **Display Logic**: Show whichever is present, prefer 60 > 150 > 39
- **Location**: Summary extraction in parser logic

#### FIX Sample Messages
- **Format**: FIX 4.4 protocol
- **Scenarios**:
  - New Order Single (35=D)
  - Execution Report - New (35=8, 39=0)
  - Execution Report - Partial Fill (35=8, 39=1)
  - Execution Report - Filled (35=8, 39=2)
  - Order Cancel Request (35=F)
  - Order Cancel Reject (35=9)
- **Location**: `lib/fix/samples.ts` 

#### shadcn/ui Components to Install
Essential components for initial setup:
```bash
npx shadcn@latest add button
npx shadcn@latest add card
npx shadcn@latest add table
npx shadcn@latest add badge
npx shadcn@latest add textarea
npx shadcn@latest add toast
npx shadcn@latest add tabs
npx shadcn@latest add dialog
npx shadcn@latest add select
npx shadcn@latest add scroll-area
```

Add more as needed during development.
Always wrap the component so that we can change actual implementation easily.

## Coding Standards

### TypeScript
- **Strict mode**: Enabled
- **No implicit any**: Enforce
- **Prefer interfaces** over types for object shapes
- **Use type** for unions, intersections, and primitives

### Testing Guidelines (per user's global CLAUDE.md)
1. **Readability is paramount** - don't over-complicate
2. **Use maps for value checking** instead of multiple variables
3. **Use table-based tests** where applicable
4. **Use `require` instead of `assert`** when missed assertion makes rest of test obsolete
5. **Prefer clear test names** that describe the scenario

Example test pattern:
```typescript
describe('FIX Parser', () => {
  it('should parse valid FIX message with correct field values', () => {
    const input = '8=FIX.4.4|9=100|35=D|11=ORDER123|55=AAPL|54=1|38=100|';
    const result = parseRelaxed(input);

    const wantFields = {
      '35': 'D',
      '11': 'ORDER123',
      '55': 'AAPL',
      '54': '1',
      '38': '100',
    };

    const gotFields: Record<string, string> = {};
    result.fields.forEach(f => {
      gotFields[f.tag] = f.value;
    });

    expect(gotFields).toEqual(wantFields);
    expect(result.warnings).toHaveLength(0);
  });
});
```

### Component Structure
- **One component per file**
- **Extract complex logic** to hooks or utility functions
- **Keep components focused** - single responsibility
- **Use TypeScript props interfaces**
- **Document complex props** with JSDoc

### Error Handling
- **API Routes**: Always return structured errors with proper status codes
- **Client Components**: Use error boundaries
- **Async Operations**: Always handle Promise rejections
- **User-Facing Errors**: Provide actionable error messages

### Styling
- **Use Tailwind CSS** utility classes
- **Follow shadcn/ui patterns** for consistency
- **Dark mode**: Use Tailwind's dark: prefix
- **Responsive**: Mobile-first approach (min-width breakpoints)

## API Design Principles

### Request/Response Formats
- **POST bodies**: Accept both JSON and text/plain where applicable
- **Error responses**:
  ```typescript
  {
    error: string;
    issues?: Array<{type: string; message: string; position?: number}>;
    suggestions?: Array<{type: string; description: string; preview?: string}>;
  }
  ```
- **Success responses**: Return full object + metadata
  ```typescript
  {
    data: T;
    meta?: {cursor?: string; total?: number};
  }
  ```

### Authentication
- **Optional Bearer token**: Check `FIX_API_TOKEN` env var
- **Header**: `Authorization: Bearer <token>`
- **Applies to**: `/api/fix/parse` and `/api/messages/ingest`

### CORS
- **Configurable via**: `ALLOWED_ORIGINS` env var
- **Default**: `*` (allow all)
- **Production**: Set specific origins

## State Management Strategy
- **Use React Context** for global state (selected order, selected message)
- **Server State**: Use native fetch with React Server Components where possible
- **Client State**: React useState/useReducer
- **No external state library needed** for this app's complexity

## Performance Considerations
- **SSE with Polling Fallback**: Implement both for reliability
- **Pagination**: Default 50 items, configurable
- **Virtual Scrolling**: Consider for large message lists (if >1000 items)
- **Memoization**: Use React.memo for expensive list items
- **Edge Runtime**: Use for parse-only operations (no storage)

## Security Checklist
- [ ] Validate all input (never trust client data)
- [ ] Sanitize error messages (no stack traces in production)
- [ ] Rate limit all write endpoints
- [ ] Implement CORS properly
- [ ] Never log sensitive data
- [ ] Use environment variables for secrets
- [ ] Validate file uploads (size, type)
- [ ] Implement CSP headers

## Deployment Checklist
- [ ] All environment variables documented in .env.example
- [ ] README has deployment instructions
- [ ] Build passes without errors (`npm run build`)
- [ ] Tests pass (`npm test`)
- [ ] No TypeScript errors (`npm run type-check`)
- [ ] No ESLint errors (`npm run lint`)
- [ ] Lighthouse audit meets targets
- [ ] Test on mobile viewport

## Common Patterns to Follow

### SSE Implementation
```typescript
// Server
export async function GET() {
  const stream = new ReadableStream({
    start(controller) {
      store.stream(controller);
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}

// Client
useEffect(() => {
  const eventSource = new EventSource('/api/messages/stream');

  eventSource.onmessage = (event) => {
    const message = JSON.parse(event.data);
    setMessages(prev => [message, ...prev]);
  };

  eventSource.onerror = () => {
    eventSource.close();
    // Fallback to polling
  };

  return () => eventSource.close();
}, []);
```

### Parser Error Handling
```typescript
try {
  const parsed = parseStrict(input);
  return parsed;
} catch (error) {
  if (error instanceof ParseError) {
    const suggestions = generateRepairSuggestions(input, error.issues);
    return { error: error.message, issues: error.issues, suggestions };
  }
  throw error;
}
```

## Questions to Ask Before Major Changes
1. Does this change affect the 4-section interaction model?
2. Does this require updating the PRD.md?
3. Does this change API contracts?
4. Does this require new environment variables?
5. Does this affect the storage interface?
6. Should this be feature-flagged?

## When to Update This File
- Configuration preferences change (package manager, test framework, etc.)
- New architectural patterns emerge
- Rate limits or defaults change
- New security considerations arise
- Deployment strategy changes

## Integration with User's Global CLAUDE.md
The user has global guidelines about testing (map-based assertions, table-driven tests, require vs assert). **Always apply those guidelines** in addition to the project-specific rules here.

## Command Reference
```bash
# Development
npm run dev              # Start dev server
npm run build            # Production build
npm run lint             # Run ESLint
npm run type-check       # TypeScript check
npm test                 # Run all tests
npm test -- --watch      # Watch mode
npm test -- <file>       # Run specific test

# Setup
npm install              # Install dependencies
npx shadcn@latest add <component>  # Add UI component

# Deployment
vercel                   # Deploy to Vercel
vercel --prod            # Deploy to production
```

## File Organization Rules
- **Keep API routes thin**: Move logic to lib/
- **Colocate tests**: Near the code they test (or in __tests__/)
- **One export per file**: Except for types/interfaces
- **Index files**: Avoid barrel exports (explicit imports preferred)

## Gotchas & Common Mistakes
1. **SOH Character**: `\x01` is special - handle carefully in strings
2. **Edge Runtime Limitations**: No Node.js APIs (fs, crypto, etc.)
3. **SSE Format**: Must end with `\n\n` (two newlines)
4. **Next.js Caching**: Be explicit with cache: 'no-store' for dynamic data
5. **Tag Ordering**: FIX tags aren't always in order - don't assume

## Review Checklist for PRs / Commits
- [ ] Code follows TypeScript strict mode
- [ ] Tests follow user's map-based pattern
- [ ] No console.logs (use proper logging)
- [ ] Error messages are user-friendly
- [ ] Types are properly exported/imported
- [ ] No any types without justification
- [ ] Mobile responsive (tested at 360px)
- [ ] Dark mode looks correct
- [ ] PLAN.md checkboxes updated

---

**Remember**: This file is meant to be updated as the project evolves. Keep it current!
