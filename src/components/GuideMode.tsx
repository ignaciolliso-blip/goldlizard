import { createContext, useContext, useState, useCallback, useEffect, useRef, type ReactNode } from 'react';

interface GuideModeContextType {
  isGuideMode: boolean;
  toggleGuideMode: () => void;
  openTooltips: Set<string>;
  toggleTooltip: (id: string) => void;
}

const GuideModeContext = createContext<GuideModeContextType>({
  isGuideMode: false,
  toggleGuideMode: () => {},
  openTooltips: new Set(),
  toggleTooltip: () => {},
});

const STORAGE_KEY = 'guide_mode';

export function GuideModeProvider({ children }: { children: ReactNode }) {
  const [isGuideMode, setIsGuideMode] = useState(() => {
    return localStorage.getItem(STORAGE_KEY) === 'true';
  });
  const [openTooltips, setOpenTooltips] = useState<Set<string>>(new Set());

  const toggleGuideMode = useCallback(() => {
    setIsGuideMode(prev => {
      const next = !prev;
      localStorage.setItem(STORAGE_KEY, String(next));
      if (!next) setOpenTooltips(new Set());
      return next;
    });
  }, []);

  const toggleTooltip = useCallback((id: string) => {
    setOpenTooltips(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  return (
    <GuideModeContext.Provider value={{ isGuideMode, toggleGuideMode, openTooltips, toggleTooltip }}>
      {children}
    </GuideModeContext.Provider>
  );
}

export function useGuideMode() {
  return useContext(GuideModeContext);
}

interface GuideTooltipProps {
  id: string;
  text: string;
  children: ReactNode;
  position?: 'top' | 'bottom' | 'left' | 'right';
}

export function GuideTooltip({ id, text, children, position = 'bottom' }: GuideTooltipProps) {
  const { isGuideMode, openTooltips, toggleTooltip } = useGuideMode();
  const isOpen = openTooltips.has(id);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLSpanElement>(null);

  // Reposition tooltip to stay within viewport
  useEffect(() => {
    if (!isOpen || !tooltipRef.current) return;
    const el = tooltipRef.current;
    const rect = el.getBoundingClientRect();
    const vw = window.innerWidth;
    const vh = window.innerHeight;

    // Reset any prior adjustments
    el.style.left = '';
    el.style.right = '';
    el.style.top = '';
    el.style.bottom = '';
    el.style.transform = '';

    const updated = el.getBoundingClientRect();

    if (updated.right > vw - 16) {
      el.style.left = 'auto';
      el.style.right = '0';
      el.style.transform = 'none';
    }
    if (updated.left < 16) {
      el.style.left = '0';
      el.style.right = 'auto';
      el.style.transform = 'none';
    }
    if (updated.bottom > vh - 16) {
      el.style.top = 'auto';
      el.style.bottom = '100%';
      el.style.marginBottom = '8px';
      el.style.marginTop = '0';
    }
  }, [isOpen]);

  if (!isGuideMode) return <>{children}</>;

  return (
    <span ref={triggerRef} className="relative inline-flex items-center gap-1.5">
      {children}
      <button
        onClick={(e) => { e.stopPropagation(); toggleTooltip(id); }}
        className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-primary/20 text-primary text-[11px] font-bold hover:bg-primary/30 transition-colors flex-shrink-0 cursor-pointer"
        aria-label="Show guide tooltip"
      >
        ?
      </button>
      {isOpen && (
        <div
          ref={tooltipRef}
          className="absolute z-[9999] top-full left-1/2 -translate-x-1/2 mt-2"
          style={{ width: 'min(380px, 90vw)' }}
        >
          <div
            className="rounded-xl p-4 text-sm leading-relaxed shadow-[0_8px_32px_rgba(0,0,0,0.4)]"
            style={{
              backgroundColor: 'hsl(222 18% 14%)',
              border: '1px solid hsl(var(--primary))',
              color: 'hsl(var(--foreground))',
            }}
          >
            {text}
          </div>
        </div>
      )}
    </span>
  );
}
