import { Link, NavLink } from 'react-router-dom';
import { Leaf } from 'lucide-react';

export default function Navbar() {
  const linkClass = ({ isActive }: { isActive: boolean }) =>
    `text-sm font-medium transition-colors duration-150 ${
      isActive ? 'text-olive-500' : 'text-gray-600 hover:text-olive-500'
    }`;

  return (
    <header className="sticky top-0 z-50 bg-white border-b border-gray-200 no-print">
      <nav className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between h-16">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2 group">
          <span className="flex items-center justify-center w-8 h-8 rounded-lg bg-olive-500 text-white transition-transform group-hover:scale-105">
            <Leaf size={16} strokeWidth={2.5} />
          </span>
          <span className="font-semibold text-gray-900 text-base tracking-tight">
            Zaytoun<span className="text-olive-500"> Vision</span>
          </span>
        </Link>

        {/* Nav links */}
        <div className="hidden sm:flex items-center gap-7">
          <NavLink to="/" end className={linkClass}>Home</NavLink>
          <NavLink to="/analyze" className={linkClass}>Analyze</NavLink>
          <NavLink to="/history" className={linkClass}>History</NavLink>
        </div>

        {/* CTA */}
        <Link
          to="/analyze"
          className="hidden sm:inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-olive-500 text-white text-sm font-semibold hover:bg-olive-600 transition-colors duration-150"
        >
          Analyze now
        </Link>

        {/* Mobile menu */}
        <MobileMenu />
      </nav>
    </header>
  );
}

function MobileMenu() {
  return (
    <div className="sm:hidden flex items-center gap-3">
      <Link
        to="/analyze"
        className="px-3 py-1.5 rounded-lg bg-olive-500 text-white text-xs font-semibold hover:bg-olive-600 transition-colors"
      >
        Analyze
      </Link>
    </div>
  );
}
