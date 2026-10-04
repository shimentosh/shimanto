export interface NavLink {
  href: string;
  label: string;
  /** Opens in a new tab with rel="noopener" (external links only). */
  external?: boolean;
}

export interface NavGroup {
  title: string;
  links: NavLink[];
}

/** Is `href` the current page, or an ancestor section of it? */
export function isActivePath(pathname: string, href: string): boolean {
  if (href === '/') return pathname === '/';
  return pathname === href || pathname.startsWith(`${href}/`);
}
