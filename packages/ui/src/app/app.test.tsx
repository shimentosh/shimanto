import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
  usePathname: () => '/orders/12',
}));

const {
  AppShell,
  ConfirmDialog,
  activeHref,
  DataTable,
  Field,
  Input,
  OrderSummary,
  StatusBadge,
  SupportConversation,
  formatBytes,
  formatMoney,
  formatTotals,
  humanize,
  statusTone,
} = await import('../index');

describe('format helpers', () => {
  it('formats money in minor units, per currency, with an optional free label', () => {
    expect(formatMoney(4900, 'USD')).toBe('$49.00');
    expect(formatMoney(0, 'USD', { free: 'Free' })).toBe('Free');
    // Intl puts a non-breaking space after "BDT"; compare with normal spaces.
    expect(formatTotals({ USD: 4900, BDT: 120000 }).replace(/\s/g, ' ')).toBe(
      '$49.00 · BDT 1,200.00',
    );
    expect(formatBytes(1536)).toBe('1.5 KB');
    expect(humanize('ACTION_REQUIRED')).toBe('Action required');
  });
});

describe('StatusBadge', () => {
  it('always shows a text label, not only a colour', () => {
    render(<StatusBadge status="INVITATION_SENT" />);
    expect(screen.getByText('Invitation sent')).toBeTruthy();
    expect(statusTone('FAILED')).toBe('danger');
    expect(statusTone('COMPLETED')).toBe('success');
  });
});

describe('Field', () => {
  it('links the label, hint and error to the control', () => {
    render(
      <Field label="Email" hint="We never share it" error="Enter a valid email">
        {(f) => <Input {...f} />}
      </Field>,
    );
    const input = screen.getByLabelText('Email');
    expect(input.getAttribute('aria-invalid')).toBe('true');
    const described = input.getAttribute('aria-describedby') ?? '';
    expect(document.getElementById(described)?.textContent).toBe('Enter a valid email');
  });
});

describe('DataTable', () => {
  it('renders rows with a link on the first cell, or the empty state', () => {
    const rows = [{ id: 'a', name: 'Content OS', total: 4900 }];
    const { rerender } = render(
      <DataTable
        caption="Orders"
        rows={rows}
        rowKey={(r) => r.id}
        rowHref={(r) => `/orders/${r.id}`}
        empty={<p>Nothing</p>}
        columns={[
          { key: 'name', header: 'Name', cell: (r) => r.name },
          {
            key: 'total',
            header: 'Total',
            align: 'right',
            cell: (r) => formatMoney(r.total, 'USD'),
          },
        ]}
      />,
    );
    expect(screen.getByRole('link', { name: 'Content OS' }).getAttribute('href')).toBe('/orders/a');
    expect(screen.getByText('$49.00')).toBeTruthy();
    rerender(
      <DataTable
        caption="Orders"
        rows={[]}
        rowKey={() => 'x'}
        empty={<p>Nothing</p>}
        columns={[]}
      />,
    );
    expect(screen.getByText('Nothing')).toBeTruthy();
  });
});

describe('OrderSummary', () => {
  it('shows the discount with the coupon code and the total', () => {
    render(
      <OrderSummary
        currency="USD"
        subtotal={4900}
        discount={1000}
        total={3900}
        couponCode="SAVE10"
        lines={[
          {
            id: '1',
            name: 'Content OS',
            quantity: 1,
            unitPrice: 4900,
            discount: 1000,
            total: 3900,
          },
        ]}
      />,
    );
    expect(screen.getByText('Discount (SAVE10)')).toBeTruthy();
    expect(screen.getAllByText('$39.00').length).toBeGreaterThan(0);
  });
});

describe('SupportConversation', () => {
  it('labels team replies and offers attachments', () => {
    const open = vi.fn();
    render(
      <SupportConversation
        viewer="CUSTOMER"
        onOpenAttachment={open}
        messages={[
          {
            id: 'm1',
            authorType: 'CUSTOMER',
            authorName: 'Rina',
            body: 'Help',
            createdAt: '2026-09-26T10:00:00Z',
            attachment: { id: 'f', filename: 'shot.png', size: 2048 },
          },
          {
            id: 'm2',
            authorType: 'ADMIN',
            authorName: 'Shimanto support',
            body: 'On it',
            createdAt: '2026-09-26T11:00:00Z',
            attachment: null,
          },
        ]}
      />,
    );
    expect(screen.getByText('Team')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: /shot\.png/ }));
    expect(open).toHaveBeenCalledOnce();
  });
});

describe('AppShell', () => {
  it('marks the current section and offers a skip link', () => {
    render(
      <AppShell
        brand={{ name: 'Shimanto', area: 'Admin', href: '/' }}
        nav={[
          {
            items: [
              { label: 'Dashboard', href: '/', icon: 'grid' },
              { label: 'Orders', href: '/orders', icon: 'receipt', badge: 3 },
            ],
          },
        ]}
      >
        <p>Page</p>
      </AppShell>,
    );
    expect(screen.getByRole('link', { name: /Orders/ }).getAttribute('aria-current')).toBe('page');
    expect(screen.getByRole('link', { name: 'Dashboard' }).getAttribute('aria-current')).toBeNull();
    expect(screen.getByText('Skip to content')).toBeTruthy();
  });
});

describe('activeHref', () => {
  it('picks the most specific nav item only', () => {
    const hrefs = ['/', '/account', '/account/github', '/orders'];
    expect(activeHref('/account/github', hrefs)).toBe('/account/github');
    expect(activeHref('/account', hrefs)).toBe('/account');
    expect(activeHref('/orders/12', hrefs)).toBe('/orders');
    expect(activeHref('/', hrefs)).toBe('/');
  });
});

describe('ConfirmDialog', () => {
  it('runs the action and closes', async () => {
    const onConfirm = vi.fn(async () => undefined);
    const onOpenChange = vi.fn();
    render(
      <ConfirmDialog
        open
        onOpenChange={onOpenChange}
        title="Refund?"
        description="Money goes back."
        confirmLabel="Refund"
        onConfirm={onConfirm}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Refund' }));
    await vi.waitFor(() => expect(onOpenChange).toHaveBeenCalledWith(false));
    expect(onConfirm).toHaveBeenCalledOnce();
  });
});
