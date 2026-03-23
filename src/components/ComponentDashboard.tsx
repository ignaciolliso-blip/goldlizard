import { useState, useMemo } from 'react';
import { LineChart, Line, ResponsiveContainer } from 'recharts';
import { ChevronRight } from 'lucide-react';
import type { GDIResult, VariableDetail } from '@/lib/gdiEngine';
import type { Observation } from '@/lib/dataFetcher';
import DrillDownPanel from './DrillDownPanel';

interface ComponentDashboardProps {
  gdiResult: GDIResult;
  goldSpot: Observation[];
  timeRange: string;
}

const UNIT_MAP: Record<string, string> = {
  DFII10: '%',
  DTWEXBGS: '',
  central_bank_gold: 't/qtr',
  T10Y2Y: '%',
  VIXCLS: '',
  DCOILBRENTEU: '$/bbl',
  T10YIE: '%',
  DFF: '%',
};

function getHeatmapBg(adjZ: number): string {
  if (adjZ > 1.5) return 'rgba(61,220,132,0.15)';
  if (adjZ > 0.5) return 'rgba(61,220,132,0.08)';
  if (adjZ < -1.5) return 'rgba(255,82,82,0.15)';
  if (adjZ < -0.5) return 'rgba(255,82,82,0.08)';
  return 'transparent';
}

function getSparklineData(
  alignedData: Map<string, Map<string, number>>,
  varId: string,
  dates: string[],
  count: number
): { v: number }[] {
  const series = alignedData.get(varId);
  if (!series) return [];
  const recentDates = dates.slice(-count);
  // Sample down to ~30 points for sparkline
  const step = Math.max(1, Math.floor(recentDates.length / 30));
  const points: { v: number }[] = [];
  for (let i = 0; i < recentDates.length; i += step) {
    const val = series.get(recentDates[i]);
    if (val !== undefined) points.push({ v: val });
  }
  return points;
}

function get30dChange(
  alignedData: Map<string, Map<string, number>>,
  varId: string,
  dates: string[]
): number | null {
  const series = alignedData.get(varId);
  if (!series || dates.length < 31) return null;
  const current = series.get(dates[dates.length - 1]);
  const past = series.get(dates[Math.max(0, dates.length - 31)]);
  if (current === undefined || past === undefined) return null;
  return current - past;
}

const ComponentDashboard = ({ gdiResult, goldSpot, timeRange }: ComponentDashboardProps) => {
  const [selectedVar, setSelectedVar] = useState<string | null>(null);

  // Variables are already sorted by absolute contribution in gdiEngine
  const { variables, sparklines, changes } = useMemo(() => {
    const sparklines: Record<string, { v: number }[]> = {};
    const changes: Record<string, number | null> = {};
    for (const v of gdiResult.variableDetails) {
      sparklines[v.id] = getSparklineData(gdiResult.alignedData, v.id, gdiResult.dates, 90);
      changes[v.id] = get30dChange(gdiResult.alignedData, v.id, gdiResult.dates);
    }
    return { variables: gdiResult.variableDetails, sparklines, changes };
  }, [gdiResult]);

  const handleCardClick = (varId: string) => {
    setSelectedVar(prev => (prev === varId ? null : varId));
  };

  return (
    <div className="space-y-4">
      <h2 className="font-display text-lg text-foreground px-1">Component Indicators</h2>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {variables.map((v) => (
          <IndicatorCard
            key={v.id}
            variable={v}
            sparklineData={sparklines[v.id] || []}
            change30d={changes[v.id] ?? null}
            unit={UNIT_MAP[v.id] || ''}
            isSelected={selectedVar === v.id}
            onClick={() => handleCardClick(v.id)}
          />
        ))}
      </div>

      {selectedVar && (() => {
        const selVariable = variables.find(v => v.id === selectedVar);
        if (!selVariable) return null;
        return (
          <DrillDownPanel
            variable={selVariable}
            gdiResult={gdiResult}
            goldSpot={goldSpot}
            timeRange={timeRange}
            onClose={() => setSelectedVar(null)}
          />
        );
      })()}
    </div>
  );
};

interface IndicatorCardProps {
  variable: VariableDetail;
  sparklineData: { v: number }[];
  change30d: number | null;
  unit: string;
  isSelected: boolean;
  onClick: () => void;
}

const IndicatorCard = ({
  variable, sparklineData, change30d, unit, isSelected, onClick
}: IndicatorCardProps) => {
  const heatBg = getHeatmapBg(variable.adjustedZScore);
  const zColor = variable.adjustedZScore > 0 ? 'text-bullish' : variable.adjustedZScore < 0 ? 'text-bearish' : 'text-muted-foreground';
  const zArrow = variable.adjustedZScore > 0 ? '↑' : variable.adjustedZScore < 0 ? '↓' : '→';
  const changeColor = change30d !== null && change30d > 0 ? 'text-bullish' : change30d !== null && change30d < 0 ? 'text-bearish' : 'text-muted-foreground';
  const changeArrow = change30d !== null && change30d > 0 ? '↑' : change30d !== null && change30d < 0 ? '↓' : '';
  const sparkColor = variable.adjustedZScore >= 0 ? '#3DDC84' : '#FF5252';

  return (
    <button
      onClick={onClick}
      className={`relative rounded-lg border p-3 text-left transition-all cursor-pointer hover:border-gold/40 ${
        isSelected ? 'border-gold shadow-[0_0_12px_rgba(201,168,76,0.15)]' : 'border-card-border'
      }`}
      style={{ backgroundColor: heatBg || 'hsl(var(--card))' }}
    >
      {/* Top row */}
      <div className="flex items-start justify-between mb-2">
        <div className="flex-1 min-w-0">
          <div className="text-xs font-bold text-foreground truncate">{variable.name}</div>
          <div className="text-[10px] text-muted-foreground">{(variable.weight * 100).toFixed(0)}% weight</div>
        </div>
        <ChevronRight className="w-3.5 h-3.5 text-muted-foreground/50 flex-shrink-0 mt-0.5" />
      </div>

      {/* Middle row */}
      <div className="flex items-baseline gap-2 mb-2">
        <span className="text-lg font-mono font-semibold text-foreground">
          {variable.currentValue.toFixed(2)}{unit}
        </span>
        <span className={`text-xs font-mono ${zColor}`}>
          {zArrow} {variable.adjustedZScore.toFixed(1)}
        </span>
      </div>

      {/* Bottom row - sparkline */}
      <div className="h-8 w-full mb-1">
        {sparklineData.length > 2 && (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={sparklineData}>
              <Line
                dataKey="v"
                stroke={sparkColor}
                strokeWidth={1.5}
                dot={false}
                isAnimationActive={false}
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* 30d change */}
      {change30d !== null && (
        <div className={`text-[10px] font-mono ${changeColor}`}>
          {changeArrow} {Math.abs(change30d).toFixed(2)} from 30d ago
        </div>
      )}
    </button>
  );
};

export default ComponentDashboard;
