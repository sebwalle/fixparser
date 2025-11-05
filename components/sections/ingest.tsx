'use client';

import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { getAllSamples } from '@/lib/fix/samples';
import { toast } from 'sonner';
import type { StoredMessage } from '@/lib/types';

interface IngestSectionProps {
  onMessageClick?: (message: StoredMessage) => void;
}

export function IngestSection({ onMessageClick }: IngestSectionProps) {
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<StoredMessage[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedSample, setSelectedSample] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const samples = getAllSamples();

  // SSE subscription for live message feed
  useEffect(() => {
    const eventSource = new EventSource('/api/messages/stream');

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);

        // Skip connection messages
        if (data.type === 'connected') {
          return;
        }

        // Convert FixMessage to StoredMessage format
        const message: StoredMessage = {
          id: data.id,
          receivedAt: new Date(data.receivedAt || Date.now()),
          parsed: {
            fields: data.fields,
            summary: data.summary,
            warnings: data.warnings || [],
            orderKey: data.summary?.orderKey,
            raw: data.rawMessage || '',
          },
        };

        setMessages((prev) => [message, ...prev].slice(0, 50)); // Keep last 50
        toast.success('New message received');
      } catch (error) {
        // Skip invalid SSE messages
      }
    };

    eventSource.onerror = () => {
      eventSource.close();
      // Fallback to polling could be implemented here
      toast.error('Live feed disconnected');
    };

    return () => {
      eventSource.close();
    };
  }, []);

  const handleSubmit = async (mode: 'strict' | 'relaxed') => {
    if (!input.trim()) {
      toast.error('Please enter a FIX message');
      return;
    }

    setIsSubmitting(true);
    try {
      const endpoint = mode === 'strict' ? '/api/messages/ingest' : '/api/fix/parse';
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'text/plain',
        },
        body: input,
      });

      const data = await response.json();

      if (!response.ok) {
        if (data.issues) {
          // Show parse errors with suggestions
          const issueText = data.issues.map((i: any) => i.message).join(', ');
          toast.error(`Parse failed: ${issueText}`);
          if (data.suggestions) {
            toast.info(`${data.suggestions.length} repair suggestion(s) available`);
          }
        } else {
          toast.error(data.error || 'Failed to parse message');
        }
      } else {
        toast.success(`Message parsed successfully (${mode} mode)`);
        if (mode === 'strict') {
          // Message was stored, will appear via SSE
          setInput('');
        }
      }
    } catch (error) {
      toast.error('Failed to submit message');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      setInput(text);
      toast.success('File loaded');
    } catch (error) {
      toast.error('Failed to read file');
    }

    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleUseSample = () => {
    if (!selectedSample) {
      toast.error('Please select a sample message');
      return;
    }

    const sample = samples.find(s => s.name === selectedSample);
    if (sample) {
      // Convert SOH to pipe for readability
      const readable = sample.message.replace(/\x01/g, '|');
      setInput(readable);
      toast.success(`Loaded: ${sample.name}`);
    }
  };

  const handleClear = () => {
    setInput('');
    setSelectedSample('');
    toast.info('Input cleared');
  };

  const formatMessagePreview = (msg: StoredMessage): string => {
    const parts = [];
    const summary = msg.parsed.summary;
    if (summary.msgType) parts.push(`${summary.msgType}`);
    if (summary.clOrdId) parts.push(`#${summary.clOrdId}`);
    if (summary.symbol) parts.push(summary.symbol);
    if (summary.side) parts.push(summary.side === '1' ? 'BUY' : 'SELL');
    if (summary.qty) parts.push(`Qty:${summary.qty}`);
    return parts.join(' | ');
  };

  return (
    <section className="w-full py-8">
      <div className="container">
        <Card>
          <CardHeader>
            <CardTitle>1. Ingest Messages</CardTitle>
            <CardDescription>
              Paste FIX messages, upload a file, or use sample messages
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Input Area */}
            <div className="space-y-2">
              <Textarea
                placeholder="Paste FIX message here (use | or ^ as delimiters for readability)..."
                value={input}
                onChange={(e) => setInput(e.target.value)}
                className="min-h-[150px] font-mono text-sm"
              />
            </div>

            {/* Sample Selection */}
            <div className="flex gap-2 items-center">
              <Select value={selectedSample} onValueChange={setSelectedSample}>
                <SelectTrigger className="flex-1">
                  <SelectValue placeholder="Select a sample message..." />
                </SelectTrigger>
                <SelectContent>
                  {samples.map((sample) => (
                    <SelectItem key={sample.name} value={sample.name}>
                      {sample.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button onClick={handleUseSample} variant="outline">
                Use Sample
              </Button>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-wrap gap-2">
              <Button
                onClick={() => handleSubmit('strict')}
                disabled={isSubmitting}
              >
                Strict Parse & Store
              </Button>
              <Button
                onClick={() => handleSubmit('relaxed')}
                disabled={isSubmitting}
                variant="secondary"
              >
                Relaxed Parse (Test Only)
              </Button>
              <Button
                onClick={() => fileInputRef.current?.click()}
                variant="outline"
              >
                Upload File
              </Button>
              <Button onClick={handleClear} variant="ghost">
                Clear
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".txt,.fix"
                onChange={handleFileUpload}
                className="hidden"
              />
            </div>

            {/* Live Message Feed */}
            <div className="space-y-2 pt-4 border-t">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold">Live Message Feed</h3>
                <Badge variant="outline">{messages.length} messages</Badge>
              </div>
              <ScrollArea className="h-[200px] rounded-md border">
                <div className="p-4 space-y-2">
                  {messages.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-8">
                      No messages yet. Submit a message to see it appear here.
                    </p>
                  ) : (
                    messages.map((msg) => (
                      <div
                        key={msg.id}
                        className="flex items-center justify-between p-2 rounded-md border cursor-pointer hover:bg-accent transition-colors"
                        onClick={() => onMessageClick?.(msg)}
                      >
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          <Badge variant="secondary" className="shrink-0">
                            {msg.parsed.summary.msgType || 'Unknown'}
                          </Badge>
                          <span className="text-sm truncate">
                            {formatMessagePreview(msg)}
                          </span>
                        </div>
                        <span className="text-xs text-muted-foreground shrink-0">
                          {new Date(msg.receivedAt).toLocaleTimeString()}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </ScrollArea>
            </div>
          </CardContent>
        </Card>
      </div>
    </section>
  );
}
