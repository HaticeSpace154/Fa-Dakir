import React, { useState } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { ArrowDownLeft, ArrowLeft, BookOpen, Bookmark, CalendarDays, Download, Smartphone, Tablet } from 'lucide-react';
import BackgroundBeams from '../components/ui/BackgroundBeams';
import MovingBorderLink from '../components/ui/MovingBorderLink';
import './Landing.css';

const features = [
  { icon: BookOpen, title: 'مصحفٌ واضح', description: 'اقرأ بسبع روايات مع وضع النص أو صفحات المصحف.' },
  { icon: Bookmark, title: 'احفظ موضعك', description: 'ارجع إلى آخر صفحة أو علامة حفظتها بسهولة.' },
  { icon: CalendarDays, title: 'تابع ختمتك', description: 'خطّط وردك وتابع تقدمك يومًا بعد يوم.' },
];

export default function Landing() {
  const [device, setDevice] = useState('tablet');
  const reduceMotion = useReducedMotion();
  const reveal = reduceMotion ? {} : { initial: { opacity: 0, y: 34 }, whileInView: { opacity: 1, y: 0 }, viewport: { once: true, amount: 0.18 }, transition: { duration: 0.75, ease: [0.22, 1, 0.36, 1] } };
  const titleReveal = reduceMotion ? {} : { initial: 'hidden', animate: 'visible', variants: { hidden: {}, visible: { transition: { staggerChildren: 0.16, delayChildren: 0.16 } } } };
  const titleWord = reduceMotion ? {} : { variants: { hidden: { opacity: 0, y: 25, filter: 'blur(8px)' }, visible: { opacity: 1, y: 0, filter: 'blur(0px)', transition: { duration: 0.75, ease: [0.22, 1, 0.36, 1] } } } };

  return (
    <main className="landing-page" dir="rtl">
      <BackgroundBeams />
      <nav className="landing-nav" aria-label="التنقل الرئيسي">
        <a className="landing-brand" href="/" aria-label="تلاوة وختم، الرئيسية">
          <img src="/branding/splash-mark.png" alt="" />
          <span>تلاوة و ختم</span>
        </a>
        <a className="landing-nav-reader" href="/reader">افتح القارئ <ArrowLeft size={15} /></a>
      </nav>

      <section className="landing-hero">
        <motion.div className="landing-copy" {...reveal}>
          <span className="landing-eyebrow"><span className="landing-live-dot" /> تلاوةٌ أقرب، وختمةٌ أوضح</span>
          <motion.h1 {...titleReveal}><motion.span {...titleWord}>افتح المصحف،</motion.span><br /><motion.span {...titleWord}><em>وتابع رحلتك.</em></motion.span></motion.h1>
          <p>تجربة هادئة لقراءة القرآن بسبع روايات، وحفظ موضعك، وتنظيم وردك اليومي.</p>
          <div className="landing-actions">
            <MovingBorderLink className="landing-cta landing-cta-web" href="/reader"><BookOpen size={19} /><span>اقرأ على الويب</span><ArrowLeft size={17} /></MovingBorderLink>
            <a className="landing-cta landing-cta-download" href="https://github.com/HaticeSpace154/Fa-Dakir/releases/download/v.1.0.1/fa-dakir.apk" download><Download size={19} /><span>حمّل تطبيق أندرويد</span><small>APK</small></a>
          </div>
          <a className="landing-scroll-hint" href="#try-reader"><span>جرّب المصحف بالأسفل</span><ArrowDownLeft size={15} /></a>
        </motion.div>

        <motion.div className="landing-brand-art" {...reveal} transition={reduceMotion ? {} : { ...reveal.transition, delay: 0.12 }} whileHover={reduceMotion ? undefined : { rotateX: -2.5, rotateY: 3.5, scale: 1.012 }} style={{ transformPerspective: 1000 }}>
          <div className="landing-art-orbit landing-art-orbit-a" />
          <div className="landing-art-orbit landing-art-orbit-b" />
          <div className="landing-art-halo" />
          <img src="/branding/splash-mark.png" alt="تلاوة وختم" />
          <div className="landing-art-caption"><BookOpen size={16} /><span>وِردٌ يطمئنُّ به القلب</span><b>٧ روايات</b></div>
        </motion.div>
      </section>

      <motion.section id="try-reader" className="landing-preview-section" {...reveal} aria-labelledby="landing-preview-title">
        <div className="landing-preview-heading">
          <div>
            <span className="landing-section-kicker">اقرأ قبل أن تبدأ</span>
            <h2 id="landing-preview-title">مصحفك، في متناول يدك</h2>
            <p>مرّر داخل المعاينة لقراءة الصفحات، أو بدّل حجم الجهاز لتشاهد التجربة كما تناسبك.</p>
          </div>
          <div className="landing-device-switch" role="tablist" aria-label="حجم معاينة المصحف">
            <button type="button" role="tab" aria-selected={device === 'tablet'} className={device === 'tablet' ? 'is-active' : ''} onClick={() => setDevice('tablet')}><Tablet size={16} /> لوحي</button>
            <button type="button" role="tab" aria-selected={device === 'phone'} className={device === 'phone' ? 'is-active' : ''} onClick={() => setDevice('phone')}><Smartphone size={15} /> هاتف</button>
          </div>
        </div>

        <div className="landing-preview-stage">
          <motion.div layout className={`landing-device-shell is-${device}`} transition={reduceMotion ? { duration: 0 } : { type: 'spring', stiffness: 145, damping: 22 }}>
            <div className="landing-device-camera" />
            <iframe
              className="landing-reader-iframe"
              src="/reader?landingPreview=1"
              title={`معاينة مصحف تلاوة وختم على جهاز ${device === 'tablet' ? 'لوحي' : 'هاتف'}`}
              loading="lazy"
              allow="fullscreen"
            />
          </motion.div>
          <div className="landing-preview-note"><span className="landing-live-dot" /> معاينة حيّة من القارئ · جرّب التمرير داخل الشاشة</div>
        </div>
      </motion.section>

      <motion.section className="landing-feature-section" {...reveal} aria-label="مميزات التطبيق">
        {features.map(({ icon: Icon, title, description }, index) => (
          <motion.article className="landing-feature-card" key={title} whileHover={reduceMotion ? undefined : { y: -5, rotate: index === 1 ? 0.35 : -0.35 }} transition={{ type: 'spring', stiffness: 260, damping: 20 }}>
            <span className="landing-feature-icon"><Icon size={19} /></span>
            <div><h3>{title}</h3><p>{description}</p></div>
            <ArrowLeft className="landing-feature-arrow" size={16} />
          </motion.article>
        ))}
      </motion.section>

      <footer className="landing-footer">
        <span>تلاوة و ختم | Fa-dakir</span>
        <div className="landing-footer-actions"><a href="/privacy-policy.html">الخصوصية</a><a href="/terms-of-service.html">شروط الاستخدام</a></div>
      </footer>
    </main>
  );
}
