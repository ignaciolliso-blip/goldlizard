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

  // Position tooltip with fixed coords so it escapes overflow:hidden/auto ancestors (e.g. tables).
  useEffect(() => {
    if (!isOpen || !tooltipRef.current || !triggerRef.current) return;
    const el = tooltipRef.current;
    const trigger = triggerRef.current.getBoundingClientRect();
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const margin = 16;

    const width = el.offsetWidth;
    const height = el.offsetHeight;

    // Default: below trigger, horizontally centered on it
    let left = trigger.left + trigger.width / 2 - width / 2;
    let top = trigger.bottom + 8;

    if (left + width > vw - margin) left = vw - margin - width;
    if (left < margin) left = margin;
    if (top + height > vh - margin) {
      // Flip above
      top = trigger.top - height - 8;
    }
    if (top < margin) top = margin;

    el.style.left = `${left}px`;
    el.style.top = `${top}px`;
  }, [isOpen]);

  // Reposition on scroll/resize while open
  useEffect(() => {
    if (!isOpen) return;
    const handler = () => {
      if (!tooltipRef.current || !triggerRef.current) return;
      const el = tooltipRef.current;
      const trigger = triggerRef.current.getBoundingClientRect();
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const margin = 16;
      const width = el.offsetWidth;
      const height = el.offsetHeight;
      let left = trigger.left + trigger.width / 2 - width / 2;
      let top = trigger.bottom + 8;
      if (left + width > vw - margin) left = vw - margin - width;
      if (left < margin) left = margin;
      if (top + height > vh - margin) top = trigger.top - height - 8;
      if (top < margin) top = margin;
      el.style.left = `${left}px`;
      el.style.top = `${top}px`;
    };
    window.addEventListener('scroll', handler, true);
    window.addEventListener('resize', handler);
    return () => {
      window.removeEventListener('scroll', handler, true);
      window.removeEventListener('resize', handler);
    };
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
          className="fixed z-[9999]"
          style={{ width: 'min(380px, 90vw)', left: 0, top: 0 }}
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
