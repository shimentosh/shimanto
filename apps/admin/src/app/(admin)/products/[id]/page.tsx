import type { Metadata } from 'next';
import { Suspense } from 'react';
import { ProductView } from './view';

export const metadata: Metadata = { title: 'Product' };

export default function Page() {
  return (
    <Suspense>
      <ProductView />
    </Suspense>
  );
}
