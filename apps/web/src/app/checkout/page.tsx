import { Container } from '@shimanto/ui';
import type { Metadata } from 'next';
import { Suspense } from 'react';
import { Checkout } from '@/components/store/checkout';

export const metadata: Metadata = {
  title: 'Checkout',
  robots: { index: false, follow: false },
};

/**
 * Checkout runs in the browser so the customer's session cookie (if signed in) reaches the API.
 * Prices are always computed by the API from the product slugs.
 */
export default function CheckoutPage() {
  return (
    <main id="main" className="pt-28 pb-24 md:pt-36">
      <Container>
        <Suspense>
          <Checkout />
        </Suspense>
      </Container>
    </main>
  );
}
