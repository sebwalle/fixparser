'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import type { StoredMessage } from '@/lib/types';

interface MessagesSectionProps {
  onMessageClick?: (message: StoredMessage) => void;
  selectedOrderKey?: string | null;
}

export function MessagesSection({ onMessageClick, selectedOrderKey }: MessagesSectionProps) {
  const [messages, setMessages] = useState<StoredMessage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [nextCursor, setNextCursor] = useState<string | undefined>(undefined);
  const [prevCursors, setPrevCursors] = useState<string[]>([]);
  const [hasMore, setHasMore] = useState(false);

  // Fetch messages from API
  const fetchMessages = useCallback(async (cursor?: string, direction: 'next' | 'prev' = 'next') => {
    try {
      setIsLoading(true);
      const params = new URLSearchParams();
      params.set('limit', '50');
      if (cursor) {
        params.set('cursor', cursor);
      }
      if (selectedOrderKey) {
        params.set('orderKey', selectedOrderKey);
      }

      const response = await fetch(`/api/messages?${params.toString()}`);
      if (!response.ok) {
        throw new Error('Failed to fetch messages');
      }

      const result = await response.json();
      const fetchedMessages = result.data.map((msg: any) => ({
        ...msg,
        receivedAt: new Date(msg.receivedAt),
      }));

      setMessages(fetchedMessages);
      setNextCursor(result.meta.nextCursor);
      setHasMore(!!result.meta.nextCursor);
    } catch (error) {
      toast.error('Failed to load messages');
    } finally {
      setIsLoading(false);
    }
  }, [selectedOrderKey]);

  // Initial fetch and refetch when selectedOrderKey changes
  useEffect(() => {
    setPrevCursors([]);
    setNextCursor(undefined);
    fetchMessages();

    // Poll for updates every 5 seconds (only if not filtering)
    if (!selectedOrderKey) {
      const interval = setInterval(() => fetchMessages(), 5000);
      return () => clearInterval(interval);
    }
  }, [selectedOrderKey, fetchMessages]);

  const handleNext = () => {
    if (nextCursor) {
      setPrevCursors((prev) => [...prev, nextCursor]);
      fetchMessages(nextCursor, 'next');
    }
  };

  const handlePrev = () => {
    if (prevCursors.length > 0) {
      const newPrevCursors = [...prevCursors];
      const prevCursor = newPrevCursors.pop();
      setPrevCursors(newPrevCursors);
      fetchMessages(prevCursor, 'prev');
    }
  };

  const handleMessageClick = (message: StoredMessage) => {
    onMessageClick?.(message);

    // Scroll to Details section
    const detailsSection = document.querySelector('[data-section="details"]');
    if (detailsSection) {
      detailsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const formatMsgType = (msgType?: string): string => {
    const msgTypeMap: Record<string, string> = {
      'D': 'NewOrder',
      '8': 'ExecReport',
      'F': 'CancelReq',
      '9': 'CancelRej',
      'G': 'ReplaceReq',
    };
    return msgType ? msgTypeMap[msgType] || msgType : 'N/A';
  };

  const formatSide = (side?: string): string => {
    return side === '1' ? 'BUY' : side === '2' ? 'SELL' : side || 'N/A';
  };

  const formatStatus = (status?: string): string => {
    const statusMap: Record<string, string> = {
      '0': 'New',
      '1': 'Partial',
      '2': 'Filled',
      '4': 'Canceled',
      '8': 'Rejected',
    };
    return status ? statusMap[status] || status : 'N/A';
  };

  const clearFilter = () => {
    // Parent component should handle this by setting selectedOrderKey to null
    // This is just for UI - we'll emit a special click that parent can handle
    onMessageClick?.(null as any);
  };

  return (
    <section className="w-full py-8" data-section="messages">
      <div className="container">
        <Card>
          <CardHeader>
            <div className="flex items-start justify-between">
              <div>
                <CardTitle>3. Messages</CardTitle>
                <CardDescription>
                  All FIX messages in chronological order. Click a message to see details.
                </CardDescription>
              </div>
              {selectedOrderKey && (
                <Badge variant="secondary" className="font-mono">
                  Filtered by: {selectedOrderKey}
                  <button
                    onClick={clearFilter}
                    className="ml-2 hover:text-destructive"
                    aria-label="Clear filter"
                  >
                    ×
                  </button>
                </Badge>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {isLoading && messages.length === 0 ? (
              <div className="flex items-center justify-center py-8">
                <p className="text-sm text-muted-foreground">Loading messages...</p>
              </div>
            ) : messages.length === 0 ? (
              <div className="flex items-center justify-center py-8">
                <p className="text-sm text-muted-foreground">
                  {selectedOrderKey
                    ? 'No messages found for this order.'
                    : 'No messages yet. Submit messages to see them here.'}
                </p>
              </div>
            ) : (
              <>
                <ScrollArea className="h-[500px]">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="border-b">
                        <tr>
                          <th className="text-left p-2 font-medium">Received At</th>
                          <th className="text-left p-2 font-medium">MsgType</th>
                          <th className="text-left p-2 font-medium">TransType</th>
                          <th className="text-left p-2 font-medium">OrdStatus</th>
                          <th className="text-left p-2 font-medium">ClOrdID</th>
                          <th className="text-left p-2 font-medium">OrderID</th>
                          <th className="text-left p-2 font-medium">Symbol</th>
                          <th className="text-left p-2 font-medium">Side</th>
                          <th className="text-left p-2 font-medium">Qty</th>
                          <th className="text-left p-2 font-medium">Price</th>
                        </tr>
                      </thead>
                      <tbody>
                        {messages.map((message) => (
                          <tr
                            key={message.id}
                            className="border-b cursor-pointer hover:bg-accent transition-colors"
                            onClick={() => handleMessageClick(message)}
                          >
                            <td className="p-2 text-xs text-muted-foreground whitespace-nowrap">
                              {message.receivedAt.toLocaleString()}
                            </td>
                            <td className="p-2">
                              <Badge variant="outline" className="text-xs">
                                {formatMsgType(message.parsed.summary.msgType)}
                              </Badge>
                            </td>
                            <td className="p-2 font-mono text-xs">
                              {message.parsed.summary.transType || '-'}
                            </td>
                            <td className="p-2">
                              {message.parsed.summary.ordStatus ? (
                                <Badge variant="secondary" className="text-xs">
                                  {formatStatus(message.parsed.summary.ordStatus)}
                                </Badge>
                              ) : (
                                '-'
                              )}
                            </td>
                            <td className="p-2 font-mono text-xs">
                              {message.parsed.summary.clOrdId || '-'}
                            </td>
                            <td className="p-2 font-mono text-xs">
                              {message.parsed.summary.orderId || '-'}
                            </td>
                            <td className="p-2 font-semibold">
                              {message.parsed.summary.symbol || '-'}
                            </td>
                            <td className="p-2">{formatSide(message.parsed.summary.side)}</td>
                            <td className="p-2 text-right">
                              {message.parsed.summary.qty || '-'}
                            </td>
                            <td className="p-2 text-right">
                              {message.parsed.summary.price || '-'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </ScrollArea>

                {/* Pagination controls */}
                <div className="flex items-center justify-between mt-4 pt-4 border-t">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handlePrev}
                    disabled={prevCursors.length === 0}
                  >
                    Previous
                  </Button>
                  <span className="text-sm text-muted-foreground">
                    {messages.length} messages
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleNext}
                    disabled={!hasMore}
                  >
                    Next
                  </Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </section>
  );
}
