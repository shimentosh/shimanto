import { ActionButton, EmptyState } from '@shimanto/ui';

export default function NotFound() {
  return (
    <main className="mx-auto max-w-lg px-6 py-24">
      <EmptyState
        spot="magnifier"
        title="Page not found"
        description="This page doesn’t exist, or you don’t have access to it."
        action={<ActionButton href="/">Go to your account</ActionButton>}
      />
    </main>
  );
}
