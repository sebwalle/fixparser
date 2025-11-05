'use client';

import { useState } from 'react';
import { Header } from '@/components/header';
import { Hero } from '@/components/hero';
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
    <div className="min-h-screen">
      <Header />
      <Hero />
      <main>
        <IngestSection onMessageClick={setSelectedMessage} />
        <OrdersSection
          onOrderClick={setSelectedOrderKey}
          selectedOrderKey={selectedOrderKey}
        />
        <MessagesSection
          onMessageClick={handleMessageClick}
          onClearFilter={handleClearFilter}
          selectedOrderKey={selectedOrderKey}
        />
        <DetailsSection selectedMessage={selectedMessage} />
      </main>
    </div>
  );
}
