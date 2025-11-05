'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
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
        const data = await response.json();
        setOrders(data);
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

    // Scroll to Messages section
    const messagesSection = document.querySelector('[data-section="messages"]');
    if (messagesSection) {
      messagesSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
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

  const getStatusColor = (status: string): 'default' | 'secondary' | 'destructive' | 'outline' => {
    const colorMap: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
      '0': 'default',
      '1': 'secondary',
      '2': 'default',
      '4': 'destructive',
      '8': 'destructive',
    };
    return colorMap[status] || 'outline';
  };

  return (
    <section className="w-full py-8">
      <div className="container">
        <Card>
          <CardHeader>
            <CardTitle>2. Orders</CardTitle>
            <CardDescription>
              Aggregated view of orders. Click an order to filter messages.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <p className="text-sm text-muted-foreground">Loading orders...</p>
              </div>
            ) : orders.length === 0 ? (
              <div className="flex items-center justify-center py-8">
                <p className="text-sm text-muted-foreground">
                  No orders yet. Submit messages to see orders appear here.
                </p>
              </div>
            ) : (
              <ScrollArea className="h-[400px]">
                <div className="space-y-2 pr-4">
                  {orders.map((order) => (
                    <div
                      key={order.orderKey}
                      className={`p-4 rounded-lg border cursor-pointer transition-all ${
                        selectedOrderKey === order.orderKey
                          ? 'bg-accent border-primary shadow-md'
                          : 'hover:bg-accent/50'
                      }`}
                      onClick={() => handleOrderClick(order.orderKey)}
                    >
                      {/* Header Row */}
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="font-mono text-xs">
                            {order.orderKey}
                          </Badge>
                          {order.orderId && (
                            <Badge variant="secondary" className="font-mono text-xs">
                              ID: {order.orderId}
                            </Badge>
                          )}
                        </div>
                        <Badge variant={getStatusColor(order.latestStatus)}>
                          {formatStatus(order.latestStatus)}
                        </Badge>
                      </div>

                      {/* Details Grid */}
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                        <div>
                          <div className="text-xs text-muted-foreground mb-1">Symbol</div>
                          <div className="font-semibold">{order.symbol || 'N/A'}</div>
                        </div>
                        <div>
                          <div className="text-xs text-muted-foreground mb-1">Side</div>
                          <div className="font-semibold">{formatSide(order.side)}</div>
                        </div>
                        <div>
                          <div className="text-xs text-muted-foreground mb-1">Quantity</div>
                          <div className="font-semibold">{order.originalQty || 'N/A'}</div>
                        </div>
                        <div>
                          <div className="text-xs text-muted-foreground mb-1">Messages</div>
                          <div className="font-semibold">{order.messageCount}</div>
                        </div>
                      </div>

                      {/* Timestamps */}
                      <div className="flex items-center gap-4 mt-3 pt-3 border-t text-xs text-muted-foreground">
                        <div>
                          <span className="font-medium">First:</span>{' '}
                          {new Date(order.firstSeenAt).toLocaleString()}
                        </div>
                        <div>
                          <span className="font-medium">Last:</span>{' '}
                          {new Date(order.lastSeenAt).toLocaleString()}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )}
          </CardContent>
        </Card>
      </div>
    </section>
  );
}
