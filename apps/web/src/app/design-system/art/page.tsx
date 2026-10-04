import { Container } from '@shimanto/ui';
import type { Metadata } from 'next';
import { Icon, type IconName } from '@shimanto/ui';
import { DeskScene, Spot, type SpotName } from '@shimanto/ui';

export const metadata: Metadata = {
  title: 'Illustrations',
  robots: { index: false, follow: false },
};

const spotNames: SpotName[] = [
  'rocket',
  'package',
  'notebook',
  'clipboard',
  'calendar',
  'trophy',
  'guitar',
  'megaphone',
  'orbit',
  'flask',
  'bulb',
  'toolbox',
  'magnifier',
  'coffee',
  'mic',
  'plane',
  'hello',
  'cone',
  'mail',
];

const iconNames: IconName[] = [
  'check',
  'bolt',
  'lock',
  'refund',
  'book',
  'code',
  'play',
  'calendar',
  'clock',
  'chart',
  'gear',
  'spark',
  'rocket',
  'music',
  'chat',
  'download',
  'globe',
  'layers',
  'box',
  'cpu',
  'wrench',
  'briefcase',
  'cloud',
  'monitor',
  'compass',
  'target',
  'megaphone',
  'repeat',
  'funnel',
  'bulb',
  'flask',
  'mic',
  'pen',
  'video',
  'palette',
  'mail',
  'heart',
  'list',
  'map',
];

/** Internal gallery of every illustration slot and icon (see /public/illustrations/README.md). */
export default function ArtPage() {
  return (
    <main id="main" className="pt-28 pb-24">
      <Container>
        <h1 className="text-4xl font-medium tracking-[-0.04em]">Illustrations</h1>
        <div className="mt-10 max-w-2xl">
          <DeskScene />
        </div>
        <ul className="mt-12 grid grid-cols-2 gap-8 sm:grid-cols-3 lg:grid-cols-5">
          {spotNames.map((name) => (
            <li key={name}>
              <Spot name={name} />
              <p className="text-ink-soft mt-2 text-center font-mono text-xs">{name}</p>
            </li>
          ))}
        </ul>
        <ul className="mt-12 flex flex-wrap gap-5">
          {iconNames.map((name) => (
            <li key={name} className="text-ink-soft flex flex-col items-center gap-1">
              <Icon name={name} className="text-ink size-6" />
              <span className="font-mono text-[10px]">{name}</span>
            </li>
          ))}
        </ul>
      </Container>
    </main>
  );
}
