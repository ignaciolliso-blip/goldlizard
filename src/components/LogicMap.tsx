import { useState, useMemo, useCallback } from 'react';
import { ChevronRight, ChevronDown, RotateCcw } from 'lucide-react';
import type { GDIResult, VariableDetail } from '@/lib/gdiEngine';
import type { ScenarioProbabilities, ScenarioConfig } from '@/lib/scenarioEngine';
import { INVERT_SERIES } from '@/lib/constants';
import { useIsMobile } from '@/hooks/use-mobile';

interface LogicMapProps {
  gdiResult: GDIResult;
  currentGDI: number;
  probs: ScenarioProbabilities;
  scenarioConfig: ScenarioConfig;
  currentGoldPrice: number;
  onVariableClick: (varId: string) => void;
  onScrollToChart: () => void;
  onScrollToScenarios: () => void;
}

// Helpers
function getHeatColor(adjZ: number): string {
  if (adjZ > 1.0) return '#3DDC84';
  if (adjZ > 0.3) return '#2a9d5c';
  if (adjZ < -1.0) return '#FF5252';
  if (adjZ < -0.3) return '#c94040';
  return '#8A8D96';
}

function getHeatBg(adjZ: number): string {
  if (adjZ > 0.5) return 'rgba(61,220,132,0.12)';
  if (adjZ < -0.5) return 'rgba(255,82,82,0.12)';
  return 'rgba(138,141,150,0.06)';
}

function formatVal(v: number, id: string): string {
  if (['DFII10', 'T10YIE', 'DFF', 'T10Y2Y'].includes(id)) return `${v.toFixed(2)}%`;
  if (id === 'DCOILBRENTEU') return `$${v.toFixed(1)}`;
  if (id === 'central_bank_gold') return `${Math.round(v).toLocaleString()}t`;
  return v.toFixed(1);
}

// Gaussian bell curve for visualization
function gaussianPdf(x: number, mu: number, sigma: number): number {
  return Math.exp(-0.5 * ((x - mu) / sigma) ** 2) / (sigma * Math.sqrt(2 * Math.PI));
}

// ─── DESKTOP SVG FLOW ─────────────────────────────────────────────────
const DesktopFlow = ({
  variables, currentGDI, probs, scenarioConfig, currentGoldPrice,
  highlightVar, setHighlightVar, onVariableClick, onScrollToChart, onScrollToScenarios,
}: {
  variables: VariableDetail[];
  currentGDI: number;
  probs: ScenarioProbabilities;
  scenarioConfig: ScenarioConfig;
  currentGoldPrice: number;
  highlightVar: string | null;
  setHighlightVar: (v: string | null) => void;
  onVariableClick: (id: string) => void;
  onScrollToChart: () => void;
  onScrollToScenarios: () => void;
}) => {
  const W = 1400;
  const H = 520;
  const varCount = variables.length;
  const varH = 38;
  const varGap = 6;
  const varTotalH = varCount * varH + (varCount - 1) * varGap;
  const varStartY = (H - varTotalH) / 2;

  // Column x positions
  const col1 = 20;   // Variables
  const col2 = 290;  // Z-score nodes
  const col3 = 580;  // GDI circle
  const col4 = 820;  // Probabilities
  const col5 = 1020; // Targets
  const col6 = 1250; // EV/CAGR

  const gdiY = H / 2;
  const gdiR = 42;

  const signal = currentGDI > 0.5 ? 'BULLISH' : currentGDI < -0.5 ? 'BEARISH' : 'NEUTRAL';
  const gdiColor = currentGDI > 0.5 ? '#3DDC84' : currentGDI < -0.5 ? '#FF5252' : '#C9A84C';

  const bull = scenarioConfig.scenarios.find(s => s.name === 'Bull');
  const base = scenarioConfig.scenarios.find(s => s.name === 'Base');
  const bear = scenarioConfig.scenarios.find(s => s.name === 'Bear');

  const horizons = ['3m', '6m', '1y', '3y', '5y'] as const;
  const scenarioRows = [
    { name: 'Bull', color: '#3DDC84', prob: probs.bull, scenario: bull },
    { name: 'Base', color: '#C9A84C', prob: probs.base, scenario: base },
    { name: 'Bear', color: '#FF5252', prob: probs.bear, scenario: bear },
  ];

  // Bell curve points
  const bellW = 160;
  const bellH = 50;
  const bellX = col3 - bellW / 2 + gdiR / 2;
  const bellY = gdiY + gdiR + 30;
  const bellPoints = useMemo(() => {
    const pts: string[] = [];
    for (let px = 0; px <= bellW; px += 2) {
      const x = -3 + (px / bellW) * 6; // map to -3..3
      const y = gaussianPdf(x, 0, 0.8) * bellH * 2;
      pts.push(`${bellX + px},${bellY + bellH - y}`);
    }
    return pts.join(' ');
  }, [bellX, bellY]);

  const gdiOnBell = bellX + ((currentGDI + 3) / 6) * bellW;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ maxHeight: 520 }}>
      <defs>
        <filter id="glow">
          <feGaussianBlur stdDeviation="3" result="blur" />
          <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
      </defs>

      {/* Stage labels */}
      <text x={col1 + 60} y={18} textAnchor="middle" fill="#8A8D96" fontSize="10" fontWeight="600" letterSpacing="1.5">INPUTS</text>
      <text x={col2 + 80} y={18} textAnchor="middle" fill="#8A8D96" fontSize="10" fontWeight="600" letterSpacing="1.5">Z-SCORE × WEIGHT</text>
      <text x={col3 + 20} y={18} textAnchor="middle" fill="#8A8D96" fontSize="10" fontWeight="600" letterSpacing="1.5">GDI</text>
      <text x={col4 + 60} y={18} textAnchor="middle" fill="#8A8D96" fontSize="10" fontWeight="600" letterSpacing="1.5">PROBABILITIES</text>
      <text x={col5 + 80} y={18} textAnchor="middle" fill="#8A8D96" fontSize="10" fontWeight="600" letterSpacing="1.5">TARGETS</text>
      <text x={col6 + 60} y={18} textAnchor="middle" fill="#8A8D96" fontSize="10" fontWeight="600" letterSpacing="1.5">EV & CAGR</text>

      {/* STAGE 1 & 2: Variables → Z-Score nodes */}
      {variables.map((v, i) => {
        const y = varStartY + i * (varH + varGap);
        const isHighlight = highlightVar === v.id;
        const dimmed = highlightVar !== null && !isHighlight;
        const opacity = dimmed ? 0.2 : 1;
        const heatColor = getHeatColor(v.adjustedZScore);
        const isInverted = INVERT_SERIES.includes(v.id as any);
        const lineThick = Math.max(1, v.weight * 12);

        return (
          <g key={v.id} opacity={opacity} style={{ transition: 'opacity 0.2s' }}>
            {/* Variable rect */}
            <rect
              x={col1} y={y} width={220} height={varH} rx={6}
              fill={getHeatBg(v.adjustedZScore)}
              stroke={isHighlight ? '#C9A84C' : '#1E2230'}
              strokeWidth={isHighlight ? 1.5 : 0.5}
              className="cursor-pointer"
              onMouseEnter={() => setHighlightVar(v.id)}
              onMouseLeave={() => setHighlightVar(null)}
              onClick={() => onVariableClick(v.id)}
            />
            <text x={col1 + 10} y={y + 16} fill="#E8E6E1" fontSize="11" fontWeight="600"
              className="cursor-pointer pointer-events-none">{v.name}</text>
            <text x={col1 + 10} y={y + 30} fill="#8A8D96" fontSize="9" className="pointer-events-none">
              {formatVal(v.currentValue, v.id)}
            </text>
            {isInverted && (
              <text x={col1 + 200} y={y + 24} fill="#8A8D96" fontSize="11" textAnchor="end" className="pointer-events-none">⟲</text>
            )}

            {/* Connection line to z-score node */}
            <line
              x1={col1 + 220} y1={y + varH / 2}
              x2={col2} y2={y + varH / 2}
              stroke={heatColor} strokeWidth={lineThick} strokeOpacity={0.5}
            />

            {/* Z-score node */}
            <rect
              x={col2} y={y + 2} width={210} height={varH - 4} rx={4}
              fill="rgba(30,34,48,0.8)" stroke="#1E2230" strokeWidth={0.5}
            />
            <text x={col2 + 8} y={y + 23} fill="#E8E6E1" fontSize="9.5" fontFamily="monospace" className="pointer-events-none">
              z={v.adjustedZScore > 0 ? '+' : ''}{v.adjustedZScore.toFixed(2)} × {(v.weight * 100).toFixed(0)}% = {v.contribution > 0 ? '+' : ''}{v.contribution.toFixed(3)}
            </text>

            {/* Line from z-node to GDI circle */}
            <line
              x1={col2 + 210} y1={y + varH / 2}
              x2={col3} y2={gdiY}
              stroke={heatColor} strokeWidth={lineThick * 0.7} strokeOpacity={0.25}
            />
          </g>
        );
      })}

      {/* STAGE 3: GDI Circle */}
      <g className="cursor-pointer" onClick={onScrollToChart}
        onMouseEnter={() => setHighlightVar('__gdi__')}
        onMouseLeave={() => setHighlightVar(null)}>
        <circle cx={col3 + 20} cy={gdiY} r={gdiR} fill={gdiColor} fillOpacity={0.15}
          stroke={gdiColor} strokeWidth={2} filter="url(#glow)" />
        <text x={col3 + 20} y={gdiY - 4} textAnchor="middle" fill={gdiColor} fontSize="22" fontWeight="700" fontFamily="monospace">
          {currentGDI > 0 ? '+' : ''}{currentGDI.toFixed(2)}
        </text>
        <text x={col3 + 20} y={gdiY + 16} textAnchor="middle" fill={gdiColor} fontSize="9" fontWeight="600" letterSpacing="1">
          {signal}
        </text>
      </g>

      {/* Bell Curve */}
      <polyline points={bellPoints} fill="none" stroke="#8A8D96" strokeWidth={1} strokeOpacity={0.4} />
      {/* Scenario centers */}
      {[{ x: -1.5, color: '#FF5252' }, { x: 0, color: '#C9A84C' }, { x: 1.5, color: '#3DDC84' }].map((s, i) => {
        const px = bellX + ((s.x + 3) / 6) * bellW;
        return <circle key={i} cx={px} cy={bellY + bellH} r={3} fill={s.color} fillOpacity={0.5} />;
      })}
      {/* GDI position on bell */}
      <line x1={gdiOnBell} y1={bellY + 5} x2={gdiOnBell} y2={bellY + bellH + 5} stroke={gdiColor} strokeWidth={1.5} />
      <circle cx={gdiOnBell} cy={bellY + 5} r={3} fill={gdiColor} />

      {/* Arrow from GDI to probabilities */}
      <line x1={col3 + 20 + gdiR} y1={gdiY} x2={col4} y2={gdiY} stroke="#8A8D96" strokeWidth={1} strokeDasharray="4 3" markerEnd="url(#arrowhead)" />
      <defs>
        <marker id="arrowhead" markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto">
          <polygon points="0 0, 8 3, 0 6" fill="#8A8D96" />
        </marker>
      </defs>

      {/* STAGE 4: Probability nodes */}
      {scenarioRows.map((s, i) => {
        const y = gdiY - 80 + i * 70;
        const barW = Math.max(20, s.prob * 120);
        return (
          <g key={s.name} className="cursor-pointer" onClick={onScrollToScenarios}>
            <rect x={col4} y={y} width={barW + 60} height={40} rx={6}
              fill="rgba(30,34,48,0.7)" stroke={s.color} strokeWidth={0.8} strokeOpacity={0.5} />
            <circle cx={col4 + 12} cy={y + 20} r={5} fill={s.color} />
            <text x={col4 + 24} y={y + 17} fill="#E8E6E1" fontSize="10" fontWeight="600">{s.name}</text>
            <text x={col4 + 24} y={y + 32} fill={s.color} fontSize="12" fontWeight="700" fontFamily="monospace">
              {(s.prob * 100).toFixed(0)}%
            </text>

            {/* Line to targets */}
            <line x1={col4 + barW + 60} y1={y + 20} x2={col5} y2={y + 20}
              stroke={s.color} strokeWidth={Math.max(1, s.prob * 5)} strokeOpacity={0.4} />
          </g>
        );
      })}

      {/* STAGE 5: Target prices */}
      {scenarioRows.map((s, i) => {
        const y = gdiY - 80 + i * 70;
        if (!s.scenario) return null;
        return (
          <g key={`targets-${s.name}`}>
            <rect x={col5} y={y} width={180} height={40} rx={4}
              fill="rgba(30,34,48,0.5)" stroke="#1E2230" strokeWidth={0.5} />
            {horizons.map((h, hi) => (
              <text key={h} x={col5 + 8 + hi * 36} y={y + 15} fill="#8A8D96" fontSize="8" textAnchor="start">
                {h}
              </text>
            ))}
            {horizons.map((h, hi) => (
              <text key={`v-${h}`} x={col5 + 8 + hi * 36} y={y + 30} fill={s.color} fontSize="9" fontFamily="monospace" textAnchor="start">
                ${(s.scenario!.targets[h] / 1000).toFixed(1)}k
              </text>
            ))}
            {/* Line to EV */}
            <line x1={col5 + 180} y1={y + 20} x2={col6} y2={gdiY}
              stroke="#8A8D96" strokeWidth={Math.max(0.5, s.prob * 3)} strokeOpacity={0.2} />
          </g>
        );
      })}

      {/* STAGE 6: EV & CAGR */}
      <rect x={col6} y={gdiY - 65} width={130} height={130} rx={8}
        fill="rgba(30,34,48,0.7)" stroke="#C9A84C" strokeWidth={0.8} strokeOpacity={0.4} />
      <text x={col6 + 65} y={gdiY - 48} textAnchor="middle" fill="#8A8D96" fontSize="9" fontWeight="600">EXPECTED VALUE</text>
      {horizons.map((h, i) => {
        const hy = gdiY - 32 + i * 22;
        const ev = bull && base && bear
          ? probs.bull * bull.targets[h] + probs.base * base.targets[h] + probs.bear * bear.targets[h]
          : 0;
        const years = h === '1y' ? 1 : h === '3y' ? 3 : h === '5y' ? 5 : null;
        const cagr = years && currentGoldPrice > 0 ? (Math.pow(ev / currentGoldPrice, 1 / years) - 1) * 100 : null;
        const isAttractive = cagr !== null && cagr > 7.9;
        return (
          <g key={h}>
            <text x={col6 + 8} y={hy} fill="#8A8D96" fontSize="9">{h}</text>
            <text x={col6 + 38} y={hy} fill="#E8E6E1" fontSize="10" fontFamily="monospace" fontWeight="600">
              ${Math.round(ev).toLocaleString()}
            </text>
            {cagr !== null && (
              <text x={col6 + 120} y={hy} textAnchor="end" fill={isAttractive ? '#3DDC84' : '#8A8D96'} fontSize="9" fontFamily="monospace" fontWeight={isAttractive ? '700' : '400'}>
                {cagr > 0 ? '+' : ''}{cagr.toFixed(1)}%
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
};

// ─── MOBILE VERTICAL FLOW ─────────────────────────────────────────────
const MobileFlow = ({
  variables, currentGDI, probs, scenarioConfig, currentGoldPrice,
  onVariableClick, onScrollToChart, onScrollToScenarios,
}: {
  variables: VariableDetail[];
  currentGDI: number;
  probs: ScenarioProbabilities;
  scenarioConfig: ScenarioConfig;
  currentGoldPrice: number;
  onVariableClick: (id: string) => void;
  onScrollToChart: () => void;
  onScrollToScenarios: () => void;
}) => {
  const [openStage, setOpenStage] = useState<number | null>(null);
  const signal = currentGDI > 0.5 ? 'BULLISH' : currentGDI < -0.5 ? 'BEARISH' : 'NEUTRAL';
  const gdiColor = currentGDI > 0.5 ? 'text-bullish' : currentGDI < -0.5 ? 'text-bearish' : 'text-gold';

  const bull = scenarioConfig.scenarios.find(s => s.name === 'Bull');
  const base = scenarioConfig.scenarios.find(s => s.name === 'Base');
  const bear = scenarioConfig.scenarios.find(s => s.name === 'Bear');

  const stages = [
    {
      title: '1. Input Variables',
      summary: `${variables.length} macro variables`,
      content: (
        <div className="space-y-1.5">
          {variables.map(v => (
            <button key={v.id} onClick={() => onVariableClick(v.id)}
              className="w-full flex justify-between items-center px-2.5 py-1.5 rounded text-left hover:bg-secondary/20 transition-colors"
              style={{ backgroundColor: getHeatBg(v.adjustedZScore) }}>
              <span className="text-[11px] font-medium text-foreground">{v.name}</span>
              <span className="text-[10px] font-mono text-muted-foreground">{formatVal(v.currentValue, v.id)}</span>
            </button>
          ))}
        </div>
      ),
    },
    {
      title: '2. Z-Score × Weight',
      summary: 'Standardize & weight',
      content: (
        <div className="space-y-1">
          {variables.map(v => (
            <div key={v.id} className="flex justify-between px-2.5 py-1 text-[10px] font-mono">
              <span className="text-muted-foreground">{v.name}</span>
              <span className="text-foreground">
                z={v.adjustedZScore > 0 ? '+' : ''}{v.adjustedZScore.toFixed(2)} × {(v.weight * 100).toFixed(0)}% = <span className={v.contribution > 0 ? 'text-bullish' : 'text-bearish'}>{v.contribution > 0 ? '+' : ''}{v.contribution.toFixed(3)}</span>
              </span>
            </div>
          ))}
        </div>
      ),
    },
    {
      title: '3. GDI Composite',
      summary: `${currentGDI > 0 ? '+' : ''}${currentGDI.toFixed(2)} (${signal})`,
      content: (
        <div className="text-center py-3 cursor-pointer" onClick={onScrollToChart}>
          <p className={`text-3xl font-mono font-bold ${gdiColor}`}>{currentGDI > 0 ? '+' : ''}{currentGDI.toFixed(2)}</p>
          <p className={`text-xs font-semibold mt-1 ${gdiColor}`}>{signal}</p>
          <p className="text-[10px] text-muted-foreground mt-2">Tap to scroll to chart</p>
        </div>
      ),
    },
    {
      title: '4. Scenarios → EV',
      summary: `Bull ${(probs.bull * 100).toFixed(0)}% / Base ${(probs.base * 100).toFixed(0)}% / Bear ${(probs.bear * 100).toFixed(0)}%`,
      content: (
        <div className="space-y-3" onClick={onScrollToScenarios}>
          <div className="flex gap-2 text-[10px]">
            <span className="text-bullish font-mono font-bold">Bull {(probs.bull * 100).toFixed(0)}%</span>
            <span className="text-gold font-mono font-bold">Base {(probs.base * 100).toFixed(0)}%</span>
            <span className="text-bearish font-mono font-bold">Bear {(probs.bear * 100).toFixed(0)}%</span>
          </div>
          {(['1y', '3y', '5y'] as const).map(h => {
            const years = h === '1y' ? 1 : h === '3y' ? 3 : 5;
            const ev = bull && base && bear
              ? probs.bull * bull.targets[h] + probs.base * base.targets[h] + probs.bear * bear.targets[h]
              : 0;
            const cagr = currentGoldPrice > 0 ? (Math.pow(ev / currentGoldPrice, 1 / years) - 1) * 100 : 0;
            return (
              <div key={h} className="flex justify-between text-[10px] font-mono">
                <span className="text-muted-foreground">{h} EV</span>
                <span className="text-foreground">${Math.round(ev).toLocaleString()} <span className={cagr > 7.9 ? 'text-bullish font-bold' : 'text-muted-foreground'}>({cagr > 0 ? '+' : ''}{cagr.toFixed(1)}%)</span></span>
              </div>
            );
          })}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-1.5">
      {stages.map((stage, i) => (
        <div key={i} className="rounded-lg border border-card-border overflow-hidden" style={{ backgroundColor: '#151820' }}>
          <button
            onClick={() => setOpenStage(openStage === i ? null : i)}
            className="w-full flex items-center justify-between px-3 py-2.5 hover:bg-secondary/10 transition-colors"
          >
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-foreground">{stage.title}</span>
              <span className="text-[10px] text-muted-foreground">{stage.summary}</span>
            </div>
            {openStage === i ? <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" /> : <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />}
          </button>
          {openStage === i && (
            <div className="px-3 pb-3 border-t border-card-border/30">
              {stage.content}
            </div>
          )}
        </div>
      ))}
    </div>
  );
};

// ─── MAIN COMPONENT ───────────────────────────────────────────────────
const LogicMap = (props: LogicMapProps) => {
  const [expanded, setExpanded] = useState(false);
  const [highlightVar, setHighlightVar] = useState<string | null>(null);
  const isMobile = useIsMobile();

  return (
    <div className="rounded-lg border border-card-border overflow-hidden bg-card">
      <button
        onClick={() => setExpanded(v => !v)}
        className={`w-full flex items-center justify-between px-4 py-3 hover:bg-secondary/10 transition-colors ${expanded ? 'border-b border-card-border' : ''}`}
      >
        <div className="flex items-center gap-2">
          <span className="text-sm sm:text-base">🔀</span>
          <h2 className="font-display text-sm sm:text-base text-foreground">How the Model Works</h2>
        </div>
        {expanded ? <ChevronDown className="w-4 h-4 text-gold" /> : <ChevronRight className="w-4 h-4 text-muted-foreground" />}
      </button>

      {expanded && (
        <div className="p-3 sm:p-4">
          {isMobile ? (
            <MobileFlow
              variables={props.gdiResult.variableDetails}
              currentGDI={props.currentGDI}
              probs={props.probs}
              scenarioConfig={props.scenarioConfig}
              currentGoldPrice={props.currentGoldPrice}
              onVariableClick={props.onVariableClick}
              onScrollToChart={props.onScrollToChart}
              onScrollToScenarios={props.onScrollToScenarios}
            />
          ) : (
            <div className="overflow-x-auto">
              <DesktopFlow
                variables={props.gdiResult.variableDetails}
                currentGDI={props.currentGDI}
                probs={props.probs}
                scenarioConfig={props.scenarioConfig}
                currentGoldPrice={props.currentGoldPrice}
                highlightVar={highlightVar}
                setHighlightVar={setHighlightVar}
                onVariableClick={props.onVariableClick}
                onScrollToChart={props.onScrollToChart}
                onScrollToScenarios={props.onScrollToScenarios}
              />
            </div>
          )}
          <p className="text-[9px] text-muted-foreground/50 mt-3 text-center">
            Hover any variable to trace its path through the model. Click to drill down.
          </p>
        </div>
      )}
    </div>
  );
};

export default LogicMap;
