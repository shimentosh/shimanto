import type { Metadata } from 'next';
import { Suspense } from 'react';
import { ProfileView } from './view';

export const metadata: Metadata = { title: 'Profile' };

export default function Page() {
  return (
    <Suspense>
      <ProfileView />
    </Suspense>
  );
}
