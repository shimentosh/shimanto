import type { Metadata } from 'next';
import { Suspense } from 'react';
import { AdminLogin } from './form';

export const metadata: Metadata = { title: 'Sign in' };

export default function LoginPage() {
  return (
    <Suspense>
      <AdminLogin />
    </Suspense>
  );
}
