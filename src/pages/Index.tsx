import { useEffect, useState, useMemo } from 'react';
import { fetchAllData, type Observation, type CentralBankEntry } from '@/lib/dataFetcher';
import { calculateGDI, type GDIResult } from '@/lib/gdiEngine';
import { fetchScenarioTargets } from '@/lib/scenarioFetcher';
import {
  computeScenarioProbabilities, buildForecastPoints,
  type ScenarioConfig, type ForecastPoint, type ScenarioProbabilities,
} from '@/lib/scenarioEngine';
import DashboardHeader from '@/components/DashboardHeader';
import LoadingProgress from '@/components/LoadingProgress';
import VariableTable from '@/components/VariableTable';
import ComponentDashboard from '@/components/ComponentDashboard';
import HeroChart from '@/components/HeroChart';
import AnalysisPanel from '@/components/AnalysisPanel';
import KeyInsightsStrip from '@/components/KeyInsightsStrip';

const Index = () => {
  const [loading, setLoading] = useState(true);
  const [statusMsg, setStatusMsg] = useState('Initializing...');
  const [gdiResult, setGdiResult] = useState<GDIResult | null>(null);
  const [weightMode, setWeightMode] = useState<'fixed' | 'rolling'>('fixed');
  const [error, setError] = useState<string | null>(null);
  const [rawData, setRawData] = useState<{
    fredResults: Record<string, Observation[]>;
    goldSpot: Observation[];
    centralBank: CentralBankEntry[];
    errors: string[];
  } | null>(null);
  const [scenarioConfig, setScenarioConfig] = useState<ScenarioConfig | null>(null);
  const [showFutures, setShowFutures] = useState(true);
  const [showBankConsensus, setShowBankConsensus] = useState(false);
  const [timeRange, setTimeRange] = useState('5Y');
  const [lastUpdated, setLastUpdated] = useState<string>('');

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
          data.fredResults,
          data.centralBank,
          data.errors,
          weightMode,
          data.goldSpot
        );
        setGdiResult(result);
        setLastUpdated(new Date().toLocaleString('en-US', {
          month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
        }));
      } catch (e: any) {
        setError(e.message || 'Failed to load data');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  // Recalculate when weight mode changes
  useEffect(() => {
    if (!rawData) return;
    const result = calculateGDI(
      rawData.fredResults,
      rawData.centralBank,
      rawData.errors,
      weightMode,
      rawData.goldSpot
    );
    setGdiResult(result);
  }, [weightMode, rawData]);

  const currentGDI = gdiResult ? gdiResult.gdiValues[gdiResult.gdiValues.length - 1] : 0;

  const { probs, forecastPoints } = useMemo(() => {
    if (!gdiResult || !scenarioConfig) {
      return { probs: { bull: 0.33, base: 0.34, bear: 0.33 } as ScenarioProbabilities, forecastPoints: [] as ForecastPoint[] };
    }

    const p = computeScenarioProbabilities(currentGDI);

    // Get current gold price (last available from gold futures or spot)
    const goldFuturesData = rawData?.goldSpot || [];
    const goldSpotData = rawData?.goldSpot || [];
    const lastGoldPrice =
      goldFuturesData.length > 0
        ? goldFuturesData[goldFuturesData.length - 1].value
        : goldSpotData.length > 0
          ? goldSpotData[goldSpotData.length - 1].value
          : 3000;

    const fp = buildForecastPoints(lastGoldPrice, scenarioConfig.scenarios, p);

    return { probs: p, forecastPoints: fp };
  }, [currentGDI, scenarioConfig, rawData]);

  if (loading) {
    return <LoadingProgress message={statusMsg} />;
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="font-display text-2xl text-bearish mb-2">Error</h1>
          <p className="text-muted-foreground">{error}</p>
        </div>
      </div>
    );
  }

  const goldFutures = rawData?.goldSpot || [];
  const goldSpot = rawData?.goldSpot?.length ? rawData.goldSpot : goldFutures;

  return (
    <div className="min-h-screen">
      <DashboardHeader
        currentGDI={currentGDI}
        weightMode={weightMode}
        onWeightModeChange={setWeightMode}
        lastUpdated={lastUpdated}
      />

      {/* Main content with top padding for fixed header */}
      <div className="pt-20 pb-8 px-6 max-w-[1600px] mx-auto space-y-6">
        {/* Scenario probability bar */}
        <div className="flex items-center gap-4 text-xs">
          <span className="text-muted-foreground">Scenario Probabilities:</span>
          <span className="text-bullish font-mono">Bull {(probs.bull * 100).toFixed(0)}%</span>
          <span className="text-gold font-mono">Base {(probs.base * 100).toFixed(0)}%</span>
          <span className="text-bearish font-mono">Bear {(probs.bear * 100).toFixed(0)}%</span>
          <div className="flex-1 h-1.5 rounded-full overflow-hidden flex bg-card border border-card-border">
            <div className="bg-bullish transition-all" style={{ width: `${probs.bull * 100}%` }} />
            <div className="bg-gold transition-all" style={{ width: `${probs.base * 100}%` }} />
            <div className="bg-bearish transition-all" style={{ width: `${probs.bear * 100}%` }} />
          </div>
        </div>

        {gdiResult && (
          <HeroChart
            gdiResult={gdiResult}
            goldSpot={goldSpot}
            goldFutures={goldFutures}
            forecastPoints={forecastPoints}
            probs={probs}
            showFutures={showFutures}
            onToggleFutures={() => setShowFutures(v => !v)}
            showBankConsensus={showBankConsensus}
            onToggleBankConsensus={() => setShowBankConsensus(v => !v)}
            timeRange={timeRange}
            onTimeRangeChange={setTimeRange}
          />
        )}

        {gdiResult && (
          <ComponentDashboard gdiResult={gdiResult} goldSpot={goldSpot} timeRange={timeRange} />
        )}

        {gdiResult && (
          <VariableTable
            variables={gdiResult.variableDetails}
            errors={rawData?.errors || []}
          />
        )}
      </div>
    </div>
  );
};

export default Index;
