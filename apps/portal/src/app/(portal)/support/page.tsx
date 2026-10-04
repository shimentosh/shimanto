import type { Metadata } from 'next';
import { Suspense } from 'react';
import { SupportView } from './view';

export const metadata: Metadata = { title: 'Support' };

export default function Page() {
  return (
    <Suspense>
      <SupportView />
    </Suspense>
  );
}
