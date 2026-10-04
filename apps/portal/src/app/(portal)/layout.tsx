'use client';

import { AppAccount, AppShell, type AppNavSection } from '@shimanto/ui';
import { SITE_URL } from '@/lib/config';
import { RequireCustomer, useSession } from '@/lib/session';

const nav: AppNavSection[] = [
  {
    items: [
      { label: 'Overview', href: '/', icon: 'home' },
      { label: 'Orders', href: '/orders', icon: 'receipt' },
      { label: 'My products', href: '/products', icon: 'box' },
      { label: 'Downloads', href: '/downloads', icon: 'download' },
      { label: 'Support', href: '/support', icon: 'chat' },
    ],
  },
  {
    title: 'Account',
    items: [
      { label: 'Profile', href: '/account', icon: 'user' },
      { label: 'Security', href: '/account/security', icon: 'lock' },
      { label: 'GitHub', href: '/account/github', icon: 'github' },
    ],
  },
];

function Shell({ children }: { children: React.ReactNode }) {
  const { me, signOut } = useSession();
  return (
    <AppShell
      brand={{ name: 'Shimanto', area: 'My account', href: '/' }}
      nav={nav}
      account={
        me && (
          <AppAccount
            name={me.name}
            email={me.email}
            href="/account"
            onSignOut={() => void signOut()}
          />
        )
      }
      footer={
        <a
          href={`${SITE_URL}/products`}
          className="text-ink-soft hover:text-ink flex items-center gap-2 px-3 text-sm font-medium"
        >
          Browse the store →
        </a>
      }
    >
      {children}
    </AppShell>
  );
}

export default function PortalLayout({ children }: { children: React.ReactNode }) {
  return (
    <RequireCustomer>
      <Shell>{children}</Shell>
    </RequireCustomer>
  );
}
