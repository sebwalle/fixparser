import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { DetailsSection } from './details';
import type { FixMessage } from '@/lib/types';

// Mock toast
vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

// Mock ScrollArea component
vi.mock('@/components/ui/scroll-area', () => ({
  ScrollArea: ({ children, className }: any) => <div className={className}>{children}</div>,
}));

describe('DetailsSection', () => {
  const mockMessage: FixMessage = {
    id: 'msg123',
    receivedAt: '2025-01-01T10:00:00Z',
    rawMessage: '8=FIX.4.4|9=100|35=D|11=ORDER001|55=AAPL|54=1|38=100|',
    fields: [
      { tag: '8', name: 'BeginString', value: 'FIX.4.4' },
      { tag: '35', name: 'MsgType', value: 'D' },
      { tag: '11', name: 'ClOrdID', value: 'ORDER001' },
      { tag: '55', name: 'Symbol', value: 'AAPL' },
      { tag: '54', name: 'Side', value: '1' },
      { tag: '38', name: 'OrderQty', value: '100' },
    ],
    summary: {
      msgType: 'D',
      clOrdId: 'ORDER001',
      orderId: 'ORD123',
      symbol: 'AAPL',
      side: '1',
      qty: '100',
      price: '150.00',
      ordStatus: '0',
    },
    warnings: [],
  };

  let clipboardWriteTextMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    clipboardWriteTextMock = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, {
      clipboard: {
        writeText: clipboardWriteTextMock,
      },
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Empty State', () => {
    it('should display empty state when no message selected', () => {
      render(<DetailsSection selectedMessage={null} />);

      expect(screen.getByText('4. Details')).toBeInTheDocument();
      expect(
        screen.getByText(/No message selected. Click a message in the Messages section/i)
      ).toBeInTheDocument();
    });

    it('should have data-section attribute in empty state', () => {
      const { container } = render(<DetailsSection selectedMessage={null} />);
      const section = container.querySelector('[data-section="details"]');
      expect(section).toBeInTheDocument();
    });
  });

  describe('Message Display', () => {
    it('should display message details when message is selected', () => {
      render(<DetailsSection selectedMessage={mockMessage} />);

      expect(screen.getByText('4. Details')).toBeInTheDocument();
      expect(screen.getByText(/Full field breakdown/i)).toBeInTheDocument();
    });

    it('should display summary header with message type badge', () => {
      render(<DetailsSection selectedMessage={mockMessage} />);

      expect(screen.getByText('NewOrder')).toBeInTheDocument();
    });

    it('should display order status in summary header', () => {
      render(<DetailsSection selectedMessage={mockMessage} />);

      expect(screen.getByText('New')).toBeInTheDocument();
    });

    it('should display symbol in summary header', () => {
      render(<DetailsSection selectedMessage={mockMessage} />);

      const symbols = screen.getAllByText('AAPL');
      expect(symbols.length).toBeGreaterThan(0);
    });

    it('should display ClOrdID in summary header', () => {
      render(<DetailsSection selectedMessage={mockMessage} />);

      expect(screen.getByText(/ClOrdID: ORDER001/i)).toBeInTheDocument();
    });

    it('should display OrderID in summary header', () => {
      render(<DetailsSection selectedMessage={mockMessage} />);

      expect(screen.getByText(/OrderID: ORD123/i)).toBeInTheDocument();
    });

    it('should display all fields in table', () => {
      render(<DetailsSection selectedMessage={mockMessage} />);

      const wantFields = {
        '8': 'BeginString',
        '35': 'MsgType',
        '11': 'ClOrdID',
        '55': 'Symbol',
        '54': 'Side',
        '38': 'OrderQty',
      };

      Object.entries(wantFields).forEach(([tag, name]) => {
        expect(screen.getByText(tag)).toBeInTheDocument();
        expect(screen.getByText(name)).toBeInTheDocument();
      });
    });

    it('should display field values', () => {
      render(<DetailsSection selectedMessage={mockMessage} />);

      // Check that basic field values are displayed
      expect(screen.getByText('FIX.4.4')).toBeInTheDocument();
      expect(screen.getByText('ORDER001')).toBeInTheDocument();

      // MsgType value (tag 35) should show with enum description
      // The text might be split across elements, so use a flexible matcher
      const table = screen.getByRole('table');
      expect(table.textContent).toContain('D');
      expect(table.textContent).toContain('NewOrder');
    });

    it('should display field count', () => {
      render(<DetailsSection selectedMessage={mockMessage} />);

      expect(screen.getByText('6 fields')).toBeInTheDocument();
    });
  });

  describe('Sorting Functionality', () => {
    it('should sort by tag in ascending order when tag header clicked', () => {
      render(<DetailsSection selectedMessage={mockMessage} />);

      const tagHeader = screen.getByText('Tag').closest('th');
      expect(tagHeader).toBeInTheDocument();

      if (tagHeader) {
        fireEvent.click(tagHeader);
      }

      const rows = screen.getAllByRole('row');
      // First row is header, check data rows
      const firstDataRow = rows[1];
      expect(firstDataRow.textContent).toContain('8'); // Lowest tag number
    });

    it('should sort by tag in descending order when tag header clicked twice', () => {
      render(<DetailsSection selectedMessage={mockMessage} />);

      const tagHeader = screen.getByText('Tag').closest('th');
      if (tagHeader) {
        fireEvent.click(tagHeader); // First click - ascending
        fireEvent.click(tagHeader); // Second click - descending
      }

      const rows = screen.getAllByRole('row');
      const firstDataRow = rows[1];
      expect(firstDataRow.textContent).toContain('55'); // Highest tag number
    });

    it('should sort by name in ascending order when name header clicked', () => {
      render(<DetailsSection selectedMessage={mockMessage} />);

      const nameHeader = screen.getByText('Name').closest('th');
      if (nameHeader) {
        fireEvent.click(nameHeader);
      }

      const rows = screen.getAllByRole('row');
      const firstDataRow = rows[1];
      expect(firstDataRow.textContent).toContain('BeginString'); // Alphabetically first
    });

    it('should sort by name in descending order when name header clicked twice', () => {
      render(<DetailsSection selectedMessage={mockMessage} />);

      const nameHeader = screen.getByText('Name').closest('th');
      if (nameHeader) {
        fireEvent.click(nameHeader); // First click - ascending
        fireEvent.click(nameHeader); // Second click - descending
      }

      const rows = screen.getAllByRole('row');
      const firstDataRow = rows[1];
      expect(firstDataRow.textContent).toContain('Symbol'); // Alphabetically last
    });

    it('should display sort indicator for active column', () => {
      render(<DetailsSection selectedMessage={mockMessage} />);

      const tagHeader = screen.getByText('Tag').closest('th');
      if (tagHeader) {
        fireEvent.click(tagHeader);
      }

      // Check for ascending indicator
      expect(tagHeader?.textContent).toContain('↑');
    });

    it('should switch sort column when different column clicked', () => {
      render(<DetailsSection selectedMessage={mockMessage} />);

      const tagHeader = screen.getByText('Tag').closest('th');
      const nameHeader = screen.getByText('Name').closest('th');

      if (tagHeader) {
        fireEvent.click(tagHeader); // Sort by tag
      }

      if (nameHeader) {
        fireEvent.click(nameHeader); // Switch to sort by name
      }

      // Name column should now have the indicator
      expect(nameHeader?.textContent).toContain('↑');
    });

    it('should remove sort when header clicked three times', () => {
      render(<DetailsSection selectedMessage={mockMessage} />);

      const tagHeader = screen.getByText('Tag').closest('th');
      if (tagHeader) {
        fireEvent.click(tagHeader); // First click - ascending
        fireEvent.click(tagHeader); // Second click - descending
        fireEvent.click(tagHeader); // Third click - remove sort
      }

      // Sort indicator should be gone
      expect(tagHeader?.textContent).not.toContain('↑');
      expect(tagHeader?.textContent).not.toContain('↓');
    });
  });

  describe('Action Buttons', () => {
    it('should display all action buttons', () => {
      render(<DetailsSection selectedMessage={mockMessage} />);

      expect(screen.getByText('Copy JSON')).toBeInTheDocument();
      expect(screen.getByText('Export JSON')).toBeInTheDocument();
      expect(screen.getByText('Copy Raw')).toBeInTheDocument();
    });

    it('should copy JSON to clipboard when Copy JSON clicked', async () => {
      const { toast } = await import('sonner');
      render(<DetailsSection selectedMessage={mockMessage} />);

      const copyButton = screen.getByText('Copy JSON');
      fireEvent.click(copyButton);

      await waitFor(() => {
        expect(clipboardWriteTextMock).toHaveBeenCalledTimes(1);
      });

      const copiedText = clipboardWriteTextMock.mock.calls[0][0];
      const parsed = JSON.parse(copiedText);
      expect(parsed.id).toBe('msg123');

      expect(toast.success).toHaveBeenCalledWith('JSON copied to clipboard');
    });

    it('should show error toast when copy JSON fails', async () => {
      const { toast } = await import('sonner');
      clipboardWriteTextMock.mockRejectedValueOnce(new Error('Clipboard error'));

      render(<DetailsSection selectedMessage={mockMessage} />);

      const copyButton = screen.getByText('Copy JSON');
      fireEvent.click(copyButton);

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith('Failed to copy JSON');
      });
    });

    it('should copy raw message to clipboard when Copy Raw clicked', async () => {
      const { toast } = await import('sonner');
      render(<DetailsSection selectedMessage={mockMessage} />);

      const copyRawButton = screen.getByText('Copy Raw');
      fireEvent.click(copyRawButton);

      await waitFor(() => {
        expect(clipboardWriteTextMock).toHaveBeenCalledWith(
          '8=FIX.4.4|9=100|35=D|11=ORDER001|55=AAPL|54=1|38=100|'
        );
      });

      expect(toast.success).toHaveBeenCalledWith('Raw message copied to clipboard');
    });

    it('should show error toast when copy raw fails', async () => {
      const { toast } = await import('sonner');
      clipboardWriteTextMock.mockRejectedValueOnce(new Error('Clipboard error'));

      render(<DetailsSection selectedMessage={mockMessage} />);

      const copyRawButton = screen.getByText('Copy Raw');
      fireEvent.click(copyRawButton);

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith('Failed to copy raw message');
      });
    });

    it('should export JSON when Export JSON clicked', async () => {
      const { toast } = await import('sonner');
      const createObjectURLSpy = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:url');
      const revokeObjectURLSpy = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});

      let createdAnchor: HTMLAnchorElement | null = null;
      const originalCreateElement = document.createElement.bind(document);
      const createElementSpy = vi.spyOn(document, 'createElement').mockImplementation((tag: string) => {
        if (tag === 'a') {
          createdAnchor = originalCreateElement('a');
          vi.spyOn(createdAnchor, 'click').mockImplementation(() => {});
          return createdAnchor;
        }
        return originalCreateElement(tag);
      });

      render(<DetailsSection selectedMessage={mockMessage} />);

      const exportButton = screen.getByText('Export JSON');
      fireEvent.click(exportButton);

      await waitFor(() => {
        expect(createdAnchor).not.toBeNull();
        expect(createdAnchor?.download).toBe('fix-message-msg123.json');
        expect(toast.success).toHaveBeenCalledWith('JSON exported');
      });

      createElementSpy.mockRestore();
      createObjectURLSpy.mockRestore();
      revokeObjectURLSpy.mockRestore();
    });
  });

  describe('Message Type Formatting', () => {
    it('should format NewOrder message type', () => {
      const message = { ...mockMessage };
      message.summary.msgType = 'D';
      render(<DetailsSection selectedMessage={message} />);

      expect(screen.getByText('NewOrder')).toBeInTheDocument();
    });

    it('should format ExecReport message type', () => {
      const message = { ...mockMessage };
      message.summary.msgType = '8';
      render(<DetailsSection selectedMessage={message} />);

      expect(screen.getByText('ExecReport')).toBeInTheDocument();
    });

    it('should format CancelReq message type', () => {
      const message = { ...mockMessage };
      message.summary.msgType = 'F';
      render(<DetailsSection selectedMessage={message} />);

      expect(screen.getByText('CancelReq')).toBeInTheDocument();
    });
  });

  describe('Order Status Formatting', () => {
    it('should format New status', () => {
      const message = { ...mockMessage };
      message.summary.ordStatus = '0';
      render(<DetailsSection selectedMessage={message} />);

      expect(screen.getByText('New')).toBeInTheDocument();
    });

    it('should format Partial status', () => {
      const message = { ...mockMessage };
      message.summary.ordStatus = '1';
      render(<DetailsSection selectedMessage={message} />);

      expect(screen.getByText('Partial')).toBeInTheDocument();
    });

    it('should format Filled status', () => {
      const message = { ...mockMessage };
      message.summary.ordStatus = '2';
      render(<DetailsSection selectedMessage={message} />);

      expect(screen.getByText('Filled')).toBeInTheDocument();
    });

    it('should format Canceled status', () => {
      const message = { ...mockMessage };
      message.summary.ordStatus = '4';
      render(<DetailsSection selectedMessage={message} />);

      expect(screen.getByText('Canceled')).toBeInTheDocument();
    });
  });

  describe('Summary Header Conditionals', () => {
    it('should hide order status badge when not present', () => {
      const message = { ...mockMessage };
      message.summary.ordStatus = undefined;
      render(<DetailsSection selectedMessage={message} />);

      // Should not display status badges like 'New', 'Filled', etc.
      expect(screen.queryByText('New')).not.toBeInTheDocument();
      expect(screen.queryByText('Filled')).not.toBeInTheDocument();
      expect(screen.queryByText('Partial')).not.toBeInTheDocument();
    });

    it('should hide symbol when not present', () => {
      const message = {
        ...mockMessage,
        fields: mockMessage.fields.filter((f) => f.tag !== '55'), // Remove Symbol field
        summary: {
          ...mockMessage.summary,
          symbol: undefined,
        },
      };
      const { container } = render(<DetailsSection selectedMessage={message} />);

      // Check summary header doesn't have symbol-specific span (class="font-semibold text-sm" and not a badge)
      const summaryHeader = container.querySelector('.bg-muted\\/50');
      const symbolSpan = summaryHeader?.querySelector('span.font-semibold.text-sm');
      expect(symbolSpan).not.toBeInTheDocument();
    });

    it('should hide ClOrdID when not present', () => {
      const message = { ...mockMessage };
      message.summary.clOrdId = undefined;
      render(<DetailsSection selectedMessage={message} />);

      expect(screen.queryByText(/ClOrdID:/i)).not.toBeInTheDocument();
    });

    it('should hide OrderID when not present', () => {
      const message = { ...mockMessage };
      message.summary.orderId = undefined;
      render(<DetailsSection selectedMessage={message} />);

      expect(screen.queryByText(/OrderID:/i)).not.toBeInTheDocument();
    });
  });

  describe('Table Structure', () => {
    it('should display table headers', () => {
      render(<DetailsSection selectedMessage={mockMessage} />);

      expect(screen.getByText('Tag')).toBeInTheDocument();
      expect(screen.getByText('Name')).toBeInTheDocument();
      expect(screen.getByText('Value')).toBeInTheDocument();
    });

    it('should have clickable tag and name headers', () => {
      render(<DetailsSection selectedMessage={mockMessage} />);

      const tagHeader = screen.getByText('Tag').closest('th');
      const nameHeader = screen.getByText('Name').closest('th');

      expect(tagHeader?.className).toContain('cursor-pointer');
      expect(nameHeader?.className).toContain('cursor-pointer');
    });

    it('should display all rows for all fields', () => {
      render(<DetailsSection selectedMessage={mockMessage} />);

      const rows = screen.getAllByRole('row');
      // 1 header row + 6 data rows
      expect(rows.length).toBe(7);
    });
  });

  describe('No Message Actions', () => {
    it('should not crash when clicking buttons with null message', () => {
      render(<DetailsSection selectedMessage={null} />);

      // Should not have action buttons in empty state
      expect(screen.queryByText('Copy JSON')).not.toBeInTheDocument();
      expect(screen.queryByText('Export JSON')).not.toBeInTheDocument();
      expect(screen.queryByText('Copy Raw')).not.toBeInTheDocument();
    });
  });
});
