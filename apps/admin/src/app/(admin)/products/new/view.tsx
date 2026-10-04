'use client';

import { PageHeader } from '@shimanto/ui';
import { useRouter } from 'next/navigation';
import { ProductForm } from '@/components/product-form';

export function NewProductView() {
  const router = useRouter();
  return (
    <>
      <PageHeader
        back={{ href: '/products', label: 'Products' }}
        title="New product"
        description="Starts as a draft. Attach its files or repository, then publish."
      />
      <div className="max-w-3xl">
        <ProductForm onSaved={(p) => router.replace(`/products/${p.id}?created=1`)} />
      </div>
    </>
  );
}
