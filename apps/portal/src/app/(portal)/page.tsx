import type { Metadata } from 'next';
import { Suspense } from 'react';
import { DashboardView } from './view';

export const metadata: Metadata = { title: 'Overview' };

export default function Page() {
  return (
    <Suspense>
      <DashboardView />
    </Suspense>
  );
}
