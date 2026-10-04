import type { Metadata } from 'next';
import { Suspense } from 'react';
import { ProductsView } from './view';

export const metadata: Metadata = { title: 'My products' };

export default function Page() {
  return (
    <Suspense>
      <ProductsView />
    </Suspense>
  );
}
