import { NavLink } from 'react-router-dom';
import { cn } from '@/lib/utils';

const layers = [
  { to: '/', label: 'The Signal' },
  { to: '/analysis', label: 'The Analysis' },
  { to: '/evidence', label: 'The Evidence' },
];

const assets = [
  { label: 'Gold', active: true },
  { label: 'Uranium', active: false },
  { label: 'Oil', active: false },
  { label: 'Silver', active: false },
  { label: 'Strategy', active: false },
];

const AppNav = () => {
  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-background/95 backdrop-blur border-b border-border">
      <div className="max-w-[1600px] mx-auto px-4 sm:px-6">
        {/* Asset row */}
        <div className="flex items-center gap-1 pt-2 pb-1 border-b border-border/50">
          {assets.map((a) => (
            <button
              key={a.label}
              disabled={!a.active}
              className={cn(
                'px-3 py-1 text-xs font-medium rounded-sm transition-colors',
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

        {/* Layer tabs */}
        <div className="flex items-center gap-1 py-1.5">
          {layers.map((l) => (
            <NavLink
              key={l.to}
              to={l.to}
              end={l.to === '/'}
              className={({ isActive }) =>
                cn(
                  'px-4 py-1.5 text-sm font-medium rounded-sm transition-colors',
                  isActive
                    ? 'text-gold bg-gold/10 border border-gold/20'
                    : 'text-muted-foreground hover:text-foreground hover:bg-secondary/50'
                )
              }
            >
              {l.label}
            </NavLink>
          ))}
        </div>
      </div>
    </nav>
  );
};

export default AppNav;
