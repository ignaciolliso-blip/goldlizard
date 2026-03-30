import { useEffect, useState, useMemo, useCallback } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { fetchAllData, type Observation, type CentralBankEntry, type EtfFlowEntry, type MinerPrice } from '@/lib/dataFetcher';
import { calculateGDI, type GDIResult } from '@/lib/gdiEngine';
import { fetchScenarioTargets } from '@/lib/scenarioFetcher';
import { computeScenarioProbabilities, computeForwardGDI, computeHorizonProbabilities, type ScenarioConfig } from '@/lib/scenarioEngine';
import { computeAnchor, type AnchorResult } from '@/lib/anchorEngine';
import { computeLeverage, type LeverageResult } from '@/lib/leverageEngine';
import { VARIABLE_CONFIG, DEFAULT_PROJECTIONS, type ProjectionRow } from '@/lib/constants';
import LoadingProgress from '@/components/LoadingProgress';
import VariableDrillDowns from '@/components/evidence/VariableDrillDowns';
import ProjectionAssumptionsTab from '@/components/evidence/ProjectionAssumptionsTab';
import ConvergenceAnalysis from '@/components/evidence/ConvergenceAnalysis';
import DataManagement from '@/components/evidence/DataManagement';
import Footer from '@/components/Footer';

const Evidence = () => {
  const [searchParams] = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [statusMsg, setStatusMsg] = useState('Initializing...');
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState(searchParams.get('tab') || 'drilldowns');

  const [rawData, setRawData] = useState<{
    fredResults: Record<string, Observation[]>;
    goldSpot: Observation[];
    physicalDemand: CentralBankEntry[];
    etfFlows: EtfFlowEntry[];
    minerPrices: MinerPrice[];
    errors: string[];
  } | null>(null);

  const [gdiResult, setGdiResult] = useState<GDIResult | null>(null);
  const [anchorResult, setAnchorResult] = useState<AnchorResult | null>(null);
  const [leverageResult, setLeverageResult] = useState<LeverageResult | null>(null);
  const [scenarioConfig, setScenarioConfig] = useState<ScenarioConfig | null>(null);

  // Projection state
  const [projections, setProjections] = useState<ProjectionRow[]>([]);

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
        setAnchorResult(computeAnchor(data.goldSpot, cpiData, m2Data, '2000'));
        setLeverageResult(computeLeverage(data.goldSpot, data.minerPrices));

        // Init projections with current values
        const projs: ProjectionRow[] = DEFAULT_PROJECTIONS.map(dp => {
          const detail = result.variableDetails.find(v => v.id === dp.variableId);
          return { ...dp, current: detail?.currentValue ?? 0 };
        });
        setProjections(projs);
      } catch (e: any) {
        setError(e.message || 'Failed to load data');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  // Set initial tab from URL params
  useEffect(() => {
    const tab = searchParams.get('tab');
    if (tab) setActiveTab(tab);
    const varId = searchParams.get('var');
    if (varId) setActiveTab('drilldowns');
  }, [searchParams]);

  const currentGDI = gdiResult ? gdiResult.gdiValues[gdiResult.gdiValues.length - 1] : 0;
  const goldSpot = rawData?.goldSpot || [];
  const currentGoldPrice = goldSpot.length > 0 ? goldSpot[goldSpot.length - 1].value : 3000;

  const currentGDXPrice = useMemo(() => {
    if (!rawData?.minerPrices.length) return 83;
    const sorted = [...rawData.minerPrices].sort((a, b) => a.date.localeCompare(b.date));
    return sorted[sorted.length - 1].close_price;
  }, [rawData]);

  const probs = useMemo(() => computeScenarioProbabilities(currentGDI), [currentGDI]);

  const forwardGDI = useMemo(() => {
    if (!gdiResult || !projections.length) return {};
    return computeForwardGDI(projections, gdiResult);
  }, [projections, gdiResult]);

  const horizonProbs = useMemo(() => computeHorizonProbabilities(forwardGDI), [forwardGDI]);

  if (loading) return <LoadingProgress message={statusMsg} />;

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="text-center">
          <h1 className="font-display text-xl text-destructive mb-2">Error</h1>
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
      <div className="max-w-[1200px] mx-auto px-4 sm:px-6 pt-4 pb-8">
        {/* Breadcrumb */}
        <div className="flex items-center justify-between mb-4">
          <Link to="/analysis" className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft size={14} /> The Analysis
          </Link>
          <Link to="/" className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors">
            The Signal <ArrowRight size={14} />
          </Link>
        </div>

        <h1 className="font-display text-2xl text-primary mb-1">The Evidence</h1>
        <p className="text-muted-foreground text-sm mb-6">
          Drill-downs, projection assumptions, convergence analysis, and data management.
        </p>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="w-full justify-start overflow-x-auto bg-card border border-border rounded-lg h-auto p-1 flex-nowrap">
            <TabsTrigger value="drilldowns" className="text-xs data-[state=active]:bg-primary/20 data-[state=active]:text-primary whitespace-nowrap">
              Variables & Drill-Downs
            </TabsTrigger>
            <TabsTrigger value="projections" className="text-xs data-[state=active]:bg-primary/20 data-[state=active]:text-primary whitespace-nowrap">
              Projection Assumptions
            </TabsTrigger>
            <TabsTrigger value="convergence" className="text-xs data-[state=active]:bg-primary/20 data-[state=active]:text-primary whitespace-nowrap">
              Convergence Analysis
            </TabsTrigger>
            <TabsTrigger value="data" className="text-xs data-[state=active]:bg-primary/20 data-[state=active]:text-primary whitespace-nowrap">
              Data Management
            </TabsTrigger>
          </TabsList>

          <TabsContent value="drilldowns" className="mt-4">
            {gdiResult && (
              <VariableDrillDowns
                gdiResult={gdiResult}
                goldSpot={goldSpot}
                anchorResult={anchorResult}
                leverageResult={leverageResult}
                initialVarId={searchParams.get('var') || undefined}
              />
            )}
          </TabsContent>

          <TabsContent value="projections" className="mt-4">
            {gdiResult && (
              <ProjectionAssumptionsTab
                projections={projections}
                onProjectionsChange={setProjections}
                forwardGDI={forwardGDI}
                horizonProbs={horizonProbs}
                gdiResult={gdiResult}
                scenarioConfig={scenarioConfig}
                currentGDI={currentGDI}
                currentGoldPrice={currentGoldPrice}
                onScenarioUpdate={setScenarioConfig}
              />
            )}
          </TabsContent>

          <TabsContent value="convergence" className="mt-4">
            <ConvergenceAnalysis
              anchorResult={anchorResult}
              gdiResult={gdiResult}
              leverageResult={leverageResult}
              currentGDI={currentGDI}
              currentGoldPrice={currentGoldPrice}
              currentGDXPrice={currentGDXPrice}
              scenarioConfig={scenarioConfig}
              probs={probs}
              forwardGDI={forwardGDI}
              horizonProbs={horizonProbs}
              projections={projections}
            />
          </TabsContent>

          <TabsContent value="data" className="mt-4">
            {rawData && (
              <DataManagement
                physicalDemand={rawData.physicalDemand}
                etfFlows={rawData.etfFlows}
                minerPrices={rawData.minerPrices}
                onPhysicalChange={(d) => setRawData(prev => prev ? { ...prev, physicalDemand: d } : prev)}
                onEtfChange={(d) => setRawData(prev => prev ? { ...prev, etfFlows: d } : prev)}
                onMinerChange={(d) => setRawData(prev => prev ? { ...prev, minerPrices: d } : prev)}
              />
            )}
          </TabsContent>
        </Tabs>

        <Footer />
      </div>
    </div>
  );
};

export default Evidence;
