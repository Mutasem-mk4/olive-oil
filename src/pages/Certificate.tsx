// ============================================================
// Certificate — Digital Purity Certificate Page
// ============================================================
// Visual HTML certificate with bilingual layout, QR code,
// and Zaytoun Vision branding. Not react-pdf — just styled HTML.
// ============================================================

import { useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, type Variants } from 'framer-motion';
import { QRCodeSVG } from 'qrcode.react';
import { useAnalysisStore } from '@/store/analysisStore';
import { generateCertificateId } from '@/services/demo';
import OliveLogo from '@/components/shared/OliveLogo';
import StatusBadge from '@/components/shared/StatusBadge';

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 30 },
  show: { opacity: 1, y: 0, transition: { duration: 0.6, ease: 'easeOut' } },
};

export default function Certificate() {
  const navigate = useNavigate();
  const { currentResult } = useAnalysisStore();

  const certificateId = useMemo(() => generateCertificateId(), []);

  if (!currentResult) {
    navigate('/capture', { replace: true });
    return null;
  }

  const verifyUrl = `${typeof window !== 'undefined' ? window.location.origin : 'https://zaytoun.vision'}/verify/${certificateId}`;
  const issuedDate = new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
  const issuedDateAr = new Date().toLocaleDateString('ar', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const handleDownload = () => {
    alert(
      'PDF generation would use @react-pdf/renderer in production.\n\nThe certificate data has been prepared for export.'
    );
  };

  return (
    <div className="min-h-screen gradient-mesh px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
      <div className="max-w-3xl mx-auto">
        {/* Page Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <h1 className="font-display text-3xl sm:text-4xl font-bold text-dark mb-2">
            Purity Certificate
          </h1>
          <p className="font-arabic text-lg text-dark/50">شهادة النقاء</p>
        </motion.div>

        {/* Certificate Card */}
        <motion.div
          variants={fadeUp}
          initial="hidden"
          animate="show"
          className="relative bg-white rounded-3xl shadow-elevated overflow-hidden"
        >
          {/* Gold top border */}
          <div className="h-2 gradient-gold" />

          {/* Olive branch decorations */}
          <div className="absolute top-4 left-4 opacity-5">
            <OliveLogo size={120} animate={false} />
          </div>
          <div className="absolute bottom-4 right-4 opacity-5 rotate-180">
            <OliveLogo size={120} animate={false} />
          </div>

          {/* Certificate Content */}
          <div className="relative px-6 sm:px-12 py-10 sm:py-14">
            {/* Header with logo */}
            <div className="text-center mb-10">
              <OliveLogo size={48} className="mx-auto mb-4" animate={false} />
              <h2 className="font-display text-2xl sm:text-3xl font-bold text-primary mb-1">
                Zaytoun Vision
              </h2>
              <p className="font-arabic text-lg text-accent">زيتون فيجن</p>
              <div className="mt-4 h-px bg-gradient-to-r from-transparent via-accent/30 to-transparent" />
            </div>

            {/* Certificate Title */}
            <div className="text-center mb-10">
              <h3 className="font-display text-xl sm:text-2xl font-semibold text-dark uppercase tracking-widest mb-2">
                Certificate of Purity Analysis
              </h3>
              <p className="font-arabic text-base text-dark/50">
                شهادة تحليل النقاء
              </p>
            </div>

            {/* Bilingual Content Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 mb-10">
              {/* English Side */}
              <div className="space-y-4">
                <div>
                  <p className="text-xs text-dark/40 uppercase tracking-wider mb-1">Sample Name</p>
                  <p className="text-base font-semibold text-dark">
                    {currentResult.sampleName || 'Unknown Sample'}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-dark/40 uppercase tracking-wider mb-1">Certificate ID</p>
                  <p className="font-mono text-sm font-medium text-primary">{certificateId}</p>
                </div>
                <div>
                  <p className="text-xs text-dark/40 uppercase tracking-wider mb-1">Date Issued</p>
                  <p className="text-sm text-dark">{issuedDate}</p>
                </div>
                <div>
                  <p className="text-xs text-dark/40 uppercase tracking-wider mb-1">Adulterant Status</p>
                  <p className="text-sm text-dark">
                    {currentResult.adulterantDetected || 'No adulterants detected'}
                  </p>
                </div>
              </div>

              {/* Arabic Side */}
              <div className="space-y-4 text-right" dir="rtl">
                <div>
                  <p className="font-arabic text-xs text-dark/40 mb-1">اسم العينة</p>
                  <p className="font-arabic text-base font-semibold text-dark">
                    {currentResult.sampleName || 'عينة غير معروفة'}
                  </p>
                </div>
                <div>
                  <p className="font-arabic text-xs text-dark/40 mb-1">رقم الشهادة</p>
                  <p className="font-mono text-sm font-medium text-primary" dir="ltr">{certificateId}</p>
                </div>
                <div>
                  <p className="font-arabic text-xs text-dark/40 mb-1">تاريخ الإصدار</p>
                  <p className="font-arabic text-sm text-dark">{issuedDateAr}</p>
                </div>
                <div>
                  <p className="font-arabic text-xs text-dark/40 mb-1">حالة الغش</p>
                  <p className="font-arabic text-sm text-dark">
                    {currentResult.adulterantDetected ? 'تم كشف مادة مغشوشة' : 'لا توجد مواد مغشوشة'}
                  </p>
                </div>
              </div>
            </div>

            {/* Center Purity Score */}
            <div className="flex flex-col items-center my-10">
              <div
                className={`w-36 h-36 rounded-full flex flex-col items-center justify-center border-4 ${
                  currentResult.status === 'pure'
                    ? 'border-success glow-success'
                    : currentResult.status === 'warning'
                    ? 'border-warning glow-warning'
                    : 'border-danger glow-danger'
                }`}
              >
                <span className="font-mono text-4xl font-bold text-dark">
                  {currentResult.purityScore}
                </span>
                <span className="text-xs text-dark/50 -mt-1">% PURITY</span>
              </div>
              <div className="mt-4">
                <StatusBadge status={currentResult.status} size="lg" />
              </div>
            </div>

            {/* Divider */}
            <div className="h-px bg-gradient-to-r from-transparent via-dark/10 to-transparent mb-8" />

            {/* QR Code + Azure Badge */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
              <div className="flex flex-col items-center gap-2">
                <QRCodeSVG
                  value={verifyUrl}
                  size={80}
                  bgColor="transparent"
                  fgColor="#2D5016"
                  level="M"
                />
                <span className="text-[10px] text-dark/30 text-center">
                  Scan to verify
                  <br />
                  <span className="font-arabic">امسح للتحقق</span>
                </span>
              </div>

              {/* Azure Badge */}
              <div className="glass rounded-xl px-4 py-3 flex items-center gap-3">
                <span className="text-2xl">☁️</span>
                <div>
                  <p className="text-xs font-semibold text-dark">Analyzed by Azure Custom Vision</p>
                  <p className="font-arabic text-[10px] text-dark/50">تحليل بواسطة أزور كاستم فيجن</p>
                </div>
              </div>
            </div>
          </div>

          {/* Gold bottom border */}
          <div className="h-2 gradient-gold" />
        </motion.div>

        {/* Action Buttons */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="flex flex-col sm:flex-row gap-4 justify-center items-center mt-8"
        >
          <button
            onClick={handleDownload}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-3.5 rounded-xl gradient-gold text-white font-semibold text-base shadow-lg hover:shadow-xl transition-all hover:scale-105 active:scale-95"
          >
            <span className="text-lg">📥</span>
            Download PDF
          </button>
          <Link
            to="/results"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-3.5 rounded-xl border-2 border-primary/20 text-primary font-semibold text-base hover:bg-primary/5 transition-all hover:scale-105 active:scale-95"
          >
            ← Back to Results
          </Link>
        </motion.div>
      </div>
    </div>
  );
}
