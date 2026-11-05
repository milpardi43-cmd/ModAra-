import { motion, useReducedMotion } from 'framer-motion';
import type { ReactNode } from 'react';
import BrandSignature from '../BrandSignature';

const EASE: [number, number, number, number] = [0.22, 1, 0.36, 1];

/** Soft, one-time rise-in reveal used across the home sections. */
export function Reveal({
  children,
  delay = 0,
  className,
}: {
  children: ReactNode;
  delay?: number;
  className?: string;
}) {
  const prefersReducedMotion = useReducedMotion();

  return (
    <motion.div
      initial={prefersReducedMotion ? false : { opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-48px' }}
      transition={{ duration: prefersReducedMotion ? 0.01 : 0.65, delay: prefersReducedMotion ? 0 : delay, ease: EASE }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

type SectionHeadingProps = {
  eyebrow: string;
  eyebrowEn: string;
  title: string;
  description?: string;
  dark?: boolean;
  action?: ReactNode;
};

/** Consistent luxury section header: gold eyebrow + Latin micro-label + title. */
export default function SectionHeading({
  eyebrow,
  eyebrowEn,
  title,
  description,
  dark = false,
  action,
}: SectionHeadingProps) {
  return (
    <Reveal>
      <div className="mb-8 flex flex-wrap items-end justify-between gap-x-8 gap-y-5 sm:mb-10">
        <div className="max-w-2xl">
          <BrandSignature
            inline
            label={eyebrowEn}
            text={eyebrow}
            highlight=""
            tone={dark ? 'light' : 'dark'}
            size="compact"
            className="mb-3"
          />
          <h2
            className={`mt-3 text-3xl font-extrabold leading-tight sm:text-4xl ${
              dark ? 'text-[#f7f1e5]' : 'text-[#211a12]'
            }`}
          >
            {title}
          </h2>
          {description && (
            <p className={`mt-3 leading-8 ${dark ? 'text-white/60' : 'text-dark-500'}`}>
              {description}
            </p>
          )}
        </div>
        {action && <div className="shrink-0">{action}</div>}
      </div>
    </Reveal>
  );
}
