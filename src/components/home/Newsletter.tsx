import { useState, type FormEvent } from 'react';
import { CheckCircle2, Send } from 'lucide-react';
import BrandSignature from '../BrandSignature';
import { Reveal } from './SectionHeading';

const STORAGE_KEY = 'modara-newsletter-emails';
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type Status = 'idle' | 'error' | 'joined' | 'already';

/** Modara Club newsletter panel (stored locally in the demo backend). */
export default function Newsletter() {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<Status>('idle');

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    const value = email.trim().toLowerCase();
    if (!EMAIL_RE.test(value)) {
      setStatus('error');
      return;
    }
    try {
      const stored = JSON.parse(window.localStorage.getItem(STORAGE_KEY) || '[]') as string[];
      if (stored.includes(value)) {
        setStatus('already');
        return;
      }
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify([...stored, value]));
    } catch {
      // Storage may be unavailable; the signup still confirms for the session.
    }
    setStatus('joined');
    setEmail('');
  };

  const done = status === 'joined' || status === 'already';

  return (
    <section className="mx-auto max-w-7xl px-4 pb-6 pt-8 sm:px-6 sm:pt-12 lg:px-8" dir="rtl">
      <Reveal>
        <div className="relative isolate grid overflow-hidden rounded-[2.5rem] border border-gold-300/20 bg-[#171208] text-white shadow-[0_34px_90px_-46px_rgba(34,23,9,0.78)] lg:grid-cols-[0.92fr_1.08fr]">
          <div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_88%_0%,rgba(217,173,84,0.19),transparent_38%),radial-gradient(ellipse_at_5%_100%,rgba(156,100,34,0.18),transparent_42%)]" />
          <div aria-hidden="true" className="pointer-events-none absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-gold-300/70 to-transparent" />
          <div aria-hidden="true" className="pointer-events-none absolute -bottom-16 -left-16 h-72 w-72 rounded-full border border-gold-300/10" />
          <div aria-hidden="true" className="pointer-events-none absolute -bottom-10 -left-10 h-52 w-52 rounded-full border border-gold-300/[0.07]" />

          <div className="relative flex flex-col justify-center p-6 sm:p-10 lg:p-12">
            <BrandSignature
              inline
              label="MODARA CLUB"
              text="خبرهای خوب،"
              highlight="پیش از همه"
              className="mb-6"
            />
            <h2 className="max-w-xl text-3xl font-extrabold leading-[1.25] text-balance sm:text-4xl lg:text-[2.65rem]">
              اولین نفر باشید که از کالکشن جدید باخبر می‌شود
            </h2>
            <p className="mt-5 max-w-xl leading-8 text-white/65">
              عضو باشگاه شوید تا پیشنهادهای ویژهٔ اعضا و تازه‌ترین قطعه‌های هر فصل، زودتر از همه به
              دست شما برسد.
            </p>
            <p dir="ltr" aria-hidden="true" className="mt-8 select-none font-display text-[10px] font-semibold tracking-[0.35em] text-gold-100/30">
              MODARA CLUB <span className="text-gold-300/60">·</span> PRIVATE NOTES
            </p>
          </div>

          <div className="relative flex items-center p-4 sm:p-8 lg:p-10">
            <div className="w-full rounded-[2rem] border border-white/10 bg-white/[0.055] p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.07),0_24px_55px_-38px_rgba(0,0,0,0.8)] backdrop-blur-sm sm:p-7">
              {done ? (
                <div
                  role="status"
                  className="flex min-h-[230px] flex-col items-center justify-center rounded-[1.5rem] border border-gold-300/25 bg-gold-300/[0.07] px-5 py-7 text-center"
                >
                  <CheckCircle2 className="h-10 w-10 text-gold-300" />
                  <p className="mt-4 text-lg font-extrabold">
                    {status === 'joined'
                      ? 'به باشگاه مشتریان مُدارا خوش آمدید'
                      : 'شما قبلاً عضو باشگاه مُدارا شده‌اید'}
                  </p>
                  <p className="mt-3 max-w-md text-sm leading-7 text-white/60">
                    منتظر خبرهای خوب باشید؛ کالکشن‌های جدید و پیشنهادهای ویژهٔ اعضا را اول برای شما
                    می‌فرستیم.
                  </p>
                </div>
              ) : (
                <form onSubmit={handleSubmit} noValidate>
                  <label htmlFor="newsletter-email" className="mb-3 block text-sm font-bold text-white/85">
                    ایمیل شما
                  </label>
                  <div
                    className={`flex flex-col gap-2 rounded-[1.4rem] border bg-black/15 p-2 transition-colors sm:flex-row sm:items-center ${
                      status === 'error' ? 'border-red-400/60' : 'border-white/15 focus-within:border-gold-400/60'
                    }`}
                  >
                    <input
                      id="newsletter-email"
                      type="email"
                      dir="ltr"
                      autoComplete="email"
                      placeholder="you@email.com"
                      value={email}
                      onChange={(event) => {
                        setEmail(event.target.value);
                        if (status === 'error') setStatus('idle');
                      }}
                      className="min-w-0 flex-1 rounded-xl bg-transparent px-4 py-3 text-left text-[15px] text-white outline-none placeholder:text-white/35"
                    />
                    <button
                      type="submit"
                      className="group inline-flex shrink-0 items-center justify-center gap-2.5 rounded-xl bg-gradient-to-l from-gold-300 via-gold-500 to-gold-600 px-5 py-3.5 text-sm font-extrabold text-[#171208] shadow-[0_12px_28px_-14px_rgba(192,145,63,0.7)] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_18px_34px_-12px_rgba(192,145,63,0.8)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-300 active:scale-[0.98] sm:px-6"
                    >
                      عضویت در باشگاه
                      <Send className="h-4 w-4 -scale-x-100 transition-transform duration-300 group-hover:-translate-x-0.5" />
                    </button>
                  </div>
                  {status === 'error' && (
                    <p role="alert" className="mt-3 text-sm font-semibold text-red-300">
                      لطفاً یک ایمیل معتبر وارد کنید.
                    </p>
                  )}
                  <p className="mt-4 text-xs leading-6 text-white/45">
                    بدون اسپم؛ فقط کالکشن‌های جدید و پیشنهادهای ویژهٔ اعضا. هر زمان خواستید لغو عضویت
                    کنید.
                  </p>
                </form>
              )}
            </div>
          </div>
        </div>
      </Reveal>
    </section>
  );
}
