import type { ReactNode } from 'react';

// The English Content OS pages: headlines in Instrument Sans with Instrument Serif italic on the
// gradient accent line (fonts loaded in app/layout.tsx). See `.cos-en` in globals.css.
export default function ContentOsLayout({ children }: { children: ReactNode }) {
  return <div className="cos-en">{children}</div>;
}
