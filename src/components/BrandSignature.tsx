type BrandSignatureProps = {
  /** Placement and surrounding spacing. Omit `inline` to float over artwork. */
  className?: string;
  inline?: boolean;
  /** Section-specific copy; falls back to the core brand slogan on posters. */
  label?: string;
  text?: string;
  highlight?: string;
  tone?: 'light' | 'dark';
  size?: 'standard' | 'compact';
};

/** Shared frameless Modara signature used across editorial posters and section headings. */
export default function BrandSignature({
  className = '',
  inline = false,
  label = 'MODARA SIGNATURE',
  text = 'مُدارا؛ انتخابی',
  highlight = 'برای ماندن',
  tone = 'light',
  size = 'standard',
}: BrandSignatureProps) {
  const placement = inline ? '' : 'absolute z-20';
  const isLight = tone === 'light';
  const labelColor = isLight ? 'text-[#e9ca7b]' : 'text-gold-700';
  const textColor = isLight ? 'text-white' : 'text-[#211a12]';
  const labelShadow = isLight ? 'drop-shadow-[0_1px_8px_rgba(0,0,0,0.8)]' : '';
  const textShadow = isLight ? 'drop-shadow-[0_2px_10px_rgba(0,0,0,0.8)]' : '';
  const labelSize = size === 'compact' ? 'text-[8px] sm:text-[9px]' : 'text-[9px] sm:text-[10px]';
  const textSize = size === 'compact' ? 'text-[12px] sm:text-[14px]' : 'text-[14px] sm:text-[17px] lg:text-[20px]';
  const ruleColor = isLight ? 'from-[#f2d68d]' : 'from-gold-600';

  return (
    <div
      dir="rtl"
      className={`brand-signature ${placement} w-fit max-w-[calc(100%-2.5rem)] text-right ${textColor} ${className}`}
    >
      <span
        dir="ltr"
        className={`mb-1.5 flex items-center gap-2 font-semibold tracking-[0.3em] ${labelSize} ${labelColor} ${labelShadow}`}
      >
        <span aria-hidden="true" className={`h-px w-7 bg-gradient-to-r from-transparent to-current`} />
        {label}
      </span>
      <p className={`whitespace-nowrap font-extrabold leading-8 tracking-tight ${textSize} ${textShadow}`}>
        {text}{highlight ? <> <span className={isLight ? 'brand-signature-highlight' : 'brand-signature-highlight-on-light'}>{highlight}</span></> : null}
      </p>
      <span aria-hidden="true" className={`brand-signature-rule mt-1 block h-px w-12 bg-gradient-to-l ${ruleColor} to-transparent`} />
    </div>
  );
}
