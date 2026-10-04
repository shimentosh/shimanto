'use client';

import type { AdminDashboard } from '@shimanto/types';
import { AppAccount, AppShell, type AppNavSection } from '@shimanto/ui';
import { PORTAL_URL, SITE_URL } from '@/lib/config';
import { RequireAdmin, useAdmin } from '@/lib/session';
import { useApi } from '@/lib/use-api';

function Shell({ children }: { children: React.ReactNode }) {
  const { user, signOut } = useAdmin();
  // Counts for the sidebar (open tickets, deliveries needing attention).
  const { data } = useApi<AdminDashboard>('/v1/admin/dashboard');

  const nav: AppNavSection[] = [
    {
      items: [
        { label: 'Dashboard', href: '/', icon: 'grid' },
        {
          label: 'Orders',
          href: '/orders',
          icon: 'receipt',
          badge: data?.deliveriesNeedingAttention || null,
        },
        { label: 'Products', href: '/products', icon: 'box' },
        { label: 'Customers', href: '/customers', icon: 'users' },
        { label: 'Analytics', href: '/analytics', icon: 'chart' },
        { label: 'Support', href: '/tickets', icon: 'chat', badge: data?.openTickets || null },
      ],
    },
    {
      title: 'Store',
      items: [
        { label: 'Files', href: '/files', icon: 'file' },
        { label: 'Coupons', href: '/coupons', icon: 'tag' },
        { label: 'Settings', href: '/settings', icon: 'gear' },
        { label: 'Audit log', href: '/audit', icon: 'shield' },
      ],
    },
  ];

  return (
    <AppShell
      brand={{ name: 'Shimanto', area: 'Store admin', href: '/' }}
      nav={nav}
      account={
        user && <AppAccount name={user.name} email={user.email} onSignOut={() => void signOut()} />
      }
      footer={
        <div className="grid gap-2 px-3 text-sm font-medium">
          <a
            href={PORTAL_URL}
            target="_blank"
            rel="noreferrer"
            className="text-ink-soft hover:text-ink"
            title="Sign in there with your admin email and password"
          >
            Customer portal ↗
          </a>
          <a
            href={SITE_URL}
            target="_blank"
            rel="noreferrer"
            className="text-ink-soft hover:text-ink"
          >
            View the site ↗
          </a>
        </div>
      }
    >
      {children}
    </AppShell>
  );
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <RequireAdmin>
      <Shell>{children}</Shell>
    </RequireAdmin>
  );
}
