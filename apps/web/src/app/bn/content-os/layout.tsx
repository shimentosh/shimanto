import { Anek_Bangla, Galada, Hind_Siliguri, Tiro_Bangla } from 'next/font/google';
import type { ReactNode } from 'react';

// The Bangla Content OS pages' type: Anek Bangla for headlines, Tiro Bangla (italic) for the
// accent line, Hind Siliguri to read, Galada for the offer. Self-hosted by next/font. See `.cos-bn`.
const anek = Anek_Bangla({
  subsets: ['bengali', 'latin'],
  axes: ['wdth'],
  variable: '--font-anek-bangla',
  display: 'swap',
});
const tiro = Tiro_Bangla({
  weight: '400',
  style: ['normal', 'italic'],
  subsets: ['bengali', 'latin'],
  variable: '--font-tiro-bangla',
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
    <div className={`cos-bn ${anek.variable} ${tiro.variable} ${hind.variable} ${galada.variable}`}>
      {children}
    </div>
  );
}
