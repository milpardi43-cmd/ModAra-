import { useState } from 'react';
import { Check, ChevronDown, Clapperboard, Film, Layers, ScrollText } from 'lucide-react';

import { HERO_MODES, type HeroMode } from '../lib/heroModes';

const MODE_ICONS: Record<HeroMode, typeof Clapperboard> = {
  cinema: Film,
  cinematic: Clapperboard,
  scroll: ScrollText,
  deck: Layers,
};

type HeroModeSwitchProps = {
  mode: HeroMode;
  onChange: (mode: HeroMode) => void;
};

/** Small floating pill that lets us audition hero experiences side by side. */
export default function HeroModeSwitch({ mode, onChange }: HeroModeSwitchProps) {
  const [open, setOpen] = useState(false);
  const CurrentIcon = MODE_ICONS[mode];
  const current = HERO_MODES.find((entry) => entry.id === mode) ?? HERO_MODES[0];

  return (
    <div className="fixed right-3 top-3 z-40" dir="rtl">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-haspopup="menu"
        className="flex items-center gap-1.5 rounded-full border border-[#e0d6c2] bg-white/75 px-3 py-1.5 text-[11px] font-semibold text-[#6b6152] shadow-[0_6px_18px_-12px_rgba(46,34,19,0.5)] backdrop-blur-md transition-colors hover:bg-white"
      >
        <CurrentIcon className="h-3.5 w-3.5 text-[#9b7948]" aria-hidden="true" />
        {current.label}
        <ChevronDown className={`h-3 w-3 transition-transform ${open ? 'rotate-180' : ''}`} aria-hidden="true" />
      </button>
      {open && (
        <div
          role="menu"
          className="mt-1.5 w-44 overflow-hidden rounded-2xl border border-[#e6ddc9] bg-white/90 shadow-[0_18px_40px_-24px_rgba(46,34,19,0.45)] backdrop-blur-md"
        >
          <p className="border-b border-[#efe7d6] px-3 py-2 text-[10px] font-bold tracking-[0.14em] text-[#9a835f]">
            حالت نمایش هیرو
          </p>
          {HERO_MODES.map((entry) => {
            const Icon = MODE_ICONS[entry.id];
            const isSelected = entry.id === mode;
            return (
              <button
                key={entry.id}
                type="button"
                role="menuitemradio"
                aria-checked={isSelected}
                onClick={() => {
                  onChange(entry.id);
                  setOpen(false);
                }}
                className={`flex w-full items-center gap-2 px-3 py-2 text-right text-[11px] font-semibold transition-colors ${
                  isSelected ? 'bg-[#f7efdd] text-[#7d6636]' : 'text-[#6b6152] hover:bg-[#faf6ec]'
                }`}
              >
                <Icon className="h-3.5 w-3.5 text-[#9b7948]" aria-hidden="true" />
                <span className="flex-1">{entry.label}</span>
                {isSelected && <Check className="h-3.5 w-3.5" aria-hidden="true" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
