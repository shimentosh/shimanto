import type { Metadata } from 'next';
import { Suspense } from 'react';
import { CouponsView } from './view';

export const metadata: Metadata = { title: 'Coupons' };

export default function Page() {
  return (
    <Suspense>
      <CouponsView />
    </Suspense>
  );
}
