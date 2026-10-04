import { cn } from '../../lib/cn';
import type { ReactNode } from 'react';

/**
 * Original spot illustrations (brief §2.3): flat objects in the five world colours with thin ink
 * line detail. Fixed colours, so they read the same in light and dark themes. Placeholders until
 * commissioned art exists; every slot is listed in /public/illustrations/README.md.
 */

const C = {
  ink: '#2c2e2a',
  build: '#8fd464',
  create: '#ff7059',
  spark: '#f4e311',
  signal: '#2e9bf7',
  idea: '#e6c3f5',
  cream: '#f3efe4',
  sand: '#e6e0d3',
  white: '#ffffff',
};

const line = {
  stroke: C.ink,
  strokeWidth: 3,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
};

function Ground({ cx = 120, cy = 184, rx = 84 }: { cx?: number; cy?: number; rx?: number }) {
  return <ellipse cx={cx} cy={cy} rx={rx} ry={9} fill="currentColor" opacity={0.08} />;
}

/** Four-point sparkle. */
function Sparkle({
  x,
  y,
  r = 8,
  fill = C.spark,
}: {
  x: number;
  y: number;
  r?: number;
  fill?: string;
}) {
  const k = r * 0.28;
  return (
    <path
      d={`M${x} ${y - r} Q${x + k} ${y - k} ${x + r} ${y} Q${x + k} ${y + k} ${x} ${y + r} Q${x - k} ${y + k} ${x - r} ${y} Q${x - k} ${y - k} ${x} ${y - r}Z`}
      fill={fill}
      {...line}
      strokeWidth={2}
    />
  );
}

function Note({ x, y, fill }: { x: number; y: number; fill: string }) {
  return (
    <g {...line} strokeWidth={2.5}>
      <path d={`M${x + 9} ${y + 22} V${y} l12 4`} fill="none" />
      <ellipse cx={x + 4} cy={y + 23} rx={6.5} ry={5} fill={fill} />
    </g>
  );
}

const spots = {
  rocket: (
    <>
      <Ground />
      <Sparkle x={48} y={52} fill={C.build} />
      <Sparkle x={196} y={40} r={6} />
      <circle cx={188} cy={112} r={4} fill={C.idea} {...line} strokeWidth={2} />
      <g transform="rotate(24 120 100)" {...line}>
        <path d="M108 150 C108 172 120 184 120 184 C120 184 132 172 132 150Z" fill={C.spark} />
        <path d="M92 108 L68 148 H94Z" fill={C.create} />
        <path d="M148 108 L172 148 H146Z" fill={C.create} />
        <path d="M120 18 C150 44 158 92 148 142 H92 C82 92 90 44 120 18Z" fill={C.white} />
        <path d="M100 56 H140" />
        <circle cx={120} cy={88} r={15} fill={C.signal} />
        <path d="M100 142 h40 l-5 11 h-30z" fill={C.idea} />
      </g>
      <g stroke={C.ink} strokeWidth={2.5} strokeLinecap="round" opacity={0.35}>
        <path d="M40 150 l18 -10M34 170 l24 -13M60 176 l14 -8" />
      </g>
    </>
  ),
  package: (
    <>
      <Ground />
      <g {...line}>
        <path d="M60 92 L120 72 L180 92 L120 112Z" fill="#c9483a" />
        <path d="M60 92 L120 112 V180 L60 160Z" fill={C.create} />
        <path d="M120 112 L180 92 V160 L120 180Z" fill="#e8604b" />
        <path d="M60 92 L36 70 L96 50 L120 72Z" fill="#ff8f7d" />
        <path d="M180 92 L204 70 L144 50 L120 72Z" fill="#ff8f7d" />
        <rect
          x={86}
          y={34}
          width={30}
          height={40}
          rx={3}
          fill={C.signal}
          transform="rotate(-14 101 54)"
        />
        <rect
          x={120}
          y={28}
          width={34}
          height={44}
          rx={3}
          fill={C.idea}
          transform="rotate(10 137 50)"
        />
        <path
          d="M128 40 h18 M128 48 h14 M128 56 h16"
          transform="rotate(10 137 50)"
          strokeWidth={2}
        />
      </g>
      <g {...line} strokeWidth={2.5}>
        <path d="M174 118 l18 -4" fill="none" />
        <path d="M192 104 l22 -5 l4 18 l-22 5z" fill={C.spark} />
        <circle cx={197} cy={110} r={2} fill={C.ink} />
      </g>
      <Sparkle x={44} y={40} fill={C.build} />
    </>
  ),
  notebook: (
    <>
      <Ground />
      <g {...line}>
        <path
          d="M34 66 Q78 54 120 68 Q162 54 206 66 V168 Q162 156 120 170 Q78 156 34 168Z"
          fill={C.idea}
        />
        <path
          d="M40 58 Q80 46 120 60 Q160 46 200 58 V160 Q160 148 120 162 Q80 148 40 160Z"
          fill={C.white}
        />
        <path d="M120 60 V162" />
        <path d="M112 56 V96 l8 -7 8 7 V56" fill={C.create} strokeWidth={2.5} />
      </g>
      <g stroke={C.ink} strokeWidth={2} strokeLinecap="round" opacity={0.4} fill="none">
        <path d="M54 84 Q76 78 100 84M54 102 Q76 96 100 102M54 120 Q76 114 100 120M54 138 Q70 134 86 138" />
        <path d="M140 84 Q164 78 186 84M140 102 Q164 96 186 102M140 120 Q158 116 174 120" />
      </g>
      <g transform="rotate(-38 176 128)" {...line}>
        <rect x={150} y={121} width={62} height={14} rx={2} fill={C.spark} />
        <path d="M150 121 L134 128 L150 135Z" fill={C.cream} />
        <path d="M134 128 l5 -2.2 v4.4z" fill={C.ink} strokeWidth={1.5} />
        <rect x={212} y={121} width={10} height={14} rx={2} fill={C.create} />
      </g>
    </>
  ),
  clipboard: (
    <>
      <Ground />
      <g {...line}>
        <rect x={68} y={30} width={104} height={146} rx={10} fill={C.signal} />
        <rect x={80} y={46} width={80} height={118} rx={4} fill={C.white} />
        <rect x={98} y={22} width={44} height={18} rx={6} fill={C.cream} />
        {[66, 94, 122].map((y, i) => (
          <g key={y}>
            <rect
              x={90}
              y={y}
              width={16}
              height={16}
              rx={4}
              fill={i < 2 ? C.build : C.white}
              strokeWidth={2.5}
            />
            {i < 2 && <path d={`M94 ${y + 8} l3 3 6 -6`} strokeWidth={2.5} fill="none" />}
            <path d={`M114 ${y + 8} H${i === 1 ? 140 : 150}`} strokeWidth={2.5} opacity={0.5} />
          </g>
        ))}
        <path d="M90 150 H132" strokeWidth={2.5} opacity={0.3} />
      </g>
      <Sparkle x={190} y={60} fill={C.build} />
      <Sparkle x={48} y={120} r={6} />
    </>
  ),
  calendar: (
    <>
      <Ground />
      <g {...line}>
        <rect x={46} y={44} width={124} height={120} rx={12} fill={C.white} />
        <path d="M46 56 a12 12 0 0 1 12 -12 h100 a12 12 0 0 1 12 12 v18 H46z" fill={C.spark} />
        <rect x={74} y={32} width={9} height={22} rx={4.5} fill={C.ink} />
        <rect x={133} y={32} width={9} height={22} rx={4.5} fill={C.ink} />
      </g>
      {[0, 1, 2].flatMap((r) =>
        [0, 1, 2, 3].map((c) => (
          <rect
            key={`${r}-${c}`}
            x={60 + c * 26}
            y={88 + r * 22}
            width={16}
            height={13}
            rx={3}
            fill={r === 1 && c === 2 ? C.create : C.sand}
          />
        )),
      )}
      <g {...line}>
        <circle cx={172} cy={140} r={34} fill={C.build} />
        <circle cx={172} cy={140} r={25} fill={C.white} strokeWidth={2.5} />
        <path d="M172 140 V124 M172 140 L184 147" />
        <circle cx={172} cy={140} r={2.5} fill={C.ink} />
      </g>
    </>
  ),
  trophy: (
    <>
      <Ground />
      <g {...line}>
        <path d="M84 56 H64 C60 84 72 98 90 100" fill="none" strokeWidth={6} />
        <path d="M156 56 H176 C180 84 168 98 150 100" fill="none" strokeWidth={6} />
        <path d="M80 40 H160 V80 C160 110 142 128 120 128 C98 128 80 110 80 80Z" fill={C.spark} />
        <rect x={111} y={128} width={18} height={20} fill="#e0cf0c" />
        <rect x={86} y={148} width={68} height={20} rx={4} fill={C.create} />
        <path d="M100 158 H140" strokeWidth={2.5} opacity={0.5} />
      </g>
      <Sparkle x={120} y={80} r={13} fill={C.white} />
      <g {...line} strokeWidth={2}>
        <rect
          x={40}
          y={50}
          width={10}
          height={6}
          rx={1}
          fill={C.signal}
          transform="rotate(25 45 53)"
        />
        <rect
          x={190}
          y={40}
          width={10}
          height={6}
          rx={1}
          fill={C.build}
          transform="rotate(-20 195 43)"
        />
        <rect
          x={196}
          y={120}
          width={10}
          height={6}
          rx={1}
          fill={C.idea}
          transform="rotate(40 201 123)"
        />
        <rect
          x={36}
          y={130}
          width={10}
          height={6}
          rx={1}
          fill={C.create}
          transform="rotate(-30 41 133)"
        />
      </g>
    </>
  ),
  guitar: (
    <>
      <Ground />
      <g transform="rotate(26 116 104)" {...line}>
        <rect x={110} y={20} width={16} height={86} fill={C.cream} />
        <path d="M110 40 h16M110 56 h16M110 72 h16M110 88 h16" strokeWidth={2} opacity={0.5} />
        <rect x={106} y={4} width={24} height={20} rx={5} fill={C.ink} />
        <path
          d="M118 98 C94 98 84 112 88 126 C76 134 74 158 90 170 C104 182 132 182 146 170 C162 158 160 134 148 126 C152 112 142 98 118 98Z"
          fill={C.create}
        />
        <circle cx={118} cy={140} r={12} fill={C.ink} />
        <rect x={106} y={158} width={24} height={6} rx={2} fill={C.ink} />
        <path d="M114 22 V160M118 22 V160M122 22 V160" stroke={C.white} strokeWidth={1.2} />
      </g>
      <Note x={176} y={46} fill={C.signal} />
      <Note x={196} y={96} fill={C.idea} />
      <Note x={36} y={60} fill={C.build} />
    </>
  ),
  megaphone: (
    <>
      <Ground />
      <g {...line}>
        <rect x={42} y={92} width={20} height={34} rx={5} fill={C.create} />
        <path d="M60 96 L150 56 V162 L60 122Z" fill={C.signal} />
        <ellipse cx={150} cy={109} rx={13} ry={53} fill={C.white} />
        <rect
          x={74}
          y={120}
          width={16}
          height={34}
          rx={5}
          fill={C.ink}
          transform="rotate(-8 82 137)"
        />
      </g>
      <g {...line} fill="none" strokeWidth={3} opacity={0.6}>
        <path d="M176 90 Q188 109 176 128" />
        <path d="M190 78 Q208 109 190 140" />
      </g>
      <g {...line} strokeWidth={2.5}>
        <path
          d="M160 18 h58 a8 8 0 0 1 8 8 v22 a8 8 0 0 1 -8 8 h-40 l-12 10 v-10 h-6 a8 8 0 0 1 -8 -8 v-22 a8 8 0 0 1 8 -8z"
          fill={C.idea}
        />
        <circle cx={176} cy={37} r={3} fill={C.ink} />
        <circle cx={189} cy={37} r={3} fill={C.ink} />
        <circle cx={202} cy={37} r={3} fill={C.ink} />
      </g>
      <path
        d="M52 46 c0 -6 8 -8 11 -3 c3 -5 11 -3 11 3 c0 7 -11 13 -11 13 s-11 -6 -11 -13z"
        fill={C.create}
        {...line}
        strokeWidth={2.5}
      />
    </>
  ),
  orbit: (
    <>
      <Sparkle x={40} y={40} fill={C.build} />
      <Sparkle x={206} y={170} r={6} />
      <g {...line}>
        <ellipse
          cx={120}
          cy={104}
          rx={80}
          ry={22}
          fill="none"
          transform="rotate(-14 120 104)"
          opacity={0.5}
        />
        <circle cx={120} cy={104} r={44} fill={C.build} />
        <path
          d="M86 92 Q104 84 120 90 M92 118 Q110 112 132 118"
          strokeWidth={2.5}
          opacity={0.4}
          fill="none"
        />
        <path d="M42 124 A80 22 -14 0 0 198 84" fill="none" />
        <circle cx={50} cy={128} r={9} fill={C.signal} />
        <circle cx={196} cy={60} r={12} fill={C.create} />
        <circle cx={170} cy={160} r={7} fill={C.idea} />
        <circle cx={70} cy={50} r={6} fill={C.spark} />
      </g>
    </>
  ),
  flask: (
    <>
      <Ground />
      <g {...line}>
        <rect x={150} y={104} width={64} height={60} rx={8} fill={C.white} />
        <rect x={162} y={134} width={10} height={20} rx={2} fill={C.signal} strokeWidth={2} />
        <rect x={178} y={122} width={10} height={32} rx={2} fill={C.build} strokeWidth={2} />
        <rect x={194} y={114} width={10} height={40} rx={2} fill={C.create} strokeWidth={2} />
        <path
          d="M90 28 H130 M98 28 V78 L56 150 C50 162 58 174 72 174 H148 C162 174 170 162 164 150 L122 78 V28"
          fill={C.white}
        />
        <path
          d="M68 128 H152 L164 150 C170 162 162 174 148 174 H72 C58 174 50 162 56 150Z"
          fill={C.idea}
        />
        <circle cx={96} cy={150} r={5} fill={C.white} strokeWidth={2} />
        <circle cx={120} cy={140} r={4} fill={C.white} strokeWidth={2} />
        <circle cx={128} cy={158} r={6} fill={C.white} strokeWidth={2} />
      </g>
      <g {...line} strokeWidth={2}>
        <circle cx={112} cy={16} r={5} fill={C.white} />
        <circle cx={124} cy={6} r={3} fill={C.white} />
      </g>
      <Sparkle x={40} y={70} fill={C.build} />
    </>
  ),
  bulb: (
    <>
      <Ground />
      <g stroke={C.ink} strokeWidth={3} strokeLinecap="round" opacity={0.7}>
        <path d="M120 16 V30M62 42 l10 10M178 42 l-10 10M44 100 H58M182 100 H196" />
      </g>
      <g {...line}>
        <path
          d="M120 40 C88 40 70 64 72 90 C74 110 86 120 94 132 C98 138 98 144 98 150 H142 C142 144 142 138 146 132 C154 120 166 110 168 90 C170 64 152 40 120 40Z"
          fill={C.spark}
        />
        <path d="M108 150 V122 L120 110 L132 122 V150" fill="none" strokeWidth={2.5} />
        <rect x={98} y={150} width={44} height={12} rx={3} fill={C.cream} />
        <rect x={102} y={162} width={36} height={12} rx={3} fill={C.cream} />
        <path d="M110 174 H130 L126 180 H114Z" fill={C.ink} />
      </g>
      <path
        d="M94 76 Q98 60 114 56"
        stroke={C.white}
        strokeWidth={5}
        strokeLinecap="round"
        fill="none"
      />
      <Sparkle x={196} y={150} r={7} fill={C.idea} />
    </>
  ),
  toolbox: (
    <>
      <Ground />
      <g {...line}>
        <g transform="rotate(-20 90 70)">
          <rect x={84} y={30} width={12} height={70} rx={3} fill={C.sand} />
          <path d="M78 30 a12 12 0 1 1 24 0 l-6 -2 l-6 6 l-6 -6z" fill={C.sand} />
        </g>
        <g transform="rotate(16 150 70)">
          <rect x={144} y={26} width={14} height={76} rx={2} fill={C.spark} />
          <path d="M144 40 h6M144 52 h8M144 64 h6M144 76 h8" strokeWidth={2} />
        </g>
        <path d="M94 92 V74 H146 V92" fill="none" strokeWidth={7} />
        <rect x={48} y={90} width={144} height={80} rx={10} fill={C.create} />
        <path d="M48 116 H192" />
        <rect x={110} y={108} width={20} height={16} rx={3} fill={C.spark} />
      </g>
      <Sparkle x={206} y={60} fill={C.build} />
    </>
  ),
  magnifier: (
    <>
      <Ground />
      <g {...line}>
        <path d="M36 62 L88 46 L148 62 L204 46 V150 L148 166 L88 150 L36 166Z" fill={C.cream} />
        <path d="M88 46 V150 M148 62 V166" strokeWidth={2} opacity={0.4} />
        <path
          d="M54 140 C70 120 76 104 100 106 S128 84 140 92"
          fill="none"
          strokeWidth={2.5}
          strokeDasharray="2 7"
        />
        <path
          d="M54 124 c0 -8 12 -8 12 0 c0 7 -6 14 -6 14 s-6 -7 -6 -14z"
          fill={C.create}
          strokeWidth={2.5}
        />
        <path d="M168 128 L196 158" strokeWidth={12} />
        <path d="M168 128 L196 158" stroke={C.idea} strokeWidth={6} />
        <circle cx={146} cy={104} r={34} fill={C.white} fillOpacity={0.85} strokeWidth={6} />
        <path d="M130 92 Q136 80 150 78" stroke={C.signal} strokeWidth={4} fill="none" />
      </g>
    </>
  ),
  coffee: (
    <>
      <Ground />
      <g stroke={C.ink} strokeWidth={3} strokeLinecap="round" fill="none" opacity={0.55}>
        <path d="M96 58 c-8 -10 8 -16 0 -28M118 58 c-8 -10 8 -16 0 -28M140 58 c-8 -10 8 -16 0 -28" />
      </g>
      <g {...line}>
        <path d="M156 96 h12 a18 18 0 0 1 0 36 h-12" fill="none" strokeWidth={8} />
        <path
          d="M156 96 h12 a18 18 0 0 1 0 36 h-12"
          fill="none"
          stroke={C.signal}
          strokeWidth={3}
        />
        <path d="M72 72 H164 V150 A20 20 0 0 1 144 170 H92 A20 20 0 0 1 72 150Z" fill={C.signal} />
        <path d="M72 72 H164" />
        <path
          d="M104 116 c0 -6 8 -8 11 -3 c3 -5 11 -3 11 3 c0 7 -11 13 -11 13 s-11 -6 -11 -13z"
          fill={C.white}
          strokeWidth={2.5}
        />
      </g>
      <Note x={190} y={52} fill={C.create} />
      <Sparkle x={44} y={96} fill={C.build} />
    </>
  ),
  mic: (
    <>
      <Ground />
      <g {...line} fill="none" opacity={0.6}>
        <path d="M62 70 Q48 96 62 122M44 58 Q24 96 44 134M178 70 Q192 96 178 122M196 58 Q216 96 196 134" />
      </g>
      <g {...line}>
        <path d="M86 84 V94 a34 34 0 0 0 68 0 V84" fill="none" strokeWidth={6} />
        <path d="M120 128 V160" strokeWidth={6} />
        <rect x={92} y={158} width={56} height={14} rx={6} fill={C.ink} />
        <rect x={100} y={26} width={40} height={78} rx={20} fill={C.idea} />
        <path d="M100 56 H140 M100 70 H140 M100 84 H140" strokeWidth={2} opacity={0.5} />
      </g>
      <Sparkle x={184} y={30} fill={C.spark} />
    </>
  ),
  plane: (
    <>
      <path
        d="M30 176 C60 150 70 180 98 158 S130 130 118 120"
        fill="none"
        stroke={C.ink}
        strokeWidth={2.5}
        strokeLinecap="round"
        strokeDasharray="3 8"
        opacity={0.6}
      />
      <g {...line}>
        <path d="M60 100 L206 40 L150 170 L118 128Z" fill={C.white} />
        <path d="M206 40 L118 128 L112 164 L132 140" fill={C.idea} />
        <path d="M206 40 L118 128" />
      </g>
      <Sparkle x={46} y={48} fill={C.build} />
      <Sparkle x={210} y={140} r={6} />
      <circle cx={160} cy={24} r={4} fill={C.create} {...line} strokeWidth={2} />
    </>
  ),
  hello: (
    <>
      <Ground />
      <g {...line}>
        <path
          d="M40 40 h128 a14 14 0 0 1 14 14 v56 a14 14 0 0 1 -14 14 h-80 l-26 22 v-22 h-8 a14 14 0 0 1 -14 -14 v-56 a14 14 0 0 1 14 -14z"
          fill={C.build}
        />
        <path
          d="M150 104 h44 a12 12 0 0 1 12 12 v30 a12 12 0 0 1 -12 12 h-8 v16 l-18 -16 h-18 a12 12 0 0 1 -12 -12 v-30 a12 12 0 0 1 12 -12z"
          fill={C.idea}
        />
      </g>
      <text
        x={104}
        y={96}
        textAnchor="middle"
        fontSize={42}
        fontWeight={600}
        fill={C.ink}
        style={{ fontFamily: 'var(--font-sans)', letterSpacing: '-0.04em' }}
      >
        Hi!
      </text>
      <circle cx={162} cy={131} r={4} fill={C.ink} />
      <circle cx={176} cy={131} r={4} fill={C.ink} />
      <circle cx={190} cy={131} r={4} fill={C.ink} />
      <Sparkle x={200} y={40} />
      <Sparkle x={30} y={150} r={6} fill={C.create} />
    </>
  ),
  cone: (
    <>
      <Ground />
      <g {...line}>
        <rect x={62} y={158} width={116} height={18} rx={4} fill={C.create} />
        <path d="M104 40 H136 L164 158 H76Z" fill={C.create} />
        <path d="M96 76 H144 L150 102 H90Z" fill={C.white} />
        <path d="M84 124 H156 L161 146 H79Z" fill={C.white} />
        <rect x={100} y={30} width={40} height={12} rx={4} fill={C.ink} />
      </g>
      <g {...line} strokeWidth={2.5}>
        <circle cx={188} cy={52} r={22} fill={C.spark} />
      </g>
      <text
        x={188}
        y={62}
        textAnchor="middle"
        fontSize={28}
        fontWeight={700}
        fill={C.ink}
        style={{ fontFamily: 'var(--font-sans)' }}
      >
        ?
      </text>
    </>
  ),
  mail: (
    <>
      <Ground />
      <g {...line}>
        <rect x={48} y={70} width={144} height={100} rx={10} fill={C.white} />
        <rect x={70} y={40} width={100} height={90} rx={6} fill={C.cream} />
        <path d="M86 62 H154 M86 78 H140 M86 94 H148" strokeWidth={2.5} opacity={0.4} />
        <path
          d="M48 80 L120 130 L192 80 V160 a10 10 0 0 1 -10 10 H58 a10 10 0 0 1 -10 -10Z"
          fill={C.signal}
        />
        <path d="M48 170 L110 122 M192 170 L130 122" strokeWidth={2.5} />
        <circle cx={186} cy={62} r={20} fill={C.build} />
        <path d="M177 62 l6 6 12 -12" fill="none" />
      </g>
      <Sparkle x={40} y={44} fill={C.spark} />
    </>
  ),
} satisfies Record<string, ReactNode>;

export type SpotName = keyof typeof spots;

export function Spot({
  name,
  className,
  float = false,
}: {
  name: SpotName;
  className?: string;
  /** Gentle bob; skipped under reduced motion. */
  float?: boolean;
}) {
  return (
    <svg
      viewBox="0 0 240 200"
      aria-hidden="true"
      focusable="false"
      className={cn('text-ink h-auto w-full overflow-visible', float && 'art-float', className)}
    >
      {spots[name]}
    </svg>
  );
}

/** Home hero scene: a founder's desk with a laptop, plant, mug, and things in orbit. */
export function DeskScene({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 480 400"
      aria-hidden="true"
      focusable="false"
      className={cn('text-ink h-auto w-full overflow-visible', className)}
    >
      <ellipse cx={240} cy={372} rx={200} ry={14} fill="currentColor" opacity={0.08} />
      {/* desk */}
      <g {...line}>
        <rect x={40} y={318} width={400} height={18} rx={6} fill={C.sand} />
        <path d="M72 336 V372 M408 336 V372" strokeWidth={6} />
      </g>
      {/* plant */}
      <g {...line}>
        <path d="M92 250 C70 226 72 196 96 184 C100 210 104 230 100 250Z" fill={C.build} />
        <path d="M104 250 C112 214 134 196 158 200 C150 226 132 244 108 252Z" fill={C.build} />
        <path d="M98 252 C90 224 70 214 52 222 C62 242 80 252 98 256Z" fill="#7cc451" />
        <path d="M74 252 H132 L124 318 H82Z" fill={C.spark} />
        <path d="M78 270 H128" strokeWidth={2.5} opacity={0.4} />
      </g>
      {/* laptop */}
      <g {...line}>
        <rect x={156} y={168} width={192} height={132} rx={12} fill={C.ink} />
        <rect x={168} y={180} width={168} height={108} rx={6} fill={C.signal} />
        <path d="M130 300 H374 L360 318 H144Z" fill={C.cream} />
        <path d="M228 308 H276" strokeWidth={2.5} opacity={0.4} />
      </g>
      <g stroke={C.ink} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
        <rect x={184} y={250} width={16} height={24} rx={2} fill={C.white} />
        <rect x={208} y={232} width={16} height={42} rx={2} fill={C.white} />
        <rect x={232} y={242} width={16} height={32} rx={2} fill={C.white} />
        <rect x={256} y={218} width={16} height={56} rx={2} fill={C.spark} />
        <path
          d="M184 222 L214 206 L240 214 L276 196 L316 204"
          fill="none"
          stroke={C.white}
          strokeWidth={3}
        />
        <circle cx={316} cy={204} r={5} fill={C.spark} />
        <rect x={292} y={236} width={32} height={8} rx={2} fill={C.white} opacity={0.8} />
        <rect x={292} y={252} width={24} height={8} rx={2} fill={C.white} opacity={0.6} />
      </g>
      {/* mug */}
      <g {...line}>
        <path d="M414 266 h8 a12 12 0 0 1 0 24 h-8" fill="none" strokeWidth={6} />
        <path
          d="M372 256 H414 V304 A14 14 0 0 1 400 318 H386 A14 14 0 0 1 372 304Z"
          fill={C.create}
        />
      </g>
      <g stroke={C.ink} strokeWidth={2.5} strokeLinecap="round" fill="none" opacity={0.5}>
        <path d="M386 244 c-6 -8 6 -12 0 -22M400 244 c-6 -8 6 -12 0 -22" />
      </g>
      {/* floating: AI bubble, gear, rocket, note, sparkles */}
      <g className="art-float" {...line}>
        <path
          d="M196 70 h72 a12 12 0 0 1 12 12 v30 a12 12 0 0 1 -12 12 h-40 l-16 14 v-14 h-16 a12 12 0 0 1 -12 -12 v-30 a12 12 0 0 1 12 -12z"
          fill={C.build}
        />
        <text
          x={232}
          y={108}
          textAnchor="middle"
          fontSize={26}
          fontWeight={700}
          fill={C.ink}
          stroke="none"
          style={{ fontFamily: 'var(--font-sans)', letterSpacing: '-0.02em' }}
        >
          AI
        </text>
      </g>
      <g className="art-float art-float-slow" {...line}>
        <circle cx={96} cy={112} r={26} fill={C.idea} />
        <circle cx={96} cy={112} r={9} fill={C.white} />
        {[0, 45, 90, 135, 180, 225, 270, 315].map((a) => (
          <rect
            key={a}
            x={91}
            y={78}
            width={10}
            height={12}
            rx={2}
            fill={C.idea}
            transform={`rotate(${a} 96 112)`}
          />
        ))}
      </g>
      <g className="art-float" transform="rotate(35 392 98)" {...line}>
        <path d="M384 134 C384 150 392 158 392 158 C392 158 400 150 400 134Z" fill={C.spark} />
        <path d="M376 106 L362 132 H378Z" fill={C.create} />
        <path d="M408 106 L422 132 H406Z" fill={C.create} />
        <path d="M392 50 C410 66 414 96 408 128 H376 C370 96 374 66 392 50Z" fill={C.white} />
        <circle cx={392} cy={92} r={9} fill={C.signal} />
      </g>
      <g className="art-float art-float-slow">
        <Note x={316} y={40} fill={C.create} />
      </g>
      <Sparkle x={150} y={40} fill={C.spark} r={10} />
      <Sparkle x={446} y={210} fill={C.build} r={8} />
      <Sparkle x={40} y={190} fill={C.create} r={6} />
    </svg>
  );
}
