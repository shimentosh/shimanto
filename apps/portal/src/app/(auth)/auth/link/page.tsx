import type { Metadata } from 'next';
import { Suspense } from 'react';
import { LinkSignIn } from './link';

export const metadata: Metadata = { title: 'Signing you in' };

export default function LinkPage() {
  return (
    <Suspense>
      <LinkSignIn />
    </Suspense>
  );
}
