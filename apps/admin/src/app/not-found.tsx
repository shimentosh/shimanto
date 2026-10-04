import { ActionButton, EmptyState } from '@shimanto/ui';

export default function NotFound() {
  return (
    <main className="mx-auto max-w-lg px-6 py-24">
      <EmptyState
        spot="magnifier"
        title="Page not found"
        action={<ActionButton href="/">Back to the dashboard</ActionButton>}
      />
    </main>
  );
}
