import { useState, useEffect, useCallback } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { useGuideMode } from '@/components/GuideMode';
import { Menu, X } from 'lucide-react';

const layers = [
  { to: '/', label: 'The Signal', key: '1' },
  { to: '/analysis', label: 'The Analysis', key: '2' },
  { to: '/evidence', label: 'The Evidence', key: '3' },
];

const assets = [
  { label: 'Gold', active: true },
  { label: 'Uranium', active: false },
  { label: 'Oil', active: false },
  { label: 'Silver', active: false },
  { label: 'Strategy', active: false },
];

const AppNav = () => {
  const { isGuideMode, toggleGuideMode } = useGuideMode();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  // Close mobile menu on route change
  useEffect(() => { setMobileMenuOpen(false); }, [location.pathname]);

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      // Don't trigger when typing in inputs
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;

      if (e.key === '1') navigate('/');
      else if (e.key === '2') navigate('/analysis');
      else if (e.key === '3') navigate('/evidence');
      else if (e.key === 'g' || e.key === 'G') toggleGuideMode();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [navigate, toggleGuideMode]);

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-background/95 backdrop-blur border-b border-border">
      <div className="max-w-[1200px] mx-auto px-4 sm:px-6">
        {/* Top row: Brand + Asset tabs + Guide + Hamburger */}
        <div className="flex items-center justify-between py-2 border-b border-border/50">
          <div className="flex items-center gap-4">
            {/* Brand */}
            <div className="flex flex-col leading-none mr-3">
              <span className="font-display text-[20px] text-gold tracking-wide">MERIDIAN</span>
              <span className="text-[10px] text-muted-foreground tracking-widest">Investment Intelligence</span>
            </div>

            {/* Asset tabs - scrollable on mobile */}
            <div className="flex items-center gap-0.5 overflow-x-auto scrollbar-none">
              {assets.map((a) => (
                <button
                  key={a.label}
                  disabled={!a.active}
                  className={cn(
                    'px-2.5 py-1 text-xs font-medium rounded-sm transition-colors whitespace-nowrap',
                    a.active
                      ? 'text-gold bg-gold/10'
                      : 'text-muted-foreground/40 cursor-not-allowed'
                  )}
                  title={a.active ? undefined : 'Coming soon'}
                >
                  {a.active && <span className="inline-block w-1.5 h-1.5 rounded-full bg-gold mr-1.5" />}
                  {a.label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={toggleGuideMode}
              className={cn(
                'px-2.5 py-1 text-xs font-medium rounded-sm transition-all',
                isGuideMode
                  ? 'text-gold bg-gold/15 ring-1 ring-gold/40'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              Guide 🎓
            </button>

            {/* Hamburger - mobile only */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-1 text-muted-foreground hover:text-foreground transition-colors"
            >
              {mobileMenuOpen ? <X size={18} /> : <Menu size={18} />}
            </button>
          </div>
        </div>

        {/* Layer tabs - desktop */}
        <div className="hidden md:flex items-center gap-1 py-1.5">
          {layers.map((l) => (
            <NavLink
              key={l.to}
              to={l.to}
              end={l.to === '/'}
              className={({ isActive }) =>
                cn(
                  'px-4 py-1.5 text-sm font-medium transition-colors relative',
                  isActive
                    ? 'text-gold'
                    : 'text-muted-foreground hover:text-foreground'
                )
              }
            >
              {({ isActive }) => (
                <>
                  {l.label}
                  {isActive && (
                    <span className="absolute bottom-0 left-2 right-2 h-[2px] bg-gold rounded-full" />
                  )}
                </>
              )}
            </NavLink>
          ))}
        </div>

        {/* Mobile menu dropdown */}
        {mobileMenuOpen && (
          <div className="md:hidden py-2 space-y-1 animate-in slide-in-from-top-2 duration-200">
            {layers.map((l) => (
              <NavLink
                key={l.to}
                to={l.to}
                end={l.to === '/'}
                className={({ isActive }) =>
                  cn(
                    'block px-4 py-2.5 text-sm font-medium rounded-md transition-colors',
                    isActive
                      ? 'text-gold bg-gold/10 border-l-2 border-gold'
                      : 'text-muted-foreground hover:text-foreground hover:bg-secondary/50'
                  )
                }
              >
                {l.label}
              </NavLink>
            ))}
          </div>
        )}
      </div>
    </nav>
  );
};

export default AppNav;
