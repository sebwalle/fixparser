'use client';

import { useState } from 'react';
import { Header } from '@/components/header';
import { Hero } from '@/components/hero';
import { IngestSection } from '@/components/sections/ingest';
import type { StoredMessage } from '@/lib/types';

export default function Home() {
  const [selectedMessage, setSelectedMessage] = useState<StoredMessage | null>(null);

  return (
    <div className="min-h-screen">
      <Header />
      <Hero />
      <main>
        <IngestSection onMessageClick={setSelectedMessage} />
        {/* Phase 6-8: Orders, Messages, and Details sections will be added here */}
      </main>
    </div>
  );
}
