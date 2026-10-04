import type { Metadata } from 'next';
import { Suspense } from 'react';
import { GithubView } from './view';

export const metadata: Metadata = { title: 'GitHub' };

export default function Page() {
  return (
    <Suspense>
      <GithubView />
    </Suspense>
  );
}
