import type { Metadata } from 'next';
import { Suspense } from 'react';
import { DownloadsView } from './view';

export const metadata: Metadata = { title: 'Downloads' };

export default function Page() {
  return (
    <Suspense>
      <DownloadsView />
    </Suspense>
  );
}
