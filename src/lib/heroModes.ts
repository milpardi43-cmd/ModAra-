export type HeroMode = 'cinema' | 'cinematic' | 'scroll' | 'deck';

export const HERO_MODES: { id: HeroMode; label: string }[] = [
  { id: 'cinema', label: 'شوِ سینمایی' },
  { id: 'cinematic', label: 'باند سینمایی' },
  { id: 'scroll', label: 'سینمای اسکرول' },
  { id: 'deck', label: 'رگال سه‌بعدی' },
];

export const DEFAULT_HERO_MODE: HeroMode = 'cinema';

export const isHeroMode = (value: string | null): value is HeroMode =>
  value === 'cinema' || value === 'cinematic' || value === 'scroll' || value === 'deck';
