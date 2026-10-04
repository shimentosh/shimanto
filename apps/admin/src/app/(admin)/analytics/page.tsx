import type { Metadata } from 'next';
import { Suspense } from 'react';
import { AnalyticsView } from './view';

export const metadata: Metadata = { title: 'Analytics' };

export default function Page() {
  return (
    <Suspense>
      <AnalyticsView />
    </Suspense>
  );
}
