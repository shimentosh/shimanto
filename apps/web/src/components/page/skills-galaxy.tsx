'use client';

import { accentBg, cn } from '@shimanto/ui';
import Link from 'next/link';
import { useState } from 'react';
import type { Skill } from '@/content/catalog';

/**
 * 2D Skills Galaxy: nine planets on an orbit around a core. Selecting a planet opens its panel.
 * The planets are real buttons in reading order, so keyboard and screen-reader users get the
 * same content. Phase 6 layers the R3F constellation on top; this stays as the fallback.
 */
export function SkillsGalaxy({ skills }: { skills: Skill[] }) {
  const [activeId, setActiveId] = useState(skills[0]?.id);
  const active = skills.find((s) => s.id === activeId) ?? skills[0];

  return (
    <div className="grid items-center gap-10 lg:grid-cols-[1.2fr_1fr]">
      <div className="relative mx-auto aspect-square w-full max-w-[34rem]">
        <div
          aria-hidden="true"
          className="border-ink/15 absolute inset-[6%] rounded-full border border-dashed"
        />
        <div
          aria-hidden="true"
          className="border-ink/10 absolute inset-[26%] rounded-full border border-dashed"
        />
        <div
          aria-hidden="true"
          className="bg-build text-on-world absolute inset-[38%] grid place-items-center rounded-full text-center text-sm font-semibold md:text-base"
        >
          Systems
        </div>
        <ul aria-label="Skills" className="absolute inset-0">
          {skills.map((skill, i) => {
            const angle = (i / skills.length) * Math.PI * 2 - Math.PI / 2;
            const radius = i % 2 === 0 ? 44 : 34;
            const selected = skill.id === active?.id;
            return (
              <li
                key={skill.id}
                className="absolute -translate-x-1/2 -translate-y-1/2"
                style={{
                  left: `${50 + Math.cos(angle) * radius}%`,
                  top: `${50 + Math.sin(angle) * radius}%`,
                }}
              >
                <button
                  type="button"
                  aria-pressed={selected}
                  onClick={() => setActiveId(skill.id)}
                  className={cn(
                    'text-on-world rounded-pill px-3 py-2 text-sm font-medium whitespace-nowrap shadow-[0_10px_24px_-14px_rgb(0_0_0/0.5)] transition-transform duration-300 hover:scale-105 md:px-4 md:text-base',
                    accentBg[skill.tone],
                    selected &&
                      'ring-ink scale-110 ring-2 ring-offset-2 ring-offset-[var(--canvas)]',
                  )}
                >
                  {skill.name}
                </button>
              </li>
            );
          })}
        </ul>
      </div>

      {active && (
        <div aria-live="polite" className="border-ink/15 rounded-card border p-8 md:p-10">
          <span
            aria-hidden="true"
            className={cn('block size-4 rounded-full', accentBg[active.tone])}
          />
          <h2 className="mt-6 text-4xl font-medium tracking-[-0.04em]">{active.name}</h2>
          <p className="text-ink-soft mt-4 text-lg">{active.summary}</p>
          <ul className="mt-8 flex flex-wrap gap-2">
            {active.links.map((link) => (
              <li key={link.href + link.label}>
                <Link
                  href={link.href}
                  className="border-ink/15 hover:border-ink/40 rounded-pill inline-block border px-4 py-1.5 text-sm font-medium transition-colors"
                >
                  {link.label} →
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
