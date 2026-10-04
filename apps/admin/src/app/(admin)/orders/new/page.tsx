import type { Metadata } from 'next';
import { Suspense } from 'react';
import { NewOrderView } from './view';

export const metadata: Metadata = { title: 'New order' };

export default function Page() {
  return (
    <Suspense>
      <NewOrderView />
    </Suspense>
  );
}
