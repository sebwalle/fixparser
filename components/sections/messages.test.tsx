import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { MessagesSection } from './messages';
import type { FixMessage } from '@/lib/types';

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

describe('MessagesSection', () => {
  const mockMessages: FixMessage[] = [
    {
      id: 'msg1',
      receivedAt: '2025-01-01T10:00:00Z',
      rawMessage: '8=FIX.4.4...',
      fields: [],
      summary: {
        msgType: 'D',
        clOrdId: 'ORDER001',
        orderId: 'ORD123',
        symbol: 'AAPL',
        side: '1',
        qty: '100',
        price: '150.00',
        transType: '0',
        ordStatus: '0',
      },
      warnings: [],
    },
    {
      id: 'msg2',
      receivedAt: '2025-01-01T10:05:00Z',
      rawMessage: '8=FIX.4.4...',
      fields: [],
      summary: {
        msgType: '8',
        clOrdId: 'ORDER001',
        orderId: 'ORD123',
        symbol: 'AAPL',
        side: '1',
        qty: '100',
        price: '150.00',
        ordStatus: '2',
      },
      warnings: [],
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
    render(<MessagesSection />);
    expect(screen.getByText('Loading messages...')).toBeInTheDocument();
  });

  it('should fetch and display messages', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        data: mockMessages.map((msg) => ({
          ...msg,
          receivedAt: msg.receivedAt,
        })),
        meta: { nextCursor: null, total: 2 },
      }),
    });

    render(<MessagesSection />);

    await waitFor(() => {
      const orderIds = screen.getAllByText('ORDER001');
      expect(orderIds.length).toBeGreaterThan(0);
    });

    // Check message details (use getAllByText since both messages have same values)
    expect(screen.getAllByText('AAPL').length).toBeGreaterThan(0);
    expect(screen.getAllByText('BUY').length).toBeGreaterThan(0);
    expect(screen.getAllByText('100').length).toBeGreaterThan(0);
    expect(screen.getAllByText('150.00').length).toBeGreaterThan(0);
  });

  it('should display empty state when no messages', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        data: [],
        meta: { nextCursor: null, total: 0 },
      }),
    });

    render(<MessagesSection />);

    await waitFor(() => {
      expect(screen.getByText(/No messages yet/i)).toBeInTheDocument();
    });
  });

  it('should handle fetch error gracefully', async () => {
    fetchMock.mockRejectedValueOnce(new Error('Network error'));

    render(<MessagesSection />);

    await waitFor(() => {
      expect(screen.getByText(/No messages yet/i)).toBeInTheDocument();
    });
  });

  it('should call onMessageClick when message is clicked', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        data: mockMessages.map((msg) => ({
          ...msg,
          receivedAt: msg.receivedAt,
        })),
        meta: { nextCursor: null, total: 2 },
      }),
    });

    const onMessageClick = vi.fn();
    render(<MessagesSection onMessageClick={onMessageClick} />);

    await waitFor(() => {
      const orderIds = screen.getAllByText('ORDER001');
      expect(orderIds.length).toBeGreaterThan(0);
    });

    const messageRow = screen.getAllByText('ORDER001')[0].closest('tr');
    if (messageRow) {
      fireEvent.click(messageRow);
    }

    expect(onMessageClick).toHaveBeenCalledTimes(1);
    expect(onMessageClick.mock.calls[0][0]).toMatchObject({
      id: 'msg1',
    });
  });

  it('should filter messages by orderKey', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        data: [mockMessages[0]].map((msg) => ({
          ...msg,
          receivedAt: msg.receivedAt,
        })),
        meta: { nextCursor: null, total: 1 },
      }),
    });

    render(<MessagesSection selectedOrderKey="ORDER001" />);

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining('orderKey=ORDER001')
      );
    });

    await waitFor(() => {
      expect(screen.getByText(/Filtered by: ORDER001/i)).toBeInTheDocument();
    });
  });

  it('should display filter badge when filtering', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        data: [],
        meta: { nextCursor: null, total: 0 },
      }),
    });

    render(<MessagesSection selectedOrderKey="ORDER001" />);

    await waitFor(() => {
      expect(screen.getByText(/Filtered by: ORDER001/i)).toBeInTheDocument();
    });
  });

  it('should show empty state with filter message when no messages for order', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        data: [],
        meta: { nextCursor: null, total: 0 },
      }),
    });

    render(<MessagesSection selectedOrderKey="ORDER001" />);

    await waitFor(() => {
      expect(screen.getByText(/No messages found for this order/i)).toBeInTheDocument();
    });
  });

  it('should format msgType correctly', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        data: mockMessages.map((msg) => ({
          ...msg,
          receivedAt: msg.receivedAt,
        })),
        meta: { nextCursor: null, total: 2 },
      }),
    });

    render(<MessagesSection />);

    await waitFor(() => {
      expect(screen.getByText('NewOrder')).toBeInTheDocument();
      expect(screen.getByText('ExecReport')).toBeInTheDocument();
    });
  });

  it('should format side correctly', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        data: mockMessages.map((msg) => ({
          ...msg,
          receivedAt: msg.receivedAt,
        })),
        meta: { nextCursor: null, total: 2 },
      }),
    });

    render(<MessagesSection />);

    await waitFor(() => {
      const buyElements = screen.getAllByText('BUY');
      expect(buyElements.length).toBeGreaterThan(0);
    });
  });

  it('should format ordStatus correctly', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        data: mockMessages.map((msg) => ({
          ...msg,
          receivedAt: msg.receivedAt,
        })),
        meta: { nextCursor: null, total: 2 },
      }),
    });

    render(<MessagesSection />);

    await waitFor(() => {
      expect(screen.getByText('New')).toBeInTheDocument();
      expect(screen.getByText('Filled')).toBeInTheDocument();
    });
  });

  it('should enable next button when hasMore is true', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        data: mockMessages.map((msg) => ({
          ...msg,
          receivedAt: msg.receivedAt,
        })),
        meta: { nextCursor: 'cursor123', total: 100 },
      }),
    });

    render(<MessagesSection />);

    await waitFor(() => {
      const nextButton = screen.getByText('Next');
      expect(nextButton).not.toBeDisabled();
    });
  });

  it('should disable next button when no more messages', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        data: mockMessages.map((msg) => ({
          ...msg,
          receivedAt: msg.receivedAt,
        })),
        meta: { nextCursor: null, total: 2 },
      }),
    });

    render(<MessagesSection />);

    await waitFor(() => {
      const nextButton = screen.getByText('Next');
      expect(nextButton).toBeDisabled();
    });
  });

  it('should disable previous button initially', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        data: mockMessages.map((msg) => ({
          ...msg,
          receivedAt: msg.receivedAt,
        })),
        meta: { nextCursor: null, total: 2 },
      }),
    });

    render(<MessagesSection />);

    await waitFor(() => {
      const prevButton = screen.getByText('Previous');
      expect(prevButton).toBeDisabled();
    });
  });

  it('should handle pagination next', async () => {
    fetchMock
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: mockMessages.map((msg) => ({
            ...msg,
            receivedAt: msg.receivedAt,
          })),
          meta: { nextCursor: 'cursor123', total: 100 },
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: [],
          meta: { nextCursor: null, total: 100 },
        }),
      });

    render(<MessagesSection />);

    await waitFor(() => {
      expect(screen.getByText('Next')).not.toBeDisabled();
    });

    fireEvent.click(screen.getByText('Next'));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining('cursor=cursor123')
      );
    });
  });

  it('should display message count', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        data: mockMessages.map((msg) => ({
          ...msg,
          receivedAt: msg.receivedAt,
        })),
        meta: { nextCursor: null, total: 2 },
      }),
    });

    render(<MessagesSection />);

    await waitFor(() => {
      expect(screen.getByText('2 messages')).toBeInTheDocument();
    });
  });

  it('should have data-section attribute', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        data: [],
        meta: { nextCursor: null, total: 0 },
      }),
    });

    const { container } = render(<MessagesSection />);

    await waitFor(() => {
      const section = container.querySelector('[data-section="messages"]');
      expect(section).toBeInTheDocument();
    });
  });

  it('should display all table columns', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        data: mockMessages.map((msg) => ({
          ...msg,
          receivedAt: msg.receivedAt,
        })),
        meta: { nextCursor: null, total: 2 },
      }),
    });

    render(<MessagesSection />);

    await waitFor(() => {
      const wantColumns = [
        'Received At',
        'MsgType',
        'TransType',
        'OrdStatus',
        'ClOrdID',
        'OrderID',
        'Symbol',
        'Side',
        'Qty',
        'Price',
      ];

      wantColumns.forEach((col) => {
        expect(screen.getByText(col)).toBeInTheDocument();
      });
    });
  });

  it('should display dash for missing optional fields', async () => {
    const messageWithMissingFields: FixMessage = {
      id: 'msg3',
      receivedAt: '2025-01-01T10:00:00Z',
      rawMessage: '8=FIX.4.4...',
      fields: [],
      summary: {
        msgType: 'D',
      },
      warnings: [],
    };

    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        data: [messageWithMissingFields],
        meta: { nextCursor: null, total: 1 },
      }),
    });

    render(<MessagesSection />);

    await waitFor(() => {
      expect(screen.getByText('NewOrder')).toBeInTheDocument();
    });

    // Should have multiple dashes for missing fields
    const table = screen.getByRole('table');
    const dashes = Array.from(table.querySelectorAll('td')).filter(
      (td) => td.textContent === '-'
    );
    expect(dashes.length).toBeGreaterThan(0);
  });
});
