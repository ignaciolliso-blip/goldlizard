import { useState, useEffect, useCallback } from 'react';
import { NavLink, useLocation, useNavigate, Link } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { useGuideMode } from '@/components/GuideMode';
import { useAuth } from '@/hooks/useAuth';
import { Menu, X, LogIn, LogOut } from 'lucide-react';

// Asset definitions with their base routes
const assets = [
  { label: 'Gold', active: true, path: '/' },
  { label: 'Uranium', active: true, path: '/uranium' },
  { label: 'Solana', active: true, path: '/solana' },
  { label: 'Oil', active: false, path: '/oil' },
  { label: 'Strategy', active: false, path: '/strategy' },
];

// Get current asset from pathname
function getCurrentAsset(pathname: string) {
  if (pathname.startsWith('/uranium')) return 'Uranium';
  if (pathname.startsWith('/solana')) return 'Solana';
  return 'Gold';
}

// Get layer tabs based on current asset
function getLayerTabs(asset: string) {
  if (asset === 'Uranium') {
    return [
      { to: '/uranium', label: 'The Signal', key: '1' },
      { to: '/uranium/analysis', label: 'The Analysis', key: '2' },
      { to: '/uranium/evidence', label: 'The Evidence', key: '3' },
    ];
  }
  return [
    { to: '/', label: 'The Signal', key: '1' },
    { to: '/analysis', label: 'The Analysis', key: '2' },
    { to: '/evidence', label: 'The Evidence', key: '3' },
  ];
}

const AppNav = () => {
  const { isGuideMode, toggleGuideMode } = useGuideMode();
  const { user, signOut } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const currentAsset = getCurrentAsset(location.pathname);
  const layers = getLayerTabs(currentAsset);

  // Close mobile menu on route change
  useEffect(() => { setMobileMenuOpen(false); }, [location.pathname]);

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;

      if (e.key === '1') navigate(layers[0].to);
      else if (e.key === '2') navigate(layers[1].to);
      else if (e.key === '3') navigate(layers[2].to);
      else if (e.key === 'g' || e.key === 'G') toggleGuideMode();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [navigate, toggleGuideMode, layers]);

  // Determine accent color based on asset
  const accentClass = currentAsset === 'Uranium' ? 'text-uranium' : 'text-gold';
  const accentBg = currentAsset === 'Uranium' ? 'bg-uranium/10' : 'bg-gold/10';
  const accentDot = currentAsset === 'Uranium' ? 'bg-uranium' : 'bg-gold';
  const accentLine = currentAsset === 'Uranium' ? 'bg-uranium' : 'bg-gold';
  const accentRing = currentAsset === 'Uranium' ? 'ring-uranium/40 text-uranium bg-uranium/15' : 'ring-gold/40 text-gold bg-gold/15';

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

            {/* Asset tabs */}
            <div className="flex items-center gap-0.5 overflow-x-auto scrollbar-none">
              {assets.map((a) => (
                <button
                  key={a.label}
                  disabled={!a.active}
                  onClick={() => a.active && navigate(a.path)}
                  className={cn(
                    'px-2.5 py-1 text-xs font-medium rounded-sm transition-colors whitespace-nowrap',
                    a.active && currentAsset === a.label
                      ? `${a.label === 'Uranium' ? 'text-uranium bg-uranium/10' : 'text-gold bg-gold/10'}`
                      : a.active
                      ? 'text-muted-foreground hover:text-foreground'
                      : 'text-muted-foreground/40 cursor-not-allowed'
                  )}
                  title={a.active ? undefined : 'Coming soon'}
                >
                  {a.active && currentAsset === a.label && (
                    <span className={cn('inline-block w-1.5 h-1.5 rounded-full mr-1.5', accentDot)} />
                  )}
                  {a.label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-2">
            {user ? (
              <button
                onClick={() => signOut()}
                className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-muted-foreground hover:text-foreground rounded-sm transition-colors"
                title="Sign out"
              >
                <LogOut size={14} />
                <span className="hidden sm:inline">Sign Out</span>
              </button>
            ) : (
              <Link
                to="/login"
                className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-muted-foreground hover:text-foreground rounded-sm transition-colors"
              >
                <LogIn size={14} />
                <span className="hidden sm:inline">Sign In</span>
              </Link>
            )}

            <button
              onClick={toggleGuideMode}
              className={cn(
                'px-2.5 py-1 text-xs font-medium rounded-sm transition-all',
                isGuideMode
                  ? `ring-1 ${accentRing}`
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              Guide 🎓
            </button>

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
              end={l.to === '/' || l.to === '/uranium'}
              className={({ isActive }) =>
                cn(
                  'px-4 py-1.5 text-sm font-medium transition-colors relative',
                  isActive ? accentClass : 'text-muted-foreground hover:text-foreground'
                )
              }
            >
              {({ isActive }) => (
                <>
                  {l.label}
                  {isActive && (
                    <span className={cn('absolute bottom-0 left-2 right-2 h-[2px] rounded-full', accentLine)} />
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
                end={l.to === '/' || l.to === '/uranium'}
                className={({ isActive }) =>
                  cn(
                    'block px-4 py-2.5 text-sm font-medium rounded-md transition-colors',
                    isActive
                      ? `${accentClass} ${accentBg} border-l-2 ${currentAsset === 'Uranium' ? 'border-uranium' : 'border-gold'}`
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
