# State Flow Documentation

## Overview
The FIX Analyzer uses a simple prop-drilling approach for state management. Given that we only have 4 sections on a single page, this is cleaner and more explicit than using Context or a global state library.

## State Architecture

### Global State (in `/app/page.tsx`)
```typescript
const [selectedMessage, setSelectedMessage] = useState<StoredMessage | null>(null);
const [selectedOrderKey, setSelectedOrderKey] = useState<string | null>(null);
```

### Local State (in each section component)
- **IngestSection**: `messages` (live feed), `input`, `isSubmitting`, `selectedSample`
- **OrdersSection**: `orders`, `isLoading`
- **MessagesSection**: `messages`, `isLoading`, `nextCursor`, `prevCursors`, `hasMore`
- **DetailsSection**: `sortColumn`, `sortDirection`

## User Interaction Flows

### 1. Order Click → Messages Filter
**Flow:**
1. User clicks an order in OrdersSection
2. `OrdersSection` calls `onOrderClick(orderKey)`
3. `page.tsx` updates `selectedOrderKey` state
4. `MessagesSection` receives `selectedOrderKey` prop
5. `MessagesSection` refetches with filter: `/api/messages?orderKey=...`
6. `MessagesSection` scrolls itself into view
7. Filter badge appears with "X" button

**Code Path:**
```
OrdersSection (line 112)
  → onOrderClick (page.tsx line 31)
  → setSelectedOrderKey (page.tsx line 14)
  → MessagesSection receives selectedOrderKey prop (page.tsx line 37)
  → useEffect refetch (messages.tsx line 58)
```

### 2. Message Click → Details View
**Flow:**
1. User clicks a message in MessagesSection
2. `MessagesSection` calls `onMessageClick(message)`
3. `page.tsx` updates `selectedMessage` state
4. `DetailsSection` receives `selectedMessage` prop
5. `DetailsSection` renders the message details
6. `MessagesSection` scrolls details section into view

**Code Path:**
```
MessagesSection (line 191)
  → onMessageClick (page.tsx line 35)
  → setSelectedMessage (page.tsx line 17)
  → DetailsSection receives selectedMessage prop (page.tsx line 39)
  → Details renders (details.tsx line 26)
```

### 3. Ingest Message Click → Details View
**Flow:**
1. SSE updates arrive in IngestSection
2. New message added to local feed
3. User clicks message in live feed
4. `IngestSection` calls `onMessageClick(msg)`
5. `page.tsx` updates `selectedMessage` state
6. `DetailsSection` receives `selectedMessage` prop and renders

**Code Path:**
```
IngestSection SSE (line 28-52)
  → messages state updated (line 52)
  → User clicks feed item (line 254)
  → onMessageClick (page.tsx line 30)
  → setSelectedMessage (page.tsx line 17)
  → DetailsSection receives selectedMessage prop (page.tsx line 39)
```

### 4. Clear Filter → Reset Messages View
**Flow:**
1. User clicks "X" on filter badge in MessagesSection
2. `MessagesSection` calls `onClearFilter()`
3. `page.tsx` sets `selectedOrderKey` to null
4. `MessagesSection` receives null and refetches all messages
5. Filter badge disappears

**Code Path:**
```
MessagesSection (line 144)
  → onClearFilter (page.tsx line 36)
  → setSelectedOrderKey(null) (page.tsx line 21)
  → MessagesSection receives null (page.tsx line 37)
  → useEffect refetch without filter (messages.tsx line 58)
```

## Props Interface

### IngestSection
```typescript
interface IngestSectionProps {
  onMessageClick?: (message: StoredMessage) => void;
}
```

### OrdersSection
```typescript
interface OrdersSectionProps {
  onOrderClick?: (orderKey: string) => void;
  selectedOrderKey?: string | null;
}
```

### MessagesSection
```typescript
interface MessagesSectionProps {
  onMessageClick?: (message: StoredMessage) => void;
  onClearFilter?: () => void;
  selectedOrderKey?: string | null;
}
```

### DetailsSection
```typescript
interface DetailsSectionProps {
  selectedMessage: StoredMessage | null;
}
```

## Why Props Over Context?

### Advantages of Prop Drilling Here:
1. **Explicit data flow** - Easy to trace where data comes from
2. **Simple to debug** - All state in one file (`page.tsx`)
3. **No over-engineering** - Only 4 components, single page
4. **TypeScript-friendly** - Props are type-safe and discoverable
5. **Performance** - No context re-render issues

### When to Switch to Context:
- If sections become deeply nested (3+ levels)
- If state needs to be shared across multiple pages
- If the component tree becomes complex

## Testing State Flow

To verify state flow works:

1. **Order → Messages Filter**
   - Click an order in Orders section
   - Verify Messages section shows filtered badge
   - Verify Messages table updates
   - Verify scrolling occurs

2. **Message → Details**
   - Click a message in Messages table
   - Verify Details section updates
   - Verify scrolling occurs

3. **Ingest → Details**
   - Submit a message via Ingest
   - Wait for it to appear in live feed
   - Click the message in feed
   - Verify Details section updates

4. **Clear Filter**
   - Filter Messages by clicking an Order
   - Click "X" on filter badge
   - Verify badge disappears
   - Verify all messages are shown again

## SSE Updates

The IngestSection subscribes to SSE (`/api/messages/stream`) and maintains a local list of recent messages (last 50). This is independent of the global state - the feed is purely for quick access to recent ingested messages.

When a message is clicked in the feed, it updates the global `selectedMessage` state, which then flows down to DetailsSection.

## Future Improvements

If the app grows, consider:
- Moving to React Context for `selectedMessage` and `selectedOrderKey`
- Using a URL query parameter for `selectedOrderKey` (enables sharing filtered views)
- Implementing a state management library (Zustand, Jotai) if complexity increases
- Adding keyboard navigation for selecting messages/orders
