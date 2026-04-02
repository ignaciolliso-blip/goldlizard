import { useEffect, useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { isPast, parseISO, format } from 'date-fns';

interface Snapshot {
  id: string;
  asset: string;
  briefing: string;
  dashboard_data: string;
  created_at: string;
  period_label: string | null;
  price_at_prediction: number | null;
  predicted_price: number | null;
  target_date: string | null;
  actual_price: number | null;
}

interface Props {
  snapshots: Snapshot[];
  loading: boolean;
  onLoad: () => void;
  accentColor?: string;
}

export default function AnalysisHistoryTab({ snapshots, loading, onLoad, accentColor = 'primary' }: Props) {
  useEffect(() => { onLoad(); }, []);

  if (loading) {
    return (
      <div className="space-y-3">
        {[0, 1, 2].map(i => (
          <div key={i} className="rounded-lg border border-border bg-card p-4 space-y-2">
            <div className="flex justify-between">
              <div className="h-3 w-28 bg-muted/50 rounded animate-pulse" />
              <div className="h-3 w-24 bg-muted/50 rounded animate-pulse" />
            </div>
            <div className="h-4 w-full bg-muted/50 rounded animate-pulse" />
            <div className="h-4 w-5/6 bg-muted/50 rounded animate-pulse" />
          </div>
        ))}
      </div>
    );
  }

  if (snapshots.length === 0) {
    return (
      <div className="flex items-center justify-center py-16 text-muted-foreground text-sm">
        No snapshots yet — click Update Analysis to save your first prediction.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {snapshots.map(s => (
        <SnapshotCard key={s.id} snapshot={s} accentColor={accentColor} />
      ))}
    </div>
  );
}

function SnapshotCard({ snapshot: s, accentColor }: { snapshot: Snapshot; accentColor: string }) {
  const [open, setOpen] = useState(false);

  const savedDate = format(parseISO(s.created_at), 'MMM d, yyyy · h:mm a');
  const targetPassed = s.target_date ? isPast(parseISO(s.target_date)) : false;
  const targetLabel = s.target_date ? format(parseISO(s.target_date), 'MMM d, yyyy') : '—';

  let actualDisplay: React.ReactNode;
  if (s.actual_price != null) {
    const diff = s.predicted_price ? ((s.actual_price - s.predicted_price) / s.predicted_price) * 100 : null;
    actualDisplay = (
      <span>
        ${s.actual_price.toLocaleString(undefined, { maximumFractionDigits: 0 })}
        {diff != null && (
          <span className={`ml-1 text-xs ${diff >= 0 ? 'text-green-500' : 'text-red-500'}`}>
            ({diff >= 0 ? '+' : ''}{diff.toFixed(1)}%)
          </span>
        )}
      </span>
    );
  } else if (targetPassed) {
    actualDisplay = <span className="text-muted-foreground italic">Fetching…</span>;
  } else {
    actualDisplay = <span className="text-muted-foreground italic">Pending {targetLabel}</span>;
  }

  return (
    <div className="rounded-lg border border-border bg-card overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-3 text-xs text-muted-foreground">
        <span>{savedDate}</span>
        <span>{s.period_label ?? ''}</span>
      </div>

      {/* Metrics row */}
      <div className="grid grid-cols-3 gap-2 px-4 py-3 text-sm">
        <div>
          <div className="text-[11px] text-muted-foreground uppercase tracking-wide mb-0.5">Price when saved</div>
          <div className="font-mono font-medium text-foreground">
            {s.price_at_prediction != null ? `$${s.price_at_prediction.toLocaleString(undefined, { maximumFractionDigits: 0 })}` : '—'}
          </div>
        </div>
        <div>
          <div className="text-[11px] text-muted-foreground uppercase tracking-wide mb-0.5">AI Prediction (1 month)</div>
          <div className={`font-mono font-medium text-${accentColor}`}>
            {s.predicted_price != null ? `$${s.predicted_price.toLocaleString(undefined, { maximumFractionDigits: 0 })}` : '—'}
          </div>
        </div>
        <div>
          <div className="text-[11px] text-muted-foreground uppercase tracking-wide mb-0.5">Actual result</div>
          <div className="font-mono font-medium">{actualDisplay}</div>
        </div>
      </div>

      {/* Briefing toggle */}
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center gap-1.5 px-4 py-2 text-xs text-muted-foreground hover:text-foreground border-t border-border transition-colors"
      >
        {open ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
        {open ? 'Hide briefing' : 'Show briefing'}
      </button>
      {open && (
        <div className="px-4 pb-4 text-[13px] text-muted-foreground leading-relaxed whitespace-pre-line">
          {s.briefing}
        </div>
      )}
    </div>
  );
}
