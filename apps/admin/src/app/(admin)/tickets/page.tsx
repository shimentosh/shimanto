import type { Metadata } from 'next';
import { Suspense } from 'react';
import { TicketsView } from './view';

export const metadata: Metadata = { title: 'Support tickets' };

export default function Page() {
  return (
    <Suspense>
      <TicketsView />
    </Suspense>
  );
}
