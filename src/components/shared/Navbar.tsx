// ============================================================
// Navbar — Sticky Top Navigation Bar
// ============================================================
// Glass-morphism navbar with OliveLogo, nav links, and mobile
// hamburger menu with animated slide-out drawer.
// ============================================================

import { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import OliveLogo from './OliveLogo';

interface NavItem {
  to: string;
  label: string;
  labelAr: string;
}

const NAV_ITEMS: NavItem[] = [
  { to: '/', label: 'Home', labelAr: 'الرئيسية' },
  { to: '/capture', label: 'Capture', labelAr: 'التقاط' },
  { to: '/history', label: 'History', labelAr: 'السجل' },
  { to: '/architecture', label: 'Architecture', labelAr: 'البنية' },
];

export default function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <>
      <motion.nav
        initial={{ y: -80 }}
        animate={{ y: 0 }}
        transition={{ type: 'spring', stiffness: 200, damping: 25 }}
        className="fixed top-0 left-0 right-0 z-50 glass border-b border-white/20"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo + Brand */}
            <NavLink to="/" className="flex items-center gap-2.5 group">
              <OliveLogo size={36} animate={false} />
              <div className="flex flex-col leading-tight">
                <span className="font-display text-lg font-bold text-primary group-hover:text-accent transition-colors">
                  Zaytoun Vision
                </span>
                <span className="font-arabic text-[10px] text-primary/60 -mt-0.5">
                  زيتون فيجن
                </span>
              </div>
            </NavLink>

            {/* Desktop Nav Links */}
            <div className="hidden md:flex items-center gap-1">
              {NAV_ITEMS.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.to === '/'}
                  className={({ isActive }) =>
                    `relative px-4 py-2 text-sm font-medium rounded-lg transition-all duration-200 ${
                      isActive
                        ? 'text-primary bg-primary/5'
                        : 'text-dark/60 hover:text-dark hover:bg-dark/5'
                    }`
                  }
                >
                  {({ isActive }) => (
                    <>
                      <span>{item.label}</span>
                      {isActive && (
                        <motion.div
                          layoutId="nav-underline"
                          className="absolute bottom-0 left-2 right-2 h-0.5 bg-accent rounded-full"
                          transition={{ type: 'spring', stiffness: 350, damping: 30 }}
                        />
                      )}
                    </>
                  )}
                </NavLink>
              ))}
            </div>

            {/* Mobile Hamburger */}
            <button
              onClick={() => setMobileOpen(!mobileOpen)}
              className="md:hidden relative w-10 h-10 flex items-center justify-center rounded-lg hover:bg-dark/5 transition-colors"
              aria-label="Toggle menu"
            >
              <div className="space-y-1.5">
                <motion.span
                  animate={mobileOpen ? { rotate: 45, y: 6 } : { rotate: 0, y: 0 }}
                  className="block w-5 h-0.5 bg-dark/70 rounded-full origin-center"
                />
                <motion.span
                  animate={mobileOpen ? { opacity: 0, x: -10 } : { opacity: 1, x: 0 }}
                  className="block w-5 h-0.5 bg-dark/70 rounded-full"
                />
                <motion.span
                  animate={mobileOpen ? { rotate: -45, y: -6 } : { rotate: 0, y: 0 }}
                  className="block w-5 h-0.5 bg-dark/70 rounded-full origin-center"
                />
              </div>
            </button>
          </div>
        </div>
      </motion.nav>

      {/* Mobile Drawer Overlay */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMobileOpen(false)}
              className="fixed inset-0 z-40 bg-dark/30 backdrop-blur-sm md:hidden"
            />

            {/* Drawer */}
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              className="fixed top-0 right-0 bottom-0 z-50 w-72 bg-surface shadow-elevated md:hidden"
            >
              <div className="flex flex-col h-full pt-20 px-6">
                {NAV_ITEMS.map((item, index) => (
                  <motion.div
                    key={item.to}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.08 }}
                  >
                    <NavLink
                      to={item.to}
                      end={item.to === '/'}
                      onClick={() => setMobileOpen(false)}
                      className={({ isActive }) =>
                        `flex items-center justify-between py-3.5 px-4 rounded-xl text-base font-medium transition-all mb-1 ${
                          isActive
                            ? 'text-primary bg-primary/10 border-l-3 border-accent'
                            : 'text-dark/60 hover:text-dark hover:bg-dark/5'
                        }`
                      }
                    >
                      <span>{item.label}</span>
                      <span className="font-arabic text-sm opacity-60">{item.labelAr}</span>
                    </NavLink>
                  </motion.div>
                ))}

                {/* Bottom branding */}
                <div className="mt-auto pb-8 text-center">
                  <OliveLogo size={28} animate={false} className="mx-auto mb-2" />
                  <p className="text-xs text-dark/40">Zaytoun Vision v1.0</p>
                  <p className="font-arabic text-xs text-dark/30">زيتون فيجن</p>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Spacer for fixed navbar */}
      <div className="h-16" />
    </>
  );
}
