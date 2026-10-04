import type { Metadata } from 'next';
import { Suspense } from 'react';
import { OrderView } from './view';

export const metadata: Metadata = { title: 'Order' };

export default function Page() {
  return (
    <Suspense>
      <OrderView />
    </Suspense>
  );
}
