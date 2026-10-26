import { Anek_Bangla, Galada, Hind_Siliguri } from 'next/font/google';
import type { ReactNode } from 'react';

// The Bangla Content OS pages' type: Anek Bangla for headlines, Galada for the gradient line and
// the offer, Hind Siliguri to read. Self-hosted by next/font. See `.cos-bn` in globals.css.
const anek = Anek_Bangla({
  subsets: ['bengali', 'latin'],
  axes: ['wdth'],
  variable: '--font-anek-bangla',
  display: 'swap',
});
const hind = Hind_Siliguri({
  weight: ['400', '500', '600'],
  subsets: ['bengali', 'latin'],
  variable: '--font-hind-siliguri',
  display: 'swap',
});
const galada = Galada({
  weight: '400',
  subsets: ['bengali', 'latin'],
  variable: '--font-galada',
  display: 'swap',
});

export default function BanglaContentOsLayout({ children }: { children: ReactNode }) {
  return (
    <div className={`cos-bn ${anek.variable} ${hind.variable} ${galada.variable}`}>{children}</div>
  );
}
