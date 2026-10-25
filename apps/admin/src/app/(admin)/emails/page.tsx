import type { Metadata } from 'next';
import { Suspense } from 'react';
import { EmailsView } from './view';

export const metadata: Metadata = { title: 'Emails' };

export default function Page() {
  return (
    <Suspense>
      <EmailsView />
    </Suspense>
  );
}
