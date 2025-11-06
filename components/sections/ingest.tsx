'use client';

import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { getAllSamples } from '@/lib/fix/samples';
import { toast } from 'sonner';
import type { FixMessage } from '@/lib/types';

interface IngestSectionProps {
  onMessageClick?: (message: FixMessage) => void;
}

export function IngestSection({ onMessageClick }: IngestSectionProps) {
  const [input, setInput] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const samples = getAllSamples();

  const handleSubmit = async () => {
    if (!input.trim()) {
      toast.error('Please enter a FIX message');
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch('/api/messages/ingest', {
        method: 'POST',
        headers: {
          'Content-Type': 'text/plain',
        },
        body: input,
      });

      const data = await response.json();

      if (!response.ok) {
        if (data.issues) {
          const issueText = data.issues.map((i: any) => i.message).join(', ');
          toast.error(`Parse failed: ${issueText}`);
          if (data.suggestions) {
            toast.info(`${data.suggestions.length} repair suggestion(s) available`);
          }
        } else {
          toast.error(data.error || 'Failed to parse message');
        }
      } else {
        toast.success('Message parsed successfully');
        setInput('');
      }
    } catch (error) {
      toast.error('Failed to submit message');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleLoadSample = () => {
    if (samples.length > 0) {
      const sample = samples[0];
      const readable = sample.message.replace(/\x01/g, '|');
      setInput(readable);
      toast.success(`Loaded: ${sample.name}`);
    }
  };

  const handleAICleanup = () => {
    toast.info('AI Cleanup feature coming soon');
  };

  const handleClear = () => {
    setInput('');
  };

  return (
    <div className="bg-card rounded-lg border">
      <div className="p-4 space-y-3">
        {/* Action Buttons */}
        <div className="flex gap-2">
          <Button
            onClick={handleLoadSample}
            variant="outline"
            size="sm"
            className="flex-1"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
              <polyline points="14 2 14 8 20 8"/>
            </svg>
            Load Sample
          </Button>
          <Button
            onClick={handleAICleanup}
            variant="outline"
            size="sm"
            className="flex-1"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2">
              <path d="M12 2v4m0 12v4M4.93 4.93l2.83 2.83m8.48 8.48l2.83 2.83M2 12h4m12 0h4M4.93 19.07l2.83-2.83m8.48-8.48l2.83-2.83"/>
            </svg>
            AI Cleanup
          </Button>
          <Button
            onClick={handleClear}
            variant="ghost"
            size="sm"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"/>
              <line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
            Clear
          </Button>
        </div>

        {/* Text Input */}
        <Textarea
          placeholder="Paste FIX message here (use | or ^ as delimiters for readability)..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          className="min-h-[120px] font-mono text-sm resize-none bg-muted/30"
        />

        {/* Parse Button */}
        <Button
          onClick={handleSubmit}
          disabled={isSubmitting}
          className="w-full bg-cyan-500 hover:bg-cyan-600 text-white"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2">
            <polyline points="16 18 22 12 16 6"/>
            <polyline points="8 6 2 12 8 18"/>
          </svg>
          Parse Messages
        </Button>

        {/* Download Icon */}
        <div className="flex justify-end">
          <button className="p-2 hover:bg-muted rounded-md transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
              <polyline points="7 10 12 15 17 10"/>
              <line x1="12" y1="15" x2="12" y2="3"/>
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
