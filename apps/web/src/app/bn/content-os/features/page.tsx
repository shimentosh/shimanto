import { FeaturesRoute, featuresMetadata } from '@/components/content-os/routes';

/** The price comes from the store; the API's revalidation webhook refreshes it on change. */
export const revalidate = 3600;

export function generateMetadata() {
  return featuresMetadata('bn');
}

export default function Page() {
  return <FeaturesRoute lang="bn" />;
}
