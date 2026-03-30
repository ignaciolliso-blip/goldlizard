import { useEffect, useState, useMemo, useCallback } from 'react';
import { fetchAllData, type Observation, type CentralBankEntry, type EtfFlowEntry, type MinerPrice } from '@/lib/dataFetcher';
import { calculateGDI, type GDIResult } from '@/lib/gdiEngine';
import { fetchScenarioTargets } from '@/lib/scenarioFetcher';
import {
  computeScenarioProbabilities, type ScenarioConfig, type ScenarioProbabilities,
} from '@/lib/scenarioEngine';
import { computeAnchor, type AnchorResult } from '@/lib/anchorEngine';
import { computeLeverage, type LeverageResult, projectGDXGoldRatio } from '@/lib/leverageEngine';
import LoadingProgress from '@/components/LoadingProgress';
import SignalLenses from '@/components/signal/SignalLenses';
import SignalProjectionTable from '@/components/signal/SignalProjectionTable';
import SignalPositioning from '@/components/signal/SignalPositioning';
import NarratorPanel from '@/components/NarratorPanel';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';

const Index = () => {
  const [loading, setLoading] = useState(true);
  const [statusMsg, setStatusMsg] = useState('Initializing...');
  const [error, setError] = useState<string | null>(null);
  const [gdiResult, setGdiResult] = useState<GDIResult | null>(null);
  const [anchorResult, setAnchorResult] = useState<AnchorResult | null>(null);
  const [leverageResult, setLeverageResult] = useState<LeverageResult | null>(null);
  const [scenarioConfig, setScenarioConfig] = useState<ScenarioConfig | null>(null);
  const [rawData, setRawData] = useState<{
    fredResults: Record<string, Observation[]>;
    goldSpot: Observation[];
    physicalDemand: CentralBankEntry[];
    etfFlows: EtfFlowEntry[];
    minerPrices: MinerPrice[];
    errors: string[];
  } | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const [data, scenarios] = await Promise.all([
          fetchAllData(setStatusMsg),
          fetchScenarioTargets(),
        ]);
        setRawData(data);
        setScenarioConfig(scenarios);

        setStatusMsg('Computing GDI...');
        const result = calculateGDI(
          data.fredResults, data.physicalDemand, data.etfFlows, data.errors, 'fixed', data.goldSpot
        );
        setGdiResult(result);

        const cpiData = data.fredResults['CPIAUCSL'] || [];
        const m2Data = data.fredResults['WM2NS'] || [];
        const anchor = computeAnchor(data.goldSpot, cpiData, m2Data, '2000');
        setAnchorResult(anchor);

        const leverage = computeLeverage(data.goldSpot, data.minerPrices);
        setLeverageResult(leverage);
      } catch (e: any) {
        setError(e.message || 'Failed to load data');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const currentGDI = gdiResult ? gdiResult.gdiValues[gdiResult.gdiValues.length - 1] : 0;
  const goldSpot = rawData?.goldSpot || [];
  const currentGoldPrice = goldSpot.length > 0 ? goldSpot[goldSpot.length - 1].value : 3000;

  const probs = useMemo(() => {
    return computeScenarioProbabilities(currentGDI);
  }, [currentGDI]);

  const currentGDXPrice = useMemo(() => {
    if (!rawData?.minerPrices.length) return 83;
    const sorted = [...rawData.minerPrices].sort((a, b) => a.date.localeCompare(b.date));
    return sorted[sorted.length - 1].close_price;
  }, [rawData]);

  if (loading) return <LoadingProgress message={statusMsg} />;

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="text-center">
          <h1 className="font-display text-xl sm:text-2xl text-bearish mb-2">Error</h1>
          <p className="text-muted-foreground text-sm mb-4">{error}</p>
          <button onClick={() => window.location.reload()} className="px-4 py-2 bg-primary/20 text-primary rounded text-sm font-medium hover:bg-primary/30 transition-colors">
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-[1200px] mx-auto px-4 sm:px-6 pt-8 pb-16 space-y-12">
        {/* Band 1: Three Lenses */}
        <SignalLenses
          anchorResult={anchorResult}
          gdiResult={gdiResult}
          leverageResult={leverageResult}
          currentGDI={currentGDI}
          currentGDXPrice={currentGDXPrice}
        />

        {/* Band 2: Projection Table */}
        <SignalProjectionTable
          anchorResult={anchorResult}
          leverageResult={leverageResult}
          scenarioConfig={scenarioConfig}
          currentGoldPrice={currentGoldPrice}
          currentGDXPrice={currentGDXPrice}
          currentGDI={currentGDI}
          probs={probs}
        />

        {/* Band 3: Positioning & Narrative */}
        <SignalPositioning
          anchorResult={anchorResult}
          gdiResult={gdiResult}
          leverageResult={leverageResult}
          currentGDI={currentGDI}
          currentGoldPrice={currentGoldPrice}
          currentGDXPrice={currentGDXPrice}
          probs={probs}
          scenarioConfig={scenarioConfig}
        />

        {/* AI Narrator */}
        {gdiResult && (
          <NarratorPanel
            gdiResult={gdiResult}
            goldSpot={goldSpot}
            currentGDI={currentGDI}
            probs={probs}
            scenarioConfig={scenarioConfig}
            currentGoldPrice={currentGoldPrice}
            weightMode="fixed"
          />
        )}

        {/* Footer */}
        <div className="text-center space-y-4">
          <p className="text-muted-foreground text-xs font-mono">
            5-Year Gold Expected CAGR: {(() => {
              if (!scenarioConfig?.scenarios?.length) return '—';
              const bull = scenarioConfig.scenarios.find(s => s.name === 'Bull');
              const base = scenarioConfig.scenarios.find(s => s.name === 'Base');
              const bear = scenarioConfig.scenarios.find(s => s.name === 'Bear');
              if (!bull || !base || !bear) return '—';
              const ev5y = probs.bull * bull.targets['5y'] + probs.base * base.targets['5y'] + probs.bear * bear.targets['5y'];
              const cagr = (Math.pow(ev5y / currentGoldPrice, 1 / 5) - 1) * 100;
              return `${cagr.toFixed(1)}% (vs. long-run avg 7.9%)`;
            })()}
            {leverageResult && (() => {
              const bull = scenarioConfig?.scenarios?.find(s => s.name === 'Bull');
              const base = scenarioConfig?.scenarios?.find(s => s.name === 'Base');
              const bear = scenarioConfig?.scenarios?.find(s => s.name === 'Bear');
              if (!bull || !base || !bear) return '';
              const ev5y = probs.bull * bull.targets['5y'] + probs.base * base.targets['5y'] + probs.bear * bear.targets['5y'];
              const projRatio = projectGDXGoldRatio(leverageResult.currentGDXGoldRatio, leverageResult.medianRatio, 5);
              const gdx5y = ev5y * projRatio;
              const gdxCagr = (Math.pow(gdx5y / currentGDXPrice, 1 / 5) - 1) * 100;
              return ` | 5-Year GDX Expected CAGR: ${gdxCagr.toFixed(1)}%`;
            })()}
          </p>
          <Link
            to="/analysis"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-card border border-border text-foreground font-medium hover:border-primary/50 transition-colors"
          >
            Explore Analysis <ArrowRight size={16} />
          </Link>
        </div>
      </div>
    </div>
  );
};

export default Index;
