import type { Metadata } from 'next';
import { Suspense } from 'react';
import { NewProductView } from './view';

export const metadata: Metadata = { title: 'New product' };

export default function Page() {
  return (
    <Suspense>
      <NewProductView />
    </Suspense>
  );
}
