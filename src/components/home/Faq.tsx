import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Phone, Plus } from 'lucide-react';
import SectionHeading, { Reveal } from './SectionHeading';

const EASE: [number, number, number, number] = [0.22, 1, 0.36, 1];

const faqs = [
  {
    q: 'هزینه و زمان ارسال سفارش چگونه است؟',
    a: 'ارسال برای سفارش‌های بالای ۵۰۰ هزار تومان رایگان است. پس از ثبت سفارش، کد پیگیری برای شما صادر می‌شود و زمان تحویل بر اساس شهر مقصد در حساب کاربری‌تان قابل مشاهده است.',
  },
  {
    q: 'شرایط بازگشت یا تعویض کالا چیست؟',
    a: 'تا ۷ روز پس از تحویل می‌توانید کالا را بازگردانید؛ کافی است از طریق حساب کاربری یا پشتیبانی با ما در تماس باشید تا روند بازگشت بدون دردسر انجام شود.',
  },
  {
    q: 'آیا محصولات مُدارا اصل هستند؟',
    a: 'بله؛ تمام محصولات مُدارا اصل و دارای ضمانت اصالت هستند و پیش از ارسال، کیفیت هر قطعه بررسی می‌شود.',
  },
  {
    q: 'پرداخت در مُدارا چطور انجام می‌شود؟',
    a: 'پرداخت به‌صورت آنلاین و امن از طریق درگاه‌های بانکی معتبر انجام می‌شود و پس از پرداخت موفق، فاکتور خرید برای شما صادر خواهد شد.',
  },
  {
    q: 'چطور سفارشم را پیگیری کنم؟',
    a: 'از بخش «حساب کاربری» می‌توانید وضعیت و کد پیگیری همهٔ سفارش‌هایتان را ببینید؛ تاریخچهٔ کامل خریدها هم همان‌جا در دسترس است.',
  },
  {
    q: 'عضویت در مُدارا چه مزیتی دارد؟',
    a: 'با ثبت‌نام در مُدارا از تخفیف‌های ویژهٔ اعضا، پیشنهادهای اختصاصی هر فصل و اطلاع‌رسانی زودهنگام کالکشن‌های جدید بهره‌مند می‌شوید.',
  },
];

/** Accordion FAQ section (the footer link finally has a home). */
export default function Faq() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <section id="faq" className="mx-auto max-w-7xl scroll-mt-24 px-4 py-14 sm:px-6 sm:py-20 lg:px-8" dir="rtl">
      <div className="grid gap-10 lg:grid-cols-[0.85fr_1.15fr] lg:gap-16">
        {/* Intro + support card */}
        <div>
          <SectionHeading
            eyebrow="پرسش‌های شما"
            eyebrowEn="FREQUENTLY ASKED"
            title="سؤالات متداول"
            description="پاسخ رایج‌ترین پرسش‌ها دربارهٔ خرید از مُدارا را اینجا پیدا می‌کنید."
          />
          <Reveal delay={0.1}>
            <div className="-mt-2 relative isolate overflow-hidden rounded-[2rem] border border-gold-300/20 bg-[#1b1711] p-6 text-white shadow-[0_24px_60px_-38px_rgba(37,25,10,0.6)] sm:p-7">
              <div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_0%_0%,rgba(218,174,83,0.18),transparent_45%)]" />
              <div className="relative">
              <p className="font-bold text-white">جوابتان را پیدا نکردید؟</p>
              <p className="mt-2 text-sm leading-7 text-white/65">
                تیم پشتیبانی مُدارا پاسخ‌گوی شماست؛ یا از حباب گفت‌وگوی آنلاین پایین صفحه پیام
                بگذارید، یا با ما تماس بگیرید.
              </p>
              <a
                href="tel:+982112345678"
                className="group mt-5 inline-flex items-center gap-3 rounded-full bg-gradient-to-l from-gold-300 to-gold-500 py-2 pe-2 ps-6 text-sm font-bold text-[#171208] shadow-[0_12px_28px_-14px_rgba(218,174,83,0.65)] transition-all duration-300 hover:-translate-y-0.5 hover:to-gold-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white active:scale-[0.97]"
              >
                <span dir="ltr" className="tracking-wide">۰۲۱-۱۲۳۴۵۶۷۸</span>
                <span aria-hidden="true" className="flex h-9 w-9 items-center justify-center rounded-full bg-gold-500 text-[#171208]">
                  <Phone className="h-4 w-4" />
                </span>
              </a>
              </div>
            </div>
          </Reveal>
        </div>

        {/* Accordion */}
        <Reveal delay={0.08}>
          <div className="overflow-hidden rounded-[2rem] border border-dark-100 bg-white shadow-[0_24px_60px_-44px_rgba(45,33,18,0.35)]">
            {faqs.map((faq, i) => {
              const open = openIndex === i;
              return (
                <div key={faq.q} className={i > 0 ? 'border-t border-dark-100' : ''}>
                  <button
                    type="button"
                    onClick={() => setOpenIndex(open ? null : i)}
                    aria-expanded={open}
                    className="group flex w-full items-center justify-between gap-4 px-5 py-4 text-right transition-colors hover:bg-gold-50/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-gold-500 sm:px-7 sm:py-5"
                  >
                    <span className="flex min-w-0 items-center gap-3">
                      <span className={`hidden h-8 w-8 shrink-0 items-center justify-center rounded-xl text-[10px] font-bold sm:flex ${open ? 'bg-gold-500 text-white' : 'bg-dark-50 text-dark-400 group-hover:bg-gold-50 group-hover:text-gold-700'}`}>
                        {new Intl.NumberFormat('fa-IR', { minimumIntegerDigits: 2 }).format(i + 1)}
                      </span>
                      <span className={`text-[15px] font-bold sm:text-base ${open ? 'text-gold-700' : 'text-dark-900'}`}>
                        {faq.q}
                      </span>
                    </span>
                    <span
                      aria-hidden="true"
                      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full border transition-all duration-300 ${
                        open
                          ? 'rotate-45 border-gold-500 bg-gold-500 text-white'
                          : 'border-dark-200 text-dark-400'
                      }`}
                    >
                      <Plus className="h-4 w-4" />
                    </span>
                  </button>
                  <AnimatePresence initial={false}>
                    {open && (
                      <motion.div
                        key="content"
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.45, ease: EASE }}
                        className="overflow-hidden"
                      >
                        <p className="px-6 pb-6 leading-8 text-dark-500 sm:px-7">{faq.a}</p>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
          </div>
        </Reveal>
      </div>
    </section>
  );
}
