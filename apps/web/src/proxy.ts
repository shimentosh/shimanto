import { type NextRequest, NextResponse } from 'next/server';

/**
 * Content OS is sold in two markets: Bangladesh gets the Bangla pages and a taka product at half
 * price, everyone else the English pages in dollars. Cloudflare sends the visitor's country
 * (CF-IPCountry); this sends each visitor to their market, so the pages need no language switch,
 * and the taka product can't be checked out from outside Bangladesh.
 */
const EN = '/content-os';
const BN = '/bn/content-os';
const EN_PRODUCT = 'content-os';
const BD_PRODUCT = 'content-os-bd';

/** The visitor's country, or null when unknown (local dev without Cloudflare, Tor, unknown IPs). */
function countryOf(request: NextRequest): string | null {
  // Testing outside production: ?country=BD (or US) stands in for Cloudflare.
  if (process.env.NODE_ENV !== 'production') {
    const forced = request.nextUrl.searchParams.get('country');
    if (forced) return forced.toUpperCase();
  }
  const country = request.headers.get('cf-ipcountry')?.toUpperCase();
  return country && country !== 'XX' && country !== 'T1' ? country : null;
}

function redirect(request: NextRequest, change: (url: URL) => void) {
  const url = request.nextUrl.clone();
  change(url);
  const response = NextResponse.redirect(url, 307);
  // Depends on where the visitor is: never cache it.
  response.headers.set('Cache-Control', 'private, no-store');
  response.headers.set('Vary', 'CF-IPCountry');
  return response;
}

export function proxy(request: NextRequest) {
  // Files under /content-os (logo, screenshots) are the same for everyone: never redirect them.
  if (/\.[a-z0-9]+$/i.test(request.nextUrl.pathname)) return NextResponse.next();
  const country = countryOf(request);
  if (!country) return NextResponse.next();
  const inBangladesh = country === 'BD';
  const { pathname, searchParams } = request.nextUrl;

  if (pathname === '/checkout') {
    const items = searchParams.get('items');
    if (inBangladesh || !items?.split(',').includes(BD_PRODUCT)) return NextResponse.next();
    return redirect(request, (url) =>
      url.searchParams.set(
        'items',
        items
          .split(',')
          .map((slug) => (slug === BD_PRODUCT ? EN_PRODUCT : slug))
          .join(','),
      ),
    );
  }

  const onBangla = pathname === BN || pathname.startsWith(`${BN}/`);
  if (inBangladesh && !onBangla) {
    return redirect(request, (url) => {
      url.pathname = BN + pathname.slice(EN.length);
    });
  }
  if (!inBangladesh && onBangla) {
    return redirect(request, (url) => {
      url.pathname = EN + pathname.slice(BN.length);
    });
  }
  return NextResponse.next();
}

export const config = {
  matcher: [
    '/content-os',
    '/content-os/:path*',
    '/bn/content-os',
    '/bn/content-os/:path*',
    '/checkout',
  ],
};
