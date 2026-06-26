// ============================================================
// Architecture — Technical Architecture Page for Judges
// ============================================================
// Architecture diagram, Azure service cards, business model
// pricing table, and market statistics.
// ============================================================

import { motion } from 'framer-motion';

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.1 } },
};

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  show: { opacity: 1, y: 0, transition: { duration: 0.6 } },
};

const AZURE_SERVICES = [
  {
    icon: '🧠',
    name: 'Azure Custom Vision',
    nameAr: 'أزور كاستم فيجن',
    desc: 'AI model trained on 1,000+ olive oil spectral images. Classifies purity levels and detects specific adulterants (soybean, hazelnut, corn oil) with 96%+ accuracy.',
  },
  {
    icon: '⚡',
    name: 'Azure Functions',
    nameAr: 'أزور فنكشنز',
    desc: 'Serverless compute orchestrating the analysis pipeline. Handles image upload, Custom Vision inference, result storage, and certificate generation — all pay-per-execution.',
  },
  {
    icon: '📦',
    name: 'Azure Blob Storage',
    nameAr: 'أزور بلوب ستوريج',
    desc: 'Stores sample images with geo-redundancy. SAS tokens for secure uploads directly from mobile devices. Lifecycle policies for GDPR compliance.',
  },
  {
    icon: '🗄️',
    name: 'Azure Cosmos DB',
    nameAr: 'أزور كوزموس دي بي',
    desc: 'NoSQL database storing analysis results, certificates, and user history. Multi-region replication for low-latency reads across Jordan, Palestine, and EU markets.',
  },
  {
    icon: '🌐',
    name: 'Azure Static Web Apps',
    nameAr: 'أزور ستاتيك ويب أبس',
    desc: 'Hosts the React frontend with global CDN, custom domain, SSL, and integrated staging environments. Automatic CI/CD from GitHub.',
  },
  {
    icon: '🤖',
    name: 'Azure OpenAI',
    nameAr: 'أزور أوبن أي آي',
    desc: 'GPT-4o generates human-readable analysis reports and recommendations in both English and Arabic. Provides contextual insights for farmers.',
  },
];

const PRICING = [
  {
    tier: 'Freemium',
    tierAr: 'مجاني',
    price: 'Free',
    priceAr: 'مجاناً',
    features: [
      '5 scans/month',
      'Basic purity score',
      'Community support',
      'Standard certificates',
    ],
    highlight: false,
  },
  {
    tier: 'B2B SaaS',
    tierAr: 'للشركات',
    price: '$49/mo',
    priceAr: '٤٩ دولار/شهر',
    features: [
      'Unlimited scans',
      'Detailed composition breakdown',
      'API access',
      'Custom branded certificates',
      'Priority support',
      'Batch processing',
    ],
    highlight: true,
  },
  {
    tier: 'B2G Enterprise',
    tierAr: 'حكومي',
    price: 'Custom',
    priceAr: 'حسب الطلب',
    features: [
      'Regulatory compliance suite',
      'Chain-of-custody tracking',
      'Integration with lab systems',
      'Dedicated account manager',
      'SLA guarantee',
      'On-premise deployment option',
    ],
    highlight: false,
  },
];

const MARKET_STATS = [
  { label: 'Palestinian olive trees', value: '10M+', labelAr: 'شجرة زيتون فلسطينية' },
  { label: 'Jordanian olive oil exports', value: '$120M', labelAr: 'صادرات زيت الزيتون الأردنية' },
  { label: 'Global adulteration rate', value: '~30%', labelAr: 'نسبة الغش العالمية' },
  { label: 'Testing cost savings', value: '90%', labelAr: 'توفير تكاليف الفحص' },
];

export default function Architecture() {
  return (
    <div className="min-h-screen gradient-mesh px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
      <div className="max-w-6xl mx-auto">
        {/* Page Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <h1 className="font-display text-3xl sm:text-4xl font-bold text-dark mb-2">
            System Architecture
          </h1>
          <p className="font-arabic text-lg text-dark/50">البنية التقنية</p>
        </motion.div>

        {/* ── Section 1: Architecture Diagram ─────────────── */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mb-16"
        >
          <h2 className="font-display text-2xl font-bold text-dark mb-2 text-center">
            Data Flow Pipeline
          </h2>
          <p className="font-arabic text-sm text-dark/40 text-center mb-8">
            خط أنابيب تدفق البيانات
          </p>

          <div className="glass rounded-2xl p-6 sm:p-10 overflow-x-auto">
            <div className="flex items-center justify-between min-w-[600px] gap-2">
              {[
                { icon: '📱', label: 'Smartphone', labelAr: 'الهاتف', color: '#2D5016' },
                { icon: '→', label: '', labelAr: '', color: 'transparent' },
                { icon: '📦', label: 'Blob Storage', labelAr: 'التخزين', color: '#C9A84C' },
                { icon: '→', label: '', labelAr: '', color: 'transparent' },
                { icon: '⚡', label: 'Functions', labelAr: 'الدوال', color: '#D4843A' },
                { icon: '→', label: '', labelAr: '', color: 'transparent' },
                { icon: '🧠', label: 'Custom Vision', labelAr: 'الرؤية', color: '#4A7C59' },
                { icon: '→', label: '', labelAr: '', color: 'transparent' },
                { icon: '🗄️', label: 'Cosmos DB', labelAr: 'قاعدة البيانات', color: '#2D5016' },
                { icon: '→', label: '', labelAr: '', color: 'transparent' },
                { icon: '📜', label: 'Certificate', labelAr: 'الشهادة', color: '#C9A84C' },
              ].map((node, i) =>
                node.label === '' ? (
                  <motion.span
                    key={i}
                    initial={{ opacity: 0 }}
                    whileInView={{ opacity: 1 }}
                    viewport={{ once: true }}
                    transition={{ delay: i * 0.1 }}
                    className="text-2xl text-accent/60 font-bold shrink-0"
                  >
                    →
                  </motion.span>
                ) : (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, scale: 0.8 }}
                    whileInView={{ opacity: 1, scale: 1 }}
                    viewport={{ once: true }}
                    transition={{ delay: i * 0.1, type: 'spring' }}
                    whileHover={{ y: -5, scale: 1.05 }}
                    className="flex flex-col items-center gap-2 shrink-0"
                  >
                    <div
                      className="w-16 h-16 rounded-2xl flex items-center justify-center text-2xl shadow-md"
                      style={{ backgroundColor: node.color + '15', border: `2px solid ${node.color}30` }}
                    >
                      {node.icon}
                    </div>
                    <span className="text-xs font-semibold text-dark text-center">{node.label}</span>
                    <span className="font-arabic text-[10px] text-dark/40">{node.labelAr}</span>
                  </motion.div>
                )
              )}
            </div>
          </div>
        </motion.section>

        {/* ── Section 2: Azure Service Cards ──────────────── */}
        <motion.section
          variants={container}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true }}
          className="mb-16"
        >
          <h2 className="font-display text-2xl font-bold text-dark mb-2 text-center">
            Azure Services Used
          </h2>
          <p className="font-arabic text-sm text-dark/40 text-center mb-8">
            خدمات أزور المستخدمة
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {AZURE_SERVICES.map((service) => (
              <motion.div
                key={service.name}
                variants={fadeUp}
                whileHover={{ y: -5, scale: 1.02 }}
                className="glass rounded-2xl p-6 group cursor-default"
              >
                <span className="text-3xl block mb-3 group-hover:scale-110 transition-transform">
                  {service.icon}
                </span>
                <h3 className="font-display text-lg font-bold text-dark mb-1">
                  {service.name}
                </h3>
                <p className="font-arabic text-sm text-accent mb-3">{service.nameAr}</p>
                <p className="text-xs text-dark/60 leading-relaxed">{service.desc}</p>
              </motion.div>
            ))}
          </div>
        </motion.section>

        {/* ── Section 3: Business Model ──────────────────── */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mb-16"
        >
          <h2 className="font-display text-2xl font-bold text-dark mb-2 text-center">
            Business Model
          </h2>
          <p className="font-arabic text-sm text-dark/40 text-center mb-8">
            نموذج العمل
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
            {PRICING.map((plan, index) => (
              <motion.div
                key={plan.tier}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.15 }}
                whileHover={{ y: -5 }}
                className={`rounded-2xl p-6 sm:p-8 ${
                  plan.highlight
                    ? 'gradient-olive text-white ring-2 ring-accent shadow-elevated'
                    : 'glass'
                }`}
              >
                <div className="text-center mb-6">
                  <h3
                    className={`font-display text-xl font-bold mb-1 ${
                      plan.highlight ? 'text-white' : 'text-dark'
                    }`}
                  >
                    {plan.tier}
                  </h3>
                  <p
                    className={`font-arabic text-sm mb-3 ${
                      plan.highlight ? 'text-white/70' : 'text-accent'
                    }`}
                  >
                    {plan.tierAr}
                  </p>
                  <p
                    className={`font-display text-3xl font-bold ${
                      plan.highlight ? 'text-accent-light' : 'text-primary'
                    }`}
                  >
                    {plan.price}
                  </p>
                  <p
                    className={`font-arabic text-sm ${
                      plan.highlight ? 'text-white/60' : 'text-dark/40'
                    }`}
                  >
                    {plan.priceAr}
                  </p>
                </div>
                <ul className="space-y-2.5">
                  {plan.features.map((f) => (
                    <li
                      key={f}
                      className={`flex items-start gap-2 text-sm ${
                        plan.highlight ? 'text-white/80' : 'text-dark/60'
                      }`}
                    >
                      <span className="shrink-0 mt-0.5">{plan.highlight ? '✦' : '•'}</span>
                      {f}
                    </li>
                  ))}
                </ul>
              </motion.div>
            ))}
          </div>
        </motion.section>

        {/* ── Section 4: Market Stats ────────────────────── */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
        >
          <h2 className="font-display text-2xl font-bold text-dark mb-2 text-center">
            Market Opportunity
          </h2>
          <p className="font-arabic text-sm text-dark/40 text-center mb-8">
            فرصة السوق — الأردن وفلسطين
          </p>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {MARKET_STATS.map((stat, index) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, scale: 0.9 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1, type: 'spring' }}
                whileHover={{ scale: 1.05 }}
                className="glass rounded-xl p-5 text-center"
              >
                <p className="font-display text-2xl sm:text-3xl font-bold text-primary mb-2">
                  {stat.value}
                </p>
                <p className="text-xs font-medium text-dark/60 mb-1">{stat.label}</p>
                <p className="font-arabic text-[10px] text-dark/40">{stat.labelAr}</p>
              </motion.div>
            ))}
          </div>
        </motion.section>
      </div>
    </div>
  );
}
