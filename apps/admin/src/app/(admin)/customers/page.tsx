import type { Metadata } from 'next';
import { Suspense } from 'react';
import { CustomersView } from './view';

export const metadata: Metadata = { title: 'Customers' };

export default function Page() {
  return (
    <Suspense>
      <CustomersView />
    </Suspense>
  );
}
