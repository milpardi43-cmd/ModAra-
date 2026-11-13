export type HeroMode = 'cinematic' | 'scroll' | 'deck';

export const HERO_MODES: { id: HeroMode; label: string }[] = [
  { id: 'cinematic', label: 'باند سینمایی' },
  { id: 'scroll', label: 'سینمای اسکرول' },
  { id: 'deck', label: 'دک سه‌بعدی' },
];

export const isHeroMode = (value: string | null): value is HeroMode =>
  value === 'cinematic' || value === 'scroll' || value === 'deck';
