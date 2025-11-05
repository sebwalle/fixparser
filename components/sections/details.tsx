'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { toast } from 'sonner';
import type { FixMessage } from '@/lib/types';
import { getFieldValueDescription } from '@/lib/fix/dictionary';

interface DetailsSectionProps {
  selectedMessage: FixMessage | null;
}

type SortColumn = 'tag' | 'name' | null;
type SortDirection = 'asc' | 'desc';

export function DetailsSection({ selectedMessage }: DetailsSectionProps) {
  const [sortColumn, setSortColumn] = useState<SortColumn>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');

  const handleSort = (column: 'tag' | 'name') => {
    if (sortColumn === column) {
      // Toggle direction
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      // New column - default to ascending
      setSortColumn(column);
      setSortDirection('asc');
    }
  };

  const getSortedFields = () => {
    if (!selectedMessage) return [];

    const fields = [...selectedMessage.fields];

    if (!sortColumn) return fields;

    return fields.sort((a, b) => {
      let compareResult = 0;

      if (sortColumn === 'tag') {
        // Numeric sort for tags
        compareResult = parseInt(a.tag, 10) - parseInt(b.tag, 10);
      } else if (sortColumn === 'name') {
        // Alphabetical sort for names
        compareResult = a.name.localeCompare(b.name);
      }

      return sortDirection === 'asc' ? compareResult : -compareResult;
    });
  };

  const handleCopyJSON = async () => {
    if (!selectedMessage) return;

    try {
      const json = JSON.stringify(selectedMessage, null, 2);
      await navigator.clipboard.writeText(json);
      toast.success('JSON copied to clipboard');
    } catch (error) {
      toast.error('Failed to copy JSON');
    }
  };

  const handleExportJSON = () => {
    if (!selectedMessage) return;

    try {
      const json = JSON.stringify(selectedMessage, null, 2);
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `fix-message-${selectedMessage.id}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success('JSON exported');
    } catch (error) {
      toast.error('Failed to export JSON');
    }
  };

  const handleCopyRaw = async () => {
    if (!selectedMessage) return;

    try {
      await navigator.clipboard.writeText(selectedMessage.rawMessage);
      toast.success('Raw message copied to clipboard');
    } catch (error) {
      toast.error('Failed to copy raw message');
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

  if (!selectedMessage) {
    return (
      <section className="w-full py-8" data-section="details">
        <div className="container">
          <Card>
            <CardHeader>
              <CardTitle>4. Details</CardTitle>
              <CardDescription>
                Select a message to view its full details and fields.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-center py-12">
                <p className="text-sm text-muted-foreground">
                  No message selected. Click a message in the Messages section to view details.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>
    );
  }

  const sortedFields = getSortedFields();
  const summary = selectedMessage.summary;

  return (
    <section className="w-full py-8" data-section="details">
      <div className="container">
        <Card>
          <CardHeader>
            <CardTitle>4. Details</CardTitle>
            <CardDescription>
              Full field breakdown and actions for the selected message.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {/* Compact Summary Header */}
            <div className="flex items-center justify-between mb-4 p-4 border rounded-lg bg-muted/50">
              <div className="flex items-center gap-4">
                <Badge variant="default" className="text-sm">
                  {formatMsgType(summary.msgType)}
                </Badge>
                {summary.ordStatus && (
                  <Badge variant="secondary" className="text-sm">
                    {formatStatus(summary.ordStatus)}
                  </Badge>
                )}
                {summary.symbol && (
                  <span className="font-semibold text-sm">{summary.symbol}</span>
                )}
                {summary.clOrdId && (
                  <span className="font-mono text-xs text-muted-foreground">
                    ClOrdID: {summary.clOrdId}
                  </span>
                )}
                {summary.orderId && (
                  <span className="font-mono text-xs text-muted-foreground">
                    OrderID: {summary.orderId}
                  </span>
                )}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2 mb-4">
              <Button variant="outline" size="sm" onClick={handleCopyJSON}>
                Copy JSON
              </Button>
              <Button variant="outline" size="sm" onClick={handleExportJSON}>
                Export JSON
              </Button>
              <Button variant="outline" size="sm" onClick={handleCopyRaw}>
                Copy Raw
              </Button>
            </div>

            {/* Sortable Table */}
            <ScrollArea className="h-[500px] rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead
                      className="cursor-pointer hover:bg-accent px-2"
                      onClick={() => handleSort('tag')}
                    >
                      <div className="flex items-center gap-1">
                        Tag
                        {sortColumn === 'tag' && (
                          <span className="text-xs">
                            {sortDirection === 'asc' ? '↑' : '↓'}
                          </span>
                        )}
                      </div>
                    </TableHead>
                    <TableHead
                      className="cursor-pointer hover:bg-accent px-2"
                      onClick={() => handleSort('name')}
                    >
                      <div className="flex items-center gap-1">
                        Name
                        {sortColumn === 'name' && (
                          <span className="text-xs">
                            {sortDirection === 'asc' ? '↑' : '↓'}
                          </span>
                        )}
                      </div>
                    </TableHead>
                    <TableHead className="px-2">Value</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortedFields.map((field, index) => {
                    const isEven = index % 2 === 1;
                    return (
                      <TableRow 
                        key={`${field.tag}-${index}`}
                        style={isEven ? { backgroundColor: 'hsl(var(--muted) / 0.5)' } : undefined}
                      >
                        <TableCell className="font-mono text-xs px-2 py-1">{field.tag}</TableCell>
                        <TableCell className="font-medium px-2 py-1">{field.name}</TableCell>
                        <TableCell className="font-mono text-sm px-2 py-1">
                          {getFieldValueDescription(field.tag, field.value)}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </ScrollArea>

            {/* Field count */}
            <div className="mt-4 text-sm text-muted-foreground">
              {sortedFields.length} fields
            </div>
          </CardContent>
        </Card>
      </div>
    </section>
  );
}
