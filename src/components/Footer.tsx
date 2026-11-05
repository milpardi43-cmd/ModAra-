import type { ReactNode } from 'react';
import { Mail, Phone, MapPin, Instagram, Twitter, Facebook, Send, ArrowUpLeft } from 'lucide-react';
import ModaraLogo from './ModaraLogo';

type FooterProps = {
  onNavigate: (view: string, param?: string) => void;
};

const links = [
  { label: 'خانه', view: 'home' },
  { label: 'فروشگاه', view: 'shop' },
  { label: 'بلاگ', view: 'blog' },
];

const helpLinks = ['شرایط ارسال', 'پاسخ به پرسش‌های متداول', 'پیگیری سفارش', 'حریم خصوصی', 'بازگشت کالا'];
const socialLinks = [
  { label: 'Instagram', Icon: Instagram },
  { label: 'Twitter', Icon: Twitter },
  { label: 'Facebook', Icon: Facebook },
  { label: 'Telegram', Icon: Send },
];

export default function Footer({ onNavigate }: FooterProps) {
  return (
    <footer className="relative isolate mt-20 overflow-hidden bg-[#120f0b] text-white">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_8%_0%,rgba(215,164,71,0.15),transparent_34%),radial-gradient(ellipse_at_100%_75%,rgba(148,86,29,0.12),transparent_40%)]" aria-hidden="true" />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-gold-400/70 to-transparent" aria-hidden="true" />
      <div className="pointer-events-none absolute -bottom-44 -left-24 h-96 w-96 rounded-full border border-gold-300/[0.07]" aria-hidden="true" />

      <div className="relative z-10 mx-auto max-w-7xl px-4 py-12 sm:px-6 sm:py-16 lg:px-8">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-[1.35fr_0.75fr_0.95fr_1fr] lg:gap-5">
          <div className="rounded-[2rem] border border-white/[0.08] bg-white/[0.035] p-6 shadow-[0_24px_60px_-46px_rgba(0,0,0,0.85)] sm:col-span-2 sm:p-8 lg:col-span-1">
            <ModaraLogo tone="dark" size="footer" />
            <p className="mt-5 text-sm leading-8 text-white/60">
              فروشگاه آنلاین مُدارا، تخصصی‌ترین فروشگاه مد و فشن در ایران. جدیدترین لباس‌ها، اکسسوری‌ها و ساعت‌های لوکس با بهترین قیمت و اصالت تضمین‌شده.
            </p>
            <div className="mt-6 flex gap-2.5">
              {socialLinks.map(({ label, Icon }) => (
                <a
                  key={label}
                  href="#"
                  aria-label={label}
                  className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04] text-white/65 transition-all duration-300 hover:-translate-y-1 hover:border-gold-300/50 hover:bg-gold-400/15 hover:text-gold-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-400"
                >
                  <Icon className="h-4 w-4" />
                </a>
              ))}
            </div>
          </div>

          <FooterColumn title="دسترسی سریع">
            <ul className="space-y-2">
              {links.map((link) => (
                <li key={link.view}>
                  <button
                    onClick={() => onNavigate(link.view)}
                    className="group flex items-center gap-2 py-1 text-sm text-white/60 transition-colors hover:text-gold-200"
                  >
                    <ArrowUpLeft className="h-3.5 w-3.5 text-gold-500/60 opacity-0 transition-all group-hover:translate-x-0.5 group-hover:opacity-100" />
                    {link.label}
                  </button>
                </li>
              ))}
            </ul>
          </FooterColumn>

          <FooterColumn title="پشتیبانی">
            <ul className="space-y-2">
              {helpLinks.map((link) => (
                <li key={link}>
                  <a href="#" className="group flex items-center gap-2 py-1 text-sm text-white/60 transition-colors hover:text-gold-200">
                    <ArrowUpLeft className="h-3.5 w-3.5 text-gold-500/60 opacity-0 transition-all group-hover:translate-x-0.5 group-hover:opacity-100" />
                    {link}
                  </a>
                </li>
              ))}
            </ul>
          </FooterColumn>

          <FooterColumn title="تماس با ما">
            <ul className="space-y-4">
              <li className="flex items-center gap-3 text-sm text-white/65">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-gold-300/15 bg-gold-300/[0.07] text-gold-300"><Phone className="h-4 w-4" /></span>
                <span>۰۲۱-۱۲۳۴۵۶۷۸</span>
              </li>
              <li className="flex items-center gap-3 text-sm text-white/65">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-gold-300/15 bg-gold-300/[0.07] text-gold-300"><Mail className="h-4 w-4" /></span>
                <span dir="ltr">info@technoshop.ir</span>
              </li>
              <li className="flex items-start gap-3 text-sm leading-7 text-white/65">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-gold-300/15 bg-gold-300/[0.07] text-gold-300"><MapPin className="h-4 w-4" /></span>
                <span>تهران، خیابان ولیعصر، پلاک ۱۲۳</span>
              </li>
            </ul>
          </FooterColumn>
        </div>

        <div className="mt-8 flex flex-col gap-5 border-t border-white/10 pt-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
            <p className="text-xs text-white/45 sm:text-sm">© ۱۴۰۵ مُدارا. تمامی حقوق محفوظ است.</p>
            <button onClick={() => onNavigate('admin-login')} className="text-xs text-white/35 transition-colors hover:text-gold-300">ورود مدیریت</button>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-xs text-white/45 sm:text-sm">روش‌های پرداخت:</span>
            <div className="flex flex-wrap gap-2">
              {['شاپرک', 'زرین‌پال', 'ملت', 'سامان'].map((bank) => (
                <span key={bank} className="rounded-lg border border-white/10 bg-white/[0.04] px-3 py-1.5 text-[11px] font-medium text-white/55">{bank}</span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}

function FooterColumn({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="rounded-[2rem] border border-white/[0.06] bg-white/[0.02] p-6 sm:p-7">
      <h3 className="mb-5 flex items-center gap-3 font-bold text-white">
        <span className="h-px w-6 bg-gold-400/80" />
        {title}
      </h3>
      {children}
    </div>
  );
}
