import { useEffect, useState, useMemo, useRef, useCallback } from 'react';
import { fetchAllData, type Observation, type CentralBankEntry, type EtfFlowEntry, type MinerPrice } from '@/lib/dataFetcher';
import { calculateGDI, type GDIResult } from '@/lib/gdiEngine';
import { fetchScenarioTargets } from '@/lib/scenarioFetcher';
import {
  computeScenarioProbabilities, buildForecastPoints, computeForwardGDI, computeHorizonProbabilities,
  type ScenarioConfig, type ForecastPoint, type ScenarioProbabilities,
} from '@/lib/scenarioEngine';
import { computeAnchor, type AnchorResult } from '@/lib/anchorEngine';
import { computeLeverage, type LeverageResult } from '@/lib/leverageEngine';
import { DEFAULT_PROJECTIONS, type ProjectionRow } from '@/lib/constants';
import DashboardHeader from '@/components/DashboardHeader';
import LoadingProgress from '@/components/LoadingProgress';
import VariableTable from '@/components/VariableTable';
import ComponentDashboard from '@/components/ComponentDashboard';
import HeroChart from '@/components/HeroChart';
import AnalysisPanel from '@/components/AnalysisPanel';
import KeyInsightsStrip from '@/components/KeyInsightsStrip';
import DemandDataManager from '@/components/CentralBankManager';
import NarratorPanel from '@/components/NarratorPanel';
import LogicMap from '@/components/LogicMap';
import ProjectionAssumptions from '@/components/ProjectionAssumptions';
import DebugTable from '@/components/DebugTable';
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
    physicalDemand: CentralBankEntry[];
    etfFlows: EtfFlowEntry[];
    minerPrices: MinerPrice[];
    errors: string[];
  } | null>(null);
  const [scenarioConfig, setScenarioConfig] = useState<ScenarioConfig | null>(null);
  const [showFutures, setShowFutures] = useState(true);
  const [showBankConsensus, setShowBankConsensus] = useState(false);
  const [timeRange, setTimeRange] = useState('5Y');
  const [lastUpdated, setLastUpdated] = useState<string>('');
  const [projections, setProjections] = useState<ProjectionRow[]>([]);
  const [anchorResult, setAnchorResult] = useState<AnchorResult | null>(null);
  const [leverageResult, setLeverageResult] = useState<LeverageResult | null>(null);

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
          data.fredResults, data.physicalDemand, data.etfFlows, data.errors, 'fixed', data.goldSpot
        );
        setGdiResult(result);

        // Compute Anchor (Lens 1)
        const cpiData = data.fredResults['CPIAUCSL'] || [];
        const m2Data = data.fredResults['WM2NS'] || [];
        const anchor = computeAnchor(data.goldSpot, cpiData, m2Data, '2000');
        setAnchorResult(anchor);

        // Compute Leverage (Lens 3)
        const leverage = computeLeverage(data.goldSpot, data.minerPrices);
        setLeverageResult(leverage);

        // Initialize projections with current values
        const initialProjections: ProjectionRow[] = DEFAULT_PROJECTIONS.map(dp => {
          const detail = result.variableDetails.find(v => v.id === dp.variableId);
          return { ...dp, current: detail?.currentValue ?? 0 };
        });
        setProjections(initialProjections);

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
      rawData.fredResults, rawData.physicalDemand, rawData.etfFlows, rawData.errors, weightMode, rawData.goldSpot
    );
    setGdiResult(result);
  }, [weightMode, rawData]);

  const currentGDI = gdiResult ? gdiResult.gdiValues[gdiResult.gdiValues.length - 1] : 0;

  const { probs, forecastPoints, forwardGDI, horizonProbs } = useMemo(() => {
    if (!gdiResult || !scenarioConfig) {
      return {
        probs: { bull: 0.33, base: 0.34, bear: 0.33 } as ScenarioProbabilities,
        forecastPoints: [] as ForecastPoint[],
        forwardGDI: {} as Record<string, number>,
        horizonProbs: {} as Record<string, ScenarioProbabilities>,
      };
    }
    const p = computeScenarioProbabilities(currentGDI);
    const goldData = rawData?.goldSpot || [];
    const lastGoldPrice = goldData.length > 0 ? goldData[goldData.length - 1].value : 3000;

    const fGDI = projections.length > 0 ? computeForwardGDI(projections, gdiResult) : {};
    const hProbs = Object.keys(fGDI).length > 0 ? computeHorizonProbabilities(fGDI) : {};

    const fp = buildForecastPoints(lastGoldPrice, scenarioConfig.scenarios, p, hProbs);
    return { probs: p, forecastPoints: fp, forwardGDI: fGDI, horizonProbs: hProbs };
  }, [currentGDI, scenarioConfig, rawData, projections, gdiResult]);

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
          tierContributions={gdiResult?.tierContributions}
        />

        <div className="pt-28 sm:pt-32 pb-8 px-3 sm:px-6 max-w-[1600px] mx-auto space-y-4 sm:space-y-6">
          {/* Debug Table — Pipeline Validation */}
          <DebugTable
            rawData={rawData}
            gdiResult={gdiResult}
            anchorResult={anchorResult}
            leverageResult={leverageResult}
            currentGDI={currentGDI}
          />

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

          {/* Logic Map */}
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

          {/* Projection Assumptions */}
          {gdiResult && (
            <ProjectionAssumptions
              projections={projections}
              onProjectionsChange={setProjections}
              forwardGDI={forwardGDI}
              horizonProbs={horizonProbs}
            />
          )}

          {gdiResult && (
            <KeyInsightsStrip gdiResult={gdiResult} goldSpot={goldSpot} currentGDI={currentGDI} />
          )}

          {gdiResult && (
            <VariableTable variables={gdiResult.variableDetails} errors={rawData?.errors || []} />
          )}

          <DemandDataManager
            initialData={rawData?.physicalDemand || []}
            initialEtfFlows={rawData?.etfFlows || []}
            onDataChange={(newData) => {
              if (rawData) {
                setRawData({ ...rawData, physicalDemand: newData });
              }
            }}
            onEtfFlowsChange={(newFlows) => {
              if (rawData) {
                setRawData({ ...rawData, etfFlows: newFlows });
              }
            }}
          />
        </div>
      </div>
    </GuideModeProvider>
  );
};

export default Index;
