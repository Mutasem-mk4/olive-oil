import { Link } from 'react-router-dom';
import { Shield, Zap, FileCheck, ArrowRight, Camera, Upload, BarChart2, CheckCircle2 } from 'lucide-react';

export default function Landing() {
  return (
    <div className="flex flex-col">
      {/* ------------------------------------------------------------------ */}
      {/* HERO                                                                */}
      {/* ------------------------------------------------------------------ */}
      <section
        className="relative overflow-hidden"
        style={{ background: 'linear-gradient(135deg, #0f4234 0%, #1D9E75 60%, #3fb88a 100%)' }}
      >
        {/* Decorative blobs */}
        <div className="absolute inset-0 opacity-10 pointer-events-none">
          <div className="absolute -top-32 -right-32 w-96 h-96 rounded-full bg-white" />
          <div className="absolute -bottom-20 -left-20 w-72 h-72 rounded-full bg-white" />
        </div>

        <div className="relative max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-24 sm:py-32">
          <div className="max-w-2xl">
            {/* Badge */}
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/20 text-white text-xs font-semibold mb-6 backdrop-blur-sm">
              <span className="w-1.5 h-1.5 rounded-full bg-green-300" />
              AI-Powered Authenticity Screening
            </span>

            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-white leading-tight tracking-tight mb-5">
              Know your olive oil.<br className="hidden sm:block" />
              <span className="text-green-200">Instantly.</span>
            </h1>

            <p className="text-lg sm:text-xl text-green-50 max-w-xl mb-8 leading-relaxed">
              AI-powered UV fluorescence screening — no lab required. Upload a smartphone photo and get a full purity analysis in seconds.
            </p>

            <div className="flex flex-col sm:flex-row gap-3">
              <Link
                to="/analyze"
                id="hero-cta"
                className="inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-white text-olive-600 font-bold text-base hover:bg-green-50 transition-all duration-200 hover:scale-105 shadow-lg"
              >
                Analyze your oil
                <ArrowRight size={18} />
              </Link>
              <Link
                to="/history"
                className="inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl border border-white/30 text-white font-semibold text-base hover:bg-white/10 transition-all duration-200 backdrop-blur-sm"
              >
                View history
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------------------ */}
      {/* FEATURE CARDS                                                        */}
      {/* ------------------------------------------------------------------ */}
      <section className="py-20 bg-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-3">Why Zaytoun Vision?</h2>
            <p className="text-gray-500 max-w-lg mx-auto text-base">
              Professional-grade olive oil analysis, right from your smartphone.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            {[
              {
                icon: <Shield size={24} />,
                title: 'UV Fluorescence Analysis',
                description:
                  'Authentic extra-virgin olive oil emits a distinctive green fluorescence under UV light due to chlorophyll pigments. Our AI detects subtle deviations invisible to the naked eye.',
              },
              {
                icon: <Zap size={24} />,
                title: 'Results in Seconds',
                description:
                  'Our XGBoost model processes 26 image features — colour channels, HSV, LAB, and fluorescence metrics — in under a second to deliver a verdict.',
              },
              {
                icon: <FileCheck size={24} />,
                title: 'Digital Authenticity Report',
                description:
                  'Get a shareable, printable PDF report with purity score, confidence level, risk assessment, and a full feature breakdown.',
              },
            ].map((card) => (
              <div key={card.title} className="card shadow-card hover:-translate-y-1 hover:shadow-md transition-all duration-200">
                <div className="w-12 h-12 rounded-xl bg-olive-50 text-olive-500 flex items-center justify-center mb-4">
                  {card.icon}
                </div>
                <h3 className="text-base font-semibold text-gray-900 mb-2">{card.title}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{card.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------------------ */}
      {/* HOW IT WORKS                                                         */}
      {/* ------------------------------------------------------------------ */}
      <section className="py-20 bg-gray-50 border-t border-gray-100">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14">
            <h2 className="text-3xl font-bold text-gray-900 mb-3">How it works</h2>
            <p className="text-gray-500 text-base max-w-md mx-auto">
              Four simple steps from sample to result.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 relative">
            {/* Connecting line – desktop */}
            <div className="hidden lg:block absolute top-8 left-[12.5%] right-[12.5%] h-0.5 bg-olive-100 z-0" />

            {[
              {
                step: '01',
                icon: <div className="text-2xl">🫙</div>,
                title: 'Place oil under UV',
                description: 'Pour a small sample into a clear container and shine a UV light on it.',
              },
              {
                step: '02',
                icon: <Camera size={22} />,
                title: 'Take a photo',
                description: 'Capture the glowing sample with your smartphone camera.',
              },
              {
                step: '03',
                icon: <Upload size={22} />,
                title: 'Upload the image',
                description: 'Drop your photo into the analyzer. JPG or PNG, any resolution.',
              },
              {
                step: '04',
                icon: <CheckCircle2 size={22} />,
                title: 'Get your purity score',
                description: 'Receive a full authenticity report with confidence score and recommendations.',
              },
            ].map((item) => (
              <div key={item.step} className="relative z-10 flex flex-col items-center text-center">
                {/* Circle */}
                <div className="w-16 h-16 rounded-full bg-white border-2 border-olive-200 flex items-center justify-center text-olive-500 shadow-sm mb-4">
                  {item.icon}
                </div>
                <span className="text-xs font-bold text-olive-400 uppercase tracking-widest mb-2">{item.step}</span>
                <h3 className="text-sm font-semibold text-gray-900 mb-1">{item.title}</h3>
                <p className="text-xs text-gray-500 leading-relaxed max-w-[160px]">{item.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------------------ */}
      {/* CTA BANNER                                                           */}
      {/* ------------------------------------------------------------------ */}
      <section className="py-16 bg-white border-t border-gray-100">
        <div className="max-w-2xl mx-auto px-4 text-center">
          <BarChart2 size={40} className="text-olive-400 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-3">Ready to test your oil?</h2>
          <p className="text-gray-500 mb-7 text-sm">
            Upload a UV photo right now and get instant results — it's free.
          </p>
          <Link
            to="/analyze"
            id="landing-bottom-cta"
            className="inline-flex items-center gap-2 px-7 py-3.5 rounded-xl bg-olive-500 text-white font-bold text-base hover:bg-olive-600 transition-all duration-200 hover:scale-105 shadow-md"
          >
            Analyze your oil →
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-100 py-8">
        <div className="max-w-6xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-gray-400">
          <span>© {new Date().getFullYear()} Zaytoun Vision. AI-powered olive oil authenticity.</span>
          <span>For field screening purposes only — not a substitute for accredited laboratory analysis.</span>
        </div>
      </footer>
    </div>
  );
}
