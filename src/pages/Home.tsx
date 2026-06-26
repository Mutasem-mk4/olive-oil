// ============================================================
// Home — Hero Landing Page
// ============================================================
// Stunning hero with gradient mesh, animated olive branch,
// feature cards, and market statistics.
// ============================================================

import { Link } from 'react-router-dom';
import { motion, type Variants } from 'framer-motion';
import { QRCodeSVG } from 'qrcode.react';
import OliveLogo from '@/components/shared/OliveLogo';

const container: Variants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.15 } },
};

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 30 },
  show: { opacity: 1, y: 0, transition: { duration: 0.6, ease: 'easeOut' } },
};

const FEATURES = [
  {
    icon: '🤖',
    title: 'Azure Custom Vision',
    titleAr: 'رؤية أزور المخصصة',
    desc: 'AI-powered spectral analysis detects adulteration patterns invisible to the naked eye.',
  },
  {
    icon: '⚡',
    title: 'Instant Results',
    titleAr: 'نتائج فورية',
    desc: 'Get a purity score in under 10 seconds. No lab equipment required — just your smartphone.',
  },
  {
    icon: '📜',
    title: 'Digital Certificate',
    titleAr: 'شهادة رقمية',
    desc: 'Blockchain-ready QR-verified certificates for every sample analyzed. Tamper-proof authenticity.',
  },
];

const STATS = [
  { value: '70%', label: 'Production Decline', labelAr: 'انخفاض الإنتاج', desc: 'Palestinian olive oil output since 2000' },
  { value: '$850M', label: 'Market Value', labelAr: 'قيمة السوق', desc: 'Jordan & Palestine olive oil market' },
  { value: '75,000', label: 'Farmers', labelAr: 'مزارع', desc: 'Families depending on olive cultivation' },
];

export default function Home() {
  return (
    <div className="min-h-screen">
      {/* ── Hero Section ──────────────────────────────────── */}
      <section className="relative overflow-hidden gradient-mesh">
        {/* Decorative gradient orbs */}
        <div className="absolute top-20 -left-32 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
        <div className="absolute bottom-10 -right-32 w-80 h-80 bg-accent/8 rounded-full blur-3xl" />

        <motion.div
          variants={container}
          initial="hidden"
          animate="show"
          className="relative max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-16 sm:pt-24 pb-20 sm:pb-32 text-center"
        >
          {/* Animated Logo */}
          <motion.div variants={fadeUp} className="mb-8">
            <OliveLogo size={80} className="mx-auto" />
          </motion.div>

          {/* Headline */}
          <motion.h1
            variants={fadeUp}
            className="font-display text-5xl sm:text-7xl lg:text-8xl font-bold text-primary leading-tight mb-4"
          >
            Zaytoun Vision
          </motion.h1>

          {/* Arabic subtitle */}
          <motion.p
            variants={fadeUp}
            className="font-arabic text-2xl sm:text-3xl text-primary/60 mb-6"
          >
            زيتون فيجن — رؤية الزيتون
          </motion.p>

          {/* Tagline */}
          <motion.p
            variants={fadeUp}
            className="text-lg sm:text-xl text-dark/60 max-w-xl mx-auto mb-10 leading-relaxed"
          >
            AI-Powered Olive Oil Purity Testing
          </motion.p>

          {/* CTA Buttons */}
          <motion.div variants={fadeUp} className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Link
              to="/capture"
              className="inline-flex items-center gap-2 px-8 py-3.5 rounded-xl gradient-olive text-white font-semibold text-base shadow-lg hover:shadow-xl transition-all hover:scale-105 active:scale-95"
            >
              <span className="text-xl">🔬</span>
              Start Demo
            </Link>
            <a
              href="#features"
              className="inline-flex items-center gap-2 px-8 py-3.5 rounded-xl border-2 border-primary/20 text-primary font-semibold text-base hover:bg-primary/5 transition-all hover:scale-105 active:scale-95"
            >
              Learn More
              <span className="text-sm">↓</span>
            </a>
          </motion.div>

          {/* QR Code */}
          <motion.div
            variants={fadeUp}
            className="mt-12 inline-flex flex-col items-center gap-2"
          >
            <div className="glass rounded-2xl p-4">
              <QRCodeSVG
                value={typeof window !== 'undefined' ? window.location.origin : 'https://zaytoun.vision'}
                size={100}
                bgColor="transparent"
                fgColor="#2D5016"
                level="M"
              />
            </div>
            <span className="text-xs text-dark/40">
              Scan to open / <span className="font-arabic">امسح للفتح</span>
            </span>
          </motion.div>
        </motion.div>
      </section>

      {/* ── Features Section ──────────────────────────────── */}
      <section id="features" className="py-20 sm:py-28 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-center mb-16"
          >
            <h2 className="font-display text-3xl sm:text-4xl font-bold text-dark mb-3">
              How It Works
            </h2>
            <p className="font-arabic text-lg text-dark/40">كيف يعمل</p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8">
            {FEATURES.map((feature, index) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.15, duration: 0.6 }}
                whileHover={{ y: -5, scale: 1.02 }}
                className="glass rounded-2xl p-6 sm:p-8 text-center group cursor-default"
              >
                <motion.span
                  whileHover={{ scale: 1.2, rotate: 10 }}
                  className="text-4xl sm:text-5xl block mb-5"
                >
                  {feature.icon}
                </motion.span>
                <h3 className="font-display text-xl font-bold text-dark mb-2">
                  {feature.title}
                </h3>
                <p className="font-arabic text-sm text-accent mb-3">
                  {feature.titleAr}
                </p>
                <p className="text-sm text-dark/60 leading-relaxed">
                  {feature.desc}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Stats Section ─────────────────────────────────── */}
      <section className="py-20 gradient-mesh">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-center mb-16"
          >
            <h2 className="font-display text-3xl sm:text-4xl font-bold text-dark mb-3">
              The Market Opportunity
            </h2>
            <p className="font-arabic text-lg text-dark/40">فرصة السوق</p>
          </motion.div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 sm:gap-8">
            {STATS.map((stat, index) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, scale: 0.9 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.15, type: 'spring', stiffness: 200 }}
                className="glass rounded-2xl p-8 text-center"
              >
                <motion.p
                  className="font-display text-4xl sm:text-5xl font-bold text-primary mb-3"
                  whileHover={{ scale: 1.05 }}
                >
                  {stat.value}
                </motion.p>
                <p className="text-base font-semibold text-dark mb-1">{stat.label}</p>
                <p className="font-arabic text-sm text-accent mb-2">{stat.labelAr}</p>
                <p className="text-xs text-dark/50">{stat.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Footer CTA ────────────────────────────────────── */}
      <section className="py-16 text-center px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
        >
          <p className="text-dark/40 text-sm mb-2">
            Built with ❤️ for the Azure AI Hackathon
          </p>
          <p className="font-arabic text-dark/30 text-xs">
            صُنع بحب لهاكاثون أزور للذكاء الاصطناعي
          </p>
        </motion.div>
      </section>
    </div>
  );
}
