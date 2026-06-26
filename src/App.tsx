// ============================================================
// App — Main Application Component
// ============================================================
// BrowserRouter with routes, Navbar on all pages,
// AnimatePresence for page transitions.
// ============================================================

import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import { AnimatePresence, motion, type Variants } from 'framer-motion';
import Navbar from '@/components/shared/Navbar';
import Home from '@/pages/Home';
import Capture from '@/pages/Capture';
import Results from '@/pages/Results';
import Certificate from '@/pages/Certificate';
import History from '@/pages/History';
import Architecture from '@/pages/Architecture';

const pageVariants: Variants = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.4, ease: 'easeOut' } },
  exit: { opacity: 0, y: -20, transition: { duration: 0.2 } },
};

function AnimatedRoutes() {
  const location = useLocation();

  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        <Route
          path="/"
          element={
            <motion.div variants={pageVariants} initial="initial" animate="animate" exit="exit">
              <Home />
            </motion.div>
          }
        />
        <Route
          path="/capture"
          element={
            <motion.div variants={pageVariants} initial="initial" animate="animate" exit="exit">
              <Capture />
            </motion.div>
          }
        />
        <Route
          path="/results"
          element={
            <motion.div variants={pageVariants} initial="initial" animate="animate" exit="exit">
              <Results />
            </motion.div>
          }
        />
        <Route
          path="/certificate"
          element={
            <motion.div variants={pageVariants} initial="initial" animate="animate" exit="exit">
              <Certificate />
            </motion.div>
          }
        />
        <Route
          path="/history"
          element={
            <motion.div variants={pageVariants} initial="initial" animate="animate" exit="exit">
              <History />
            </motion.div>
          }
        />
        <Route
          path="/architecture"
          element={
            <motion.div variants={pageVariants} initial="initial" animate="animate" exit="exit">
              <Architecture />
            </motion.div>
          }
        />
      </Routes>
    </AnimatePresence>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Navbar />
      <AnimatedRoutes />
    </BrowserRouter>
  );
}
