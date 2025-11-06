'use client';

import { useState } from 'react';
import { Header } from '@/components/header';
import { IngestSection } from '@/components/sections/ingest';
import { OrdersSection } from '@/components/sections/orders';
import { MessagesSection } from '@/components/sections/messages';
import { DetailsSection } from '@/components/sections/details';
import type { FixMessage } from '@/lib/types';

export default function Home() {
  const [selectedMessage, setSelectedMessage] = useState<FixMessage | null>(null);
  const [selectedOrderKey, setSelectedOrderKey] = useState<string | null>(null);

  const handleMessageClick = (message: FixMessage | null) => {
    setSelectedMessage(message);
  };

  const handleClearFilter = () => {
    setSelectedOrderKey(null);
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 overflow-hidden">
        <div className="h-full grid grid-cols-12 gap-4 p-4">
          {/* Left Column - ClOrdID Groups */}
          <div className="col-span-3 overflow-auto">
            <OrdersSection
              onOrderClick={setSelectedOrderKey}
              selectedOrderKey={selectedOrderKey}
            />
          </div>

          {/* Middle Column - Parser Input + Messages */}
          <div className="col-span-5 overflow-auto space-y-4">
            <IngestSection onMessageClick={setSelectedMessage} />
            <MessagesSection
              onMessageClick={handleMessageClick}
              onClearFilter={handleClearFilter}
              selectedOrderKey={selectedOrderKey}
            />
          </div>

          {/* Right Column - Details */}
          <div className="col-span-4 overflow-auto">
            <DetailsSection selectedMessage={selectedMessage} />
          </div>
        </div>
      </main>
    </div>
  );
}
