import type { Metadata } from 'next';
import { Suspense } from 'react';
import { EventsView } from './view';

export const metadata: Metadata = { title: 'Analytics events' };

export default function Page() {
  return (
    <Suspense>
      <EventsView />
    </Suspense>
  );
}
