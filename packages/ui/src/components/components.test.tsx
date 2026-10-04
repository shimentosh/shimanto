import { act, fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const push = vi.fn();
let pathname = '/work/content-os';
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push }),
  usePathname: () => pathname,
}));

const {
  BentoGrid,
  Button,
  CommandPalette,
  FloatingNav,
  LocaleSwitch,
  Marquee,
  Squiggle,
  StatCardStack,
  ThemeToggle,
  groupByYear,
} = await import('../index');

function mockReducedMotion(reduce: boolean) {
  vi.stubGlobal(
    'matchMedia',
    (query: string) =>
      ({
        matches: query.includes('prefers-reduced-motion') ? reduce : false,
        media: query,
        addEventListener: () => {},
        removeEventListener: () => {},
      }) as unknown as MediaQueryList,
  );
}

beforeEach(() => {
  push.mockReset();
  mockReducedMotion(false);
});

describe('Button', () => {
  it('renders a link with a decorative chip when given href', () => {
    render(<Button href="/work">Explore my work</Button>);
    const link = screen.getByRole('link', { name: 'Explore my work' });
    expect(link.getAttribute('href')).toBe('/work');
  });

  it('renders a type="button" button otherwise', () => {
    render(<Button>Send</Button>);
    expect(screen.getByRole('button', { name: 'Send' }).getAttribute('type')).toBe('button');
  });
});

describe('Marquee', () => {
  it('exposes each item once to assistive tech and can be paused', () => {
    render(<Marquee label="Platforms" rows={[{ items: ['YouTube', 'Instagram'] }]} />);
    const region = screen.getByRole('region', { name: 'Platforms' });
    expect(screen.getAllByText('YouTube')).toHaveLength(2);
    expect(screen.getAllByRole('listitem')).toHaveLength(2); // the duplicate list is aria-hidden

    const toggle = screen.getByRole('button', { name: /pause scrolling/i });
    fireEvent.click(toggle);
    expect(region.dataset.paused).toBe('true');
    expect(toggle.getAttribute('aria-pressed')).toBe('true');
  });
});

describe('Squiggle', () => {
  it('keeps the keyword as plain text and is static under reduced motion', () => {
    mockReducedMotion(true);
    const { container } = render(
      <h1>
        <Squiggle>Systems</Squiggle> Thinker.
      </h1>,
    );
    expect(screen.getByRole('heading').textContent).toBe('Systems Thinker.');
    expect(container.querySelector('[data-squiggle]')?.getAttribute('data-squiggle')).toBe(
      'static',
    );
  });

  it('arms (hides the stroke) when motion is allowed, waiting to draw in view', () => {
    const { container } = render(<Squiggle>built</Squiggle>);
    expect(container.querySelector('[data-squiggle]')?.getAttribute('data-squiggle')).toBe('armed');
  });
});

describe('StatCardStack', () => {
  it('renders stats as a list with value and label text', () => {
    render(<StatCardStack stats={[{ value: '35M+', label: 'views on one song' }]} />);
    expect(screen.getByRole('listitem').textContent).toContain('35M+');
    expect(screen.getByText('views on one song')).toBeTruthy();
  });
});

describe('BentoGrid', () => {
  it('makes the first tile the feature tile', () => {
    render(
      <BentoGrid label="Notes">
        <span>Feature</span>
        <span>Small</span>
      </BentoGrid>,
    );
    const [feature, small] = screen.getAllByRole('listitem');
    expect(feature?.className).toContain('lg:row-span-2');
    expect(small?.className).not.toContain('lg:row-span-2');
  });
});

describe('groupByYear', () => {
  it('groups by year, newest first', () => {
    const groups = groupByYear([
      { id: 'a', date: '2019-03', title: 'Song', type: 'VIEWS' },
      { id: 'b', date: '2025-01-10', title: 'Launch', type: 'LAUNCH' },
      { id: 'c', date: '2019-11', title: 'Other', type: 'PRESS' },
    ]);
    expect(groups.map((g) => g.year)).toEqual(['2025', '2019']);
    expect(groups[1]?.items.map((i) => i.id)).toEqual(['a', 'c']);
  });
});

describe('ThemeToggle', () => {
  it('switches to dark, persists the choice and reports pressed state', () => {
    render(<ThemeToggle />);
    const toggle = screen.getByRole('button', { name: 'Dark theme' });
    expect(toggle.getAttribute('aria-pressed')).toBe('false');

    fireEvent.click(toggle);
    expect(document.documentElement.dataset.theme).toBe('dark');
    expect(localStorage.getItem('theme')).toBe('dark');
    expect(toggle.getAttribute('aria-pressed')).toBe('true');
  });
});

describe('LocaleSwitch', () => {
  it('links to the same page in each locale and marks the current one', () => {
    pathname = '/work/content-os';
    render(<LocaleSwitch />);
    const bn = screen.getByRole('link', { name: /Bangla/ });
    expect(bn.getAttribute('href')).toBe('/bn/work/content-os');
    expect(bn.getAttribute('hreflang')).toBe('bn');
    expect(screen.getByRole('link', { name: 'English' }).getAttribute('aria-current')).toBe('true');
  });
});

describe('FloatingNav menu', () => {
  it('opens the menu sheet and returns focus to the menu button on Escape', async () => {
    render(
      <FloatingNav
        logo="Shimanto"
        links={[{ href: '/work', label: 'Work' }]}
        groups={[{ title: 'Explore', links: [{ href: '/lab', label: 'Marketing Lab' }] }]}
        cta={{ href: '/collaborate', label: "Let's build" }}
      />,
    );
    const menuButton = screen.getByRole('button', { name: 'Open menu' });
    menuButton.focus();
    fireEvent.click(menuButton);
    const dialog = await screen.findByRole('dialog', { name: 'Menu' });
    expect(dialog.textContent).toContain('Marketing Lab');

    fireEvent.keyDown(dialog, { key: 'Escape' });
    await vi.waitFor(() => {
      expect(screen.queryByRole('dialog')).toBeNull();
      expect(document.activeElement).toBe(menuButton);
    });
  });

  it('marks the current section with aria-current', () => {
    pathname = '/work/content-os';
    render(
      <FloatingNav
        logo="S"
        links={[{ href: '/work', label: 'Work' }]}
        groups={[]}
        cta={{ href: '/c', label: 'Go' }}
      />,
    );
    expect(screen.getByRole('link', { name: 'Work' }).getAttribute('aria-current')).toBe('page');
  });
});

describe('CommandPalette', () => {
  it('opens on Ctrl+K and navigates to the chosen item', async () => {
    render(
      <CommandPalette groups={[{ heading: 'Pages', items: [{ label: 'Now', href: '/now' }] }]} />,
    );
    expect(screen.queryByRole('dialog')).toBeNull();

    act(() => {
      fireEvent.keyDown(window, { key: 'k', ctrlKey: true });
    });
    expect(await screen.findByRole('dialog')).toBeTruthy();

    fireEvent.click(screen.getByText('Now'));
    expect(push).toHaveBeenCalledWith('/now');
  });
});
