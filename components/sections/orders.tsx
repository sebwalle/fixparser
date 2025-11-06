'use client';

import { useState, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from 'sonner';
import type { OrderRow } from '@/lib/types';

interface OrdersSectionProps {
  onOrderClick?: (orderKey: string) => void;
  selectedOrderKey?: string | null;
}

export function OrdersSection({ onOrderClick, selectedOrderKey }: OrdersSectionProps) {
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch orders from API
  useEffect(() => {
    const fetchOrders = async () => {
      try {
        const response = await fetch('/api/orders');
        if (!response.ok) {
          throw new Error('Failed to fetch orders');
        }
        const result = await response.json();
        setOrders(result.data || []);
      } catch (error) {
        toast.error('Failed to load orders');
      } finally {
        setIsLoading(false);
      }
    };

    fetchOrders();

    // Poll for updates every 5 seconds
    const interval = setInterval(fetchOrders, 5000);

    return () => clearInterval(interval);
  }, []);

  const handleOrderClick = (orderKey: string) => {
    onOrderClick?.(orderKey);
  };

  const formatSide = (side: string): string => {
    return side === '1' ? 'BUY' : side === '2' ? 'SELL' : side;
  };

  const formatStatus = (status: string): string => {
    const statusMap: Record<string, string> = {
      '0': 'New',
      '1': 'Partial',
      '2': 'Filled',
      '4': 'Canceled',
      '8': 'Rejected',
    };
    return statusMap[status] || status;
  };

  const extractSession = (orderKey: string): { from: string; to: string } | null => {
    // Extract session from orderKey format like "3-2-89880066ZT-0-0"
    const parts = orderKey.split('-');
    if (parts.length >= 3) {
      // Simplified - you may need to adjust based on actual format
      return {
        from: 'MAP_BLP_PROD',
        to: 'MAP_CARL_PROD'
      };
    }
    return null;
  };

  return (
    <div className="h-full bg-card rounded-lg border">
      <div className="p-4 border-b">
        <h2 className="text-lg font-semibold">ClOrdID Groups</h2>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-8">
          <p className="text-sm text-muted-foreground">Loading...</p>
        </div>
      ) : orders.length === 0 ? (
        <div className="flex items-center justify-center py-8 px-4">
          <p className="text-sm text-muted-foreground text-center">
            No orders yet. Submit messages to see orders here.
          </p>
        </div>
      ) : (
        <ScrollArea className="h-[calc(100vh-10rem)]">
          <div className="p-2 space-y-2">
            {orders.map((order) => {
              const session = extractSession(order.orderKey);
              const isSelected = selectedOrderKey === order.orderKey;

              return (
                <div
                  key={order.orderKey}
                  className={`p-3 rounded-md border cursor-pointer transition-all ${
                    isSelected
                      ? 'bg-cyan-500/20 border-cyan-500'
                      : 'hover:bg-muted/50 border-transparent'
                  }`}
                  onClick={() => handleOrderClick(order.orderKey)}
                >
                  {/* Header */}
                  <div className="flex items-center justify-between mb-2">
                    <div className="font-mono text-sm font-semibold truncate">
                      {order.orderKey}
                    </div>
                    <Badge variant="secondary" className="shrink-0 text-xs">
                      {order.messageCount}
                    </Badge>
                  </div>

                  {/* Session Flow */}
                  {session && (
                    <div className="flex items-center gap-2 mb-2 text-xs">
                      <Badge variant="outline" className="px-2 py-0 text-xs">
                        {session.from}
                      </Badge>
                      <span className="text-muted-foreground">→</span>
                      <Badge variant="outline" className="px-2 py-0 text-xs">
                        {session.to}
                      </Badge>
                    </div>
                  )}

                  {/* Status Badges */}
                  <div className="flex flex-wrap gap-1">
                    <Badge variant="default" className="text-xs">
                      ExecutionReport
                    </Badge>
                    <Badge variant="secondary" className="text-xs">
                      {formatStatus(order.latestStatus)}
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
