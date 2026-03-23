import { useEffect, useState, useMemo, useRef, useCallback } from 'react';
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
import CentralBankManager from '@/components/CentralBankManager';
import NarratorPanel from '@/components/NarratorPanel';
import LogicMap from '@/components/LogicMap';
import { GuideModeProvider } from '@/components/GuideMode';

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

  const heroChartRef = useRef<HTMLDivElement>(null);
  const scenarioRef = useRef<HTMLDivElement>(null);
  const componentRef = useRef<HTMLDivElement>(null);

  const scrollToChart = useCallback(() => heroChartRef.current?.scrollIntoView({ behavior: 'smooth' }), []);
  const scrollToScenarios = useCallback(() => scenarioRef.current?.scrollIntoView({ behavior: 'smooth' }), []);
  const handleLogicMapVarClick = useCallback((varId: string) => {
    componentRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);
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
          data.fredResults, data.centralBank, data.errors, 'fixed', data.goldSpot
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
      rawData.fredResults, rawData.centralBank, rawData.errors, weightMode, rawData.goldSpot
    );
    setGdiResult(result);
  }, [weightMode, rawData]);

  const currentGDI = gdiResult ? gdiResult.gdiValues[gdiResult.gdiValues.length - 1] : 0;

  const { probs, forecastPoints } = useMemo(() => {
    if (!gdiResult || !scenarioConfig) {
      return { probs: { bull: 0.33, base: 0.34, bear: 0.33 } as ScenarioProbabilities, forecastPoints: [] as ForecastPoint[] };
    }
    const p = computeScenarioProbabilities(currentGDI);
    const goldData = rawData?.goldSpot || [];
    const lastGoldPrice = goldData.length > 0 ? goldData[goldData.length - 1].value : 3000;
    const fp = buildForecastPoints(lastGoldPrice, scenarioConfig.scenarios, p);
    return { probs: p, forecastPoints: fp };
  }, [currentGDI, scenarioConfig, rawData]);

  if (loading) return <LoadingProgress message={statusMsg} />;

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="text-center">
          <h1 className="font-display text-xl sm:text-2xl text-bearish mb-2">Error</h1>
          <p className="text-muted-foreground text-sm mb-4">{error}</p>
          <button onClick={() => window.location.reload()} className="px-4 py-2 bg-gold/20 text-gold rounded text-sm font-medium hover:bg-gold/30 transition-colors">
            Retry
          </button>
        </div>
      </div>
    );
  }

  const goldFutures = rawData?.goldSpot || [];
  const goldSpot = rawData?.goldSpot?.length ? rawData.goldSpot : goldFutures;
  const currentGoldPrice = goldSpot.length > 0 ? goldSpot[goldSpot.length - 1].value : 3000;


  return (
    <GuideModeProvider>
      <div className="min-h-screen">
        <DashboardHeader
          currentGDI={currentGDI}
          weightMode={weightMode}
          onWeightModeChange={setWeightMode}
          lastUpdated={lastUpdated}
        />

        <div className="pt-16 sm:pt-20 pb-8 px-3 sm:px-6 max-w-[1600px] mx-auto space-y-4 sm:space-y-6">
          {/* Scenario probability bar */}
          <div className="flex flex-wrap items-center gap-2 sm:gap-4 text-[10px] sm:text-xs">
            <span className="text-muted-foreground">Scenario Probabilities:</span>
            <span className="text-bullish font-mono">Bull {(probs.bull * 100).toFixed(0)}%</span>
            <span className="text-gold font-mono">Base {(probs.base * 100).toFixed(0)}%</span>
            <span className="text-bearish font-mono">Bear {(probs.bear * 100).toFixed(0)}%</span>
            <div className="flex-1 min-w-[100px] h-1.5 rounded-full overflow-hidden flex bg-card border border-card-border">
              <div className="bg-bullish transition-all" style={{ width: `${probs.bull * 100}%` }} />
              <div className="bg-gold transition-all" style={{ width: `${probs.base * 100}%` }} />
              <div className="bg-bearish transition-all" style={{ width: `${probs.bear * 100}%` }} />
            </div>
          </div>

          {/* AI Narrator Panel */}
          {gdiResult && (
            <NarratorPanel
              gdiResult={gdiResult}
              goldSpot={goldSpot}
              currentGDI={currentGDI}
              probs={probs}
              scenarioConfig={scenarioConfig}
              currentGoldPrice={currentGoldPrice}
              weightMode={weightMode}
            />
          )}

          <div ref={heroChartRef}>
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
          </div>

          {/* Logic Map — between hero chart and component cards */}
          {gdiResult && scenarioConfig && (
            <LogicMap
              gdiResult={gdiResult}
              currentGDI={currentGDI}
              probs={probs}
              scenarioConfig={scenarioConfig}
              currentGoldPrice={currentGoldPrice}
              onVariableClick={handleLogicMapVarClick}
              onScrollToChart={scrollToChart}
              onScrollToScenarios={scrollToScenarios}
            />
          )}

          <div ref={componentRef}>
            {gdiResult && (
              <ComponentDashboard gdiResult={gdiResult} goldSpot={goldSpot} timeRange={timeRange} />
            )}
          </div>

          <div ref={scenarioRef}>
            {gdiResult && scenarioConfig && (
              <AnalysisPanel
                gdiResult={gdiResult}
                weightMode={weightMode}
                probs={probs}
                scenarioConfig={scenarioConfig}
                currentGDI={currentGDI}
                currentGoldPrice={currentGoldPrice}
                onScenarioUpdate={setScenarioConfig}
              />
            )}
          </div>

          {gdiResult && (
            <KeyInsightsStrip gdiResult={gdiResult} goldSpot={goldSpot} currentGDI={currentGDI} />
          )}

          {gdiResult && (
            <VariableTable variables={gdiResult.variableDetails} errors={rawData?.errors || []} />
          )}

          <CentralBankManager
            initialData={rawData?.centralBank || []}
            onDataChange={(newCbData) => {
              if (rawData) {
                setRawData({ ...rawData, centralBank: newCbData });
              }
            }}
          />
        </div>
      </div>
    </GuideModeProvider>
  );
};

export default Index;
