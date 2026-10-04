import type { Metadata } from 'next';
import { Suspense } from 'react';
import { NewTicketView } from './view';

export const metadata: Metadata = { title: 'New ticket' };

export default function Page() {
  return (
    <Suspense>
      <NewTicketView />
    </Suspense>
  );
}
