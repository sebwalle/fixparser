/**
 * Tests for Ingest section component
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { IngestSection } from '@/components/sections/ingest';
import { getAllSamples } from '@/lib/fix/samples';

// Mock sonner toast
vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
  },
}));

// Mock EventSource
class MockEventSource {
  onmessage: ((event: MessageEvent) => void) | null = null;
  onerror: ((event: Event) => void) | null = null;
  close = vi.fn();

  constructor(public url: string) {}
}

global.EventSource = MockEventSource as any;

describe('IngestSection', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render the ingest section with all key elements', () => {
    render(<IngestSection />);

    expect(screen.getByText('1. Ingest Messages')).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/Paste FIX message here/i)).toBeInTheDocument();
    expect(screen.getByText('Strict Parse & Store')).toBeInTheDocument();
    expect(screen.getByText('Relaxed Parse (Test Only)')).toBeInTheDocument();
    expect(screen.getByText('Use Sample')).toBeInTheDocument();
    expect(screen.getByText('Live Message Feed')).toBeInTheDocument();
  });

  it('should have Use Sample button that works with samples', () => {
    render(<IngestSection />);

    const samples = getAllSamples();
    expect(samples.length).toBeGreaterThan(0);

    // Use Sample button should be present
    const useSampleButton = screen.getByText('Use Sample');
    expect(useSampleButton).toBeInTheDocument();
  });

  it('should clear input when clear button is clicked', () => {
    render(<IngestSection />);

    const textarea = screen.getByPlaceholderText(/Paste FIX message here/i) as HTMLTextAreaElement;

    // Type some text
    fireEvent.change(textarea, { target: { value: 'test message' } });
    expect(textarea.value).toBe('test message');

    // Click clear
    const clearButton = screen.getByText('Clear');
    fireEvent.click(clearButton);

    // Should be empty
    expect(textarea.value).toBe('');
  });

  it('should update textarea value when typing', () => {
    render(<IngestSection />);

    const textarea = screen.getByPlaceholderText(/Paste FIX message here/i) as HTMLTextAreaElement;
    const testInput = '8=FIX.4.4|9=100|35=D|';

    fireEvent.change(textarea, { target: { value: testInput } });

    expect(textarea.value).toBe(testInput);
  });

  it('should show empty state in message feed initially', () => {
    render(<IngestSection />);

    expect(screen.getByText(/No messages yet/i)).toBeInTheDocument();
  });

  it('should display message count badge', () => {
    render(<IngestSection />);

    const badge = screen.getByText('0 messages');
    expect(badge).toBeInTheDocument();
  });
});
