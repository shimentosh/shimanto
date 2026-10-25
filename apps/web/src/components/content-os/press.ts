/**
 * Tactile "press" surfaces for the Content OS page: a soft top highlight, a darker bottom lip and
 * a drop shadow, so buttons read like raised blocks that push in on click.
 */
export const pressDark =
  'bg-gradient-to-b from-white/[0.11] to-white/[0.03] ring-1 ring-black/40 shadow-[inset_0_1px_0_rgba(255,255,255,0.14),inset_0_-2px_0_rgba(0,0,0,0.45),0_2px_6px_rgba(0,0,0,0.4)] transition active:translate-y-px active:shadow-[inset_0_2px_4px_rgba(0,0,0,0.5)]';

export const pressBlue =
  'bg-gradient-to-b from-[#6cc0ff] via-signal to-[#1670c9] text-[#06121f] shadow-[inset_0_1px_0_rgba(255,255,255,0.55),inset_0_-3px_0_rgba(0,0,0,0.22),0_12px_32px_-10px_rgba(46,155,247,0.9)] transition hover:-translate-y-px hover:brightness-110 active:translate-y-px active:shadow-[inset_0_2px_5px_rgba(0,0,0,0.3)]';

export const pressCream =
  'bg-gradient-to-b from-[#FFFBF0] to-[#DED7C4] text-[#0E0F0C] shadow-[inset_0_1px_0_#fff,inset_0_-2px_0_rgba(0,0,0,0.18),0_6px_16px_-6px_rgba(243,239,228,0.45)]';
