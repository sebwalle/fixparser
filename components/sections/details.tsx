'use client';

import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import type { FixMessage } from '@/lib/types';
import { getFieldValueDescription } from '@/lib/fix/dictionary';

interface DetailsSectionProps {
  selectedMessage: FixMessage | null;
}

export function DetailsSection({ selectedMessage }: DetailsSectionProps) {
  const [activeTab, setActiveTab] = useState('overview');

  if (!selectedMessage) {
    return (
      <div className="h-full bg-card rounded-lg border flex items-center justify-center">
        <p className="text-sm text-muted-foreground text-center px-4">
          Select a message to view details
        </p>
      </div>
    );
  }

  const summary = selectedMessage.summary;

  const formatMsgType = (msgType?: string): string => {
    const msgTypeMap: Record<string, string> = {
      'D': 'NewOrder',
      '8': 'ExecutionReport',
      'F': 'CancelReq',
      '9': 'CancelRej',
      'G': 'ReplaceReq',
    };
    return msgType ? msgTypeMap[msgType] || msgType : 'N/A';
  };


  return (
    <div className="h-full bg-card rounded-lg border flex flex-col">
      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
        <TabsList className="grid w-full grid-cols-4 rounded-none border-b">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="fields">Fields</TabsTrigger>
          <TabsTrigger value="raw">Raw</TabsTrigger>
          <TabsTrigger value="validation">Validation</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="flex-1 overflow-auto p-4 space-y-6">
          {/* Message Summary */}
          <div>
            <h3 className="text-sm font-semibold mb-3 text-muted-foreground">Message Summary</h3>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <div className="text-xs text-muted-foreground mb-1">Type:</div>
                <div className="font-semibold">{formatMsgType(summary.msgType)} (8)</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground mb-1">Version:</div>
                <div className="font-mono">FIX.4.4</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground mb-1">Sequence:</div>
                <div className="font-mono">952</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground mb-1">Time:</div>
                <div className="font-mono text-xs">
                  {selectedMessage.receivedAt
                    ? new Date(selectedMessage.receivedAt).toLocaleString()
                    : 'N/A'}
                </div>
              </div>
            </div>
          </div>

          {/* Session */}
          <div>
            <h3 className="text-sm font-semibold mb-3 text-muted-foreground">Session</h3>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="px-3 py-1">MAP_BLP_PROD</Badge>
              <span className="text-muted-foreground">→</span>
              <Badge variant="outline" className="px-3 py-1">MAP_CARL_PROD</Badge>
            </div>
          </div>

          {/* Key Business Fields */}
          <div>
            <h3 className="text-sm font-semibold mb-3 text-muted-foreground">Key Business Fields</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between items-center py-2 border-b">
                <span className="text-muted-foreground">ClOrdID:</span>
                <span className="font-mono">{summary.clOrdId || 'N/A'}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b">
                <span className="text-muted-foreground">OrderID:</span>
                <span className="font-mono">{summary.orderId || 'N/A'}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b">
                <span className="text-muted-foreground">OrderQty:</span>
                <span className="font-mono">{summary.qty || 'N/A'}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b">
                <span className="text-muted-foreground">OrdType:</span>
                <span className="font-mono">1</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b">
                <span className="text-muted-foreground">Side:</span>
                <span className="font-mono">{summary.side === '1' ? 'Buy' : summary.side === '2' ? 'Sell' : 'N/A'}</span>
              </div>
              <div className="flex justify-between items-center py-2">
                <span className="text-muted-foreground">Symbol:</span>
                <span className="font-mono">{summary.symbol || 'N/A'}</span>
              </div>
            </div>
          </div>
        </TabsContent>

        {/* Fields Tab */}
        <TabsContent value="fields" className="flex-1 overflow-auto p-0">
          <ScrollArea className="h-full">
            <div className="p-4">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-card border-b">
                  <tr>
                    <th className="text-left p-2 font-medium text-muted-foreground">Tag</th>
                    <th className="text-left p-2 font-medium text-muted-foreground">Name</th>
                    <th className="text-left p-2 font-medium text-muted-foreground">Value</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedMessage.fields.map((field, index) => (
                    <tr
                      key={`${field.tag}-${index}`}
                      className="border-b hover:bg-muted/50"
                    >
                      <td className="p-2 font-mono text-xs">{field.tag}</td>
                      <td className="p-2 text-xs">{field.name}</td>
                      <td className="p-2 font-mono text-xs">
                        {getFieldValueDescription(field.tag, field.value)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </ScrollArea>
        </TabsContent>

        {/* Raw Tab */}
        <TabsContent value="raw" className="flex-1 overflow-auto p-4">
          <div className="bg-muted/30 rounded-md p-4 font-mono text-xs whitespace-pre-wrap break-all">
            {selectedMessage.rawMessage}
          </div>
        </TabsContent>

        {/* Validation Tab */}
        <TabsContent value="validation" className="flex-1 overflow-auto p-4">
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-green-500">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
                <polyline points="22 4 12 14.01 9 11.01"/>
              </svg>
              <span className="text-sm font-semibold">Message is valid</span>
            </div>
            {selectedMessage.warnings && selectedMessage.warnings.length > 0 ? (
              <div className="space-y-2">
                <h4 className="text-sm font-semibold text-muted-foreground">Warnings:</h4>
                {selectedMessage.warnings.map((warning, index) => (
                  <div key={index} className="p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-md text-sm">
                    {warning}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No validation warnings</p>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
