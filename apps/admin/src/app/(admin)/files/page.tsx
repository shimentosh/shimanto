import type { Metadata } from 'next';
import { Suspense } from 'react';
import { FilesView } from './view';

export const metadata: Metadata = { title: 'Files' };

export default function Page() {
  return (
    <Suspense>
      <FilesView />
    </Suspense>
  );
}
