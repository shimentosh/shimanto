import { GuidesRoute, guidesMetadata } from '@/components/content-os/routes';

/** The price comes from the store; the API's revalidation webhook refreshes it on change. */
export const revalidate = 3600;

export function generateMetadata() {
  return guidesMetadata('bn');
}

export default function Page() {
  return <GuidesRoute lang="bn" />;
}
