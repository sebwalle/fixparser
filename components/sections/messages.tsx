'use client';

import { useState, useEffect, useCallback } from 'react';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from 'sonner';
import type { FixMessage } from '@/lib/types';

interface MessagesSectionProps {
  onMessageClick?: (message: FixMessage) => void;
  onClearFilter?: () => void;
  selectedOrderKey?: string | null;
}

export function MessagesSection({ onMessageClick, onClearFilter, selectedOrderKey }: MessagesSectionProps) {
  const [messages, setMessages] = useState<FixMessage[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch messages from API
  const fetchMessages = useCallback(async () => {
    try {
      setIsLoading(true);
      const params = new URLSearchParams();
      params.set('limit', '100');
      if (selectedOrderKey) {
        params.set('orderKey', selectedOrderKey);
      }

      const response = await fetch(`/api/messages?${params.toString()}`);
      if (!response.ok) {
        throw new Error('Failed to fetch messages');
      }

      const result = await response.json();
      setMessages(result.data);
    } catch (error) {
      toast.error('Failed to load messages');
    } finally {
      setIsLoading(false);
    }
  }, [selectedOrderKey]);

  // Initial fetch and refetch when selectedOrderKey changes
  useEffect(() => {
    fetchMessages();

    // Poll for updates every 5 seconds
    const interval = setInterval(() => fetchMessages(), 5000);
    return () => clearInterval(interval);
  }, [fetchMessages]);

  const handleMessageClick = (message: FixMessage) => {
    onMessageClick?.(message);
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

  const extractSession = (message: FixMessage): { from: string; to: string } | null => {
    return {
      from: 'MAP_BLP_PROD',
      to: 'MAP_CARL_PROD'
    };
  };

  return (
    <div className="bg-card rounded-lg border">
      <div className="p-4 border-b flex items-center justify-between">
        <input
          type="text"
          placeholder="Search messages..."
          className="flex-1 bg-muted/30 border-0 outline-none px-3 py-2 rounded-md text-sm"
        />
      </div>

      {isLoading && messages.length === 0 ? (
        <div className="flex items-center justify-center py-8">
          <p className="text-sm text-muted-foreground">Loading messages...</p>
        </div>
      ) : messages.length === 0 ? (
        <div className="flex items-center justify-center py-8 px-4">
          <p className="text-sm text-muted-foreground text-center">
            {selectedOrderKey
              ? 'No messages found for this order.'
              : 'No messages yet. Submit messages to see them here.'}
          </p>
        </div>
      ) : (
        <ScrollArea className="h-[calc(100vh-28rem)]">
          <div className="p-2 space-y-2">
            {messages.map((message) => {
              const session = extractSession(message);
              const summary = message.summary;

              return (
                <div
                  key={message.id}
                  className="p-3 rounded-md bg-cyan-500/10 border border-cyan-500/20 cursor-pointer hover:bg-cyan-500/20 transition-all"
                  onClick={() => handleMessageClick(message)}
                >
                  {/* Header */}
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Badge variant="default" className="text-xs bg-cyan-500">
                        8
                      </Badge>
                      <span className="text-xs font-semibold">{formatMsgType(summary.msgType)}</span>
                      <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="12" cy="12" r="10"/>
                        <polyline points="12 6 12 12 16 14"/>
                      </svg>
                    </div>
                    <Badge variant="outline" className="text-xs">
                      {message.receivedAt ? new Date(message.receivedAt).toLocaleTimeString() : '-'}
                    </Badge>
                  </div>

                  {/* Session Flow */}
                  {session && (
                    <div className="flex items-center gap-2 mb-2 text-xs">
                      <span className="text-cyan-400 font-mono">{session.from}</span>
                      <span className="text-muted-foreground">→</span>
                      <span className="text-cyan-400 font-mono">{session.to}</span>
                    </div>
                  )}

                  {/* Details */}
                  <div className="flex items-center gap-4 text-xs">
                    <div className="flex items-center gap-1">
                      <span className="text-muted-foreground">Seq:</span>
                      <span className="font-mono">{summary.transType || 'N/A'}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="text-muted-foreground">FIX</span>
                      <span className="font-mono">4.4</span>
                    </div>
                  </div>

                  {/* Status Badges */}
                  <div className="flex flex-wrap gap-1 mt-2">
                    <Badge variant="secondary" className="text-xs">
                      {formatStatus(summary.ordStatus)}
                    </Badge>
                    <Badge variant="secondary" className="text-xs">
                      Trade
                    </Badge>
                  </div>
                </div>
              );
            })}
          </div>
        </ScrollArea>
      )}
    </div>
  );
}
