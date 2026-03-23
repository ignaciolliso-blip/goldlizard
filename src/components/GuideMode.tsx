import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';

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

  if (!isGuideMode) return <>{children}</>;

  const positionClasses: Record<string, string> = {
    top: 'bottom-full left-1/2 -translate-x-1/2 mb-2',
    bottom: 'top-full left-1/2 -translate-x-1/2 mt-2',
    left: 'right-full top-1/2 -translate-y-1/2 mr-2',
    right: 'left-full top-1/2 -translate-y-1/2 ml-2',
  };

  const arrowClasses: Record<string, string> = {
    top: 'top-full left-1/2 -translate-x-1/2 border-l-transparent border-r-transparent border-b-transparent border-t-[#C9A84C]',
    bottom: 'bottom-full left-1/2 -translate-x-1/2 border-l-transparent border-r-transparent border-t-transparent border-b-[#C9A84C]',
    left: 'left-full top-1/2 -translate-y-1/2 border-t-transparent border-b-transparent border-r-transparent border-l-[#C9A84C]',
    right: 'right-full top-1/2 -translate-y-1/2 border-t-transparent border-b-transparent border-l-transparent border-r-[#C9A84C]',
  };

  return (
    <span className="relative inline-flex items-center gap-1">
      {children}
      <button
        onClick={(e) => { e.stopPropagation(); toggleTooltip(id); }}
        className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-gold/20 text-gold text-[9px] font-bold hover:bg-gold/30 transition-colors flex-shrink-0 cursor-pointer"
        aria-label="Show guide tooltip"
      >
        ?
      </button>
      {isOpen && (
        <div className={`absolute z-[100] ${positionClasses[position]}`} style={{ width: 'max(250px, 20vw)', maxWidth: '350px' }}>
          <div
            className="rounded-md p-3 text-[12px] sm:text-[13px] leading-relaxed shadow-lg"
            style={{
              backgroundColor: '#2A2E3A',
              border: '1px solid #C9A84C',
              color: '#E8E6E1',
            }}
          >
            {text}
          </div>
          <div className={`absolute w-0 h-0 border-[5px] ${arrowClasses[position]}`} />
        </div>
      )}
    </span>
  );
}
