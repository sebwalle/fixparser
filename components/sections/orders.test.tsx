import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { OrdersSection } from './orders';
import type { OrderRow } from '@/lib/types';

// Mock toast
vi.mock('sonner', () => ({
  toast: {
    error: vi.fn(),
    success: vi.fn(),
    info: vi.fn(),
  },
}));

// Mock ScrollArea component
vi.mock('@/components/ui/scroll-area', () => ({
  ScrollArea: ({ children, className }: any) => <div className={className}>{children}</div>,
}));

describe('OrdersSection', () => {
  const mockOrders: OrderRow[] = [
    {
      orderKey: 'ORDER001',
      orderId: 'ORD123',
      symbol: 'AAPL',
      side: '1',
      originalQty: '100',
      latestStatus: '0',
      messageCount: 3,
      firstSeenAt: '2025-01-01T10:00:00Z',
      lastSeenAt: '2025-01-01T10:05:00Z',
    },
    {
      orderKey: 'ORDER002',
      orderId: 'ORD456',
      symbol: 'GOOGL',
      side: '2',
      originalQty: '50',
      latestStatus: '2',
      messageCount: 5,
      firstSeenAt: '2025-01-01T11:00:00Z',
      lastSeenAt: '2025-01-01T11:10:00Z',
    },
  ];

  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchMock = vi.fn();
    global.fetch = fetchMock as any;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should render loading state initially', () => {
    fetchMock.mockImplementation(() => new Promise(() => {})); // Never resolves
    render(<OrdersSection />);
    expect(screen.getByText('Loading orders...')).toBeInTheDocument();
  });

  it('should fetch and display orders', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: mockOrders }),
    });

    render(<OrdersSection />);

    await waitFor(() => {
      expect(screen.getByText('ORDER001')).toBeInTheDocument();
      expect(screen.getByText('ORDER002')).toBeInTheDocument();
    });

    // Check order details
    expect(screen.getByText('AAPL')).toBeInTheDocument();
    expect(screen.getByText('GOOGL')).toBeInTheDocument();
    expect(screen.getByText('BUY')).toBeInTheDocument();
    expect(screen.getByText('SELL')).toBeInTheDocument();
  });

  it('should display empty state when no orders', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: [] }),
    });

    render(<OrdersSection />);

    await waitFor(() => {
      expect(screen.getByText(/No orders yet/i)).toBeInTheDocument();
    });
  });

  it('should handle fetch error gracefully', async () => {
    fetchMock.mockRejectedValueOnce(new Error('Network error'));

    render(<OrdersSection />);

    await waitFor(() => {
      expect(screen.getByText(/No orders yet/i)).toBeInTheDocument();
    });
  });

  it('should call onOrderClick when order is clicked', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: mockOrders }),
    });

    const onOrderClick = vi.fn();
    render(<OrdersSection onOrderClick={onOrderClick} />);

    await waitFor(() => {
      expect(screen.getByText('ORDER001')).toBeInTheDocument();
    });

    const orderCard = screen.getByText('ORDER001').closest('div[class*="cursor-pointer"]');
    if (orderCard) {
      fireEvent.click(orderCard);
    }

    expect(onOrderClick).toHaveBeenCalledWith('ORDER001');
  });

  it('should highlight selected order', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: mockOrders }),
    });

    render(<OrdersSection selectedOrderKey="ORDER001" />);

    await waitFor(() => {
      expect(screen.getByText('ORDER001')).toBeInTheDocument();
    });

    const selectedCard = screen.getByText('ORDER001').closest('div[class*="cursor-pointer"]');
    expect(selectedCard?.className).toContain('border-primary');
  });

  it('should format side correctly', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: mockOrders }),
    });

    render(<OrdersSection />);

    await waitFor(() => {
      const wantFormats = new Map([
        ['1', 'BUY'],
        ['2', 'SELL'],
      ]);

      const gotFormats = new Map<string, string>();
      mockOrders.forEach((order) => {
        const sideText = order.side === '1' ? 'BUY' : 'SELL';
        if (screen.queryByText(sideText)) {
          gotFormats.set(order.side, sideText);
        }
      });

      expect(gotFormats.get('1')).toBe(wantFormats.get('1'));
      expect(gotFormats.get('2')).toBe(wantFormats.get('2'));
    });
  });

  it('should format status correctly', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: mockOrders }),
    });

    render(<OrdersSection />);

    await waitFor(() => {
      const wantStatuses = new Map([
        ['0', 'New'],
        ['2', 'Filled'],
      ]);

      expect(screen.getByText('New')).toBeInTheDocument();
      expect(screen.getByText('Filled')).toBeInTheDocument();
    });
  });

  it('should call fetch on mount', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({ data: mockOrders }),
    });

    render(<OrdersSection />);

    // Initial fetch
    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith('/api/orders');
    });
  });

  it('should display message count', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: mockOrders }),
    });

    render(<OrdersSection />);

    await waitFor(() => {
      const wantCounts = new Map([
        ['ORDER001', 3],
        ['ORDER002', 5],
      ]);

      // Both message counts should be in the document
      expect(screen.getByText('3')).toBeInTheDocument();
      expect(screen.getByText('5')).toBeInTheDocument();
    });
  });

  it('should display timestamps', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: mockOrders }),
    });

    render(<OrdersSection />);

    await waitFor(() => {
      // Check that timestamp labels are present
      const firstLabels = screen.getAllByText(/First:/i);
      const lastLabels = screen.getAllByText(/Last:/i);

      expect(firstLabels.length).toBeGreaterThan(0);
      expect(lastLabels.length).toBeGreaterThan(0);
    });
  });
});
