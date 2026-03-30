import { useState, useEffect } from 'react';
import { X } from 'lucide-react';

interface PageIntroProps {
  storageKey: string;
  children: React.ReactNode;
}

export default function PageIntro({ storageKey, children }: PageIntroProps) {
  const [dismissed, setDismissed] = useState(() => {
    return localStorage.getItem(storageKey) === 'dismissed';
  });

  if (dismissed) return null;

  return (
    <div className="bg-card border border-border rounded-xl p-5 sm:p-6 relative">
      <button
        onClick={() => {
          setDismissed(true);
          localStorage.setItem(storageKey, 'dismissed');
        }}
        className="absolute top-3 right-3 p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary/50 transition-colors"
        aria-label="Dismiss"
      >
        <X size={16} />
      </button>
      {children}
    </div>
  );
}
