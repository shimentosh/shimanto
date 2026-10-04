import type { Metadata } from 'next';
import { Suspense } from 'react';
import { TicketView } from './view';

export const metadata: Metadata = { title: 'Ticket' };

export default function Page() {
  return (
    <Suspense>
      <TicketView />
    </Suspense>
  );
}
