import type { Metadata } from 'next';
import { Suspense } from 'react';
import { SecurityView } from './view';

export const metadata: Metadata = { title: 'Security' };

export default function Page() {
  return (
    <Suspense>
      <SecurityView />
    </Suspense>
  );
}
