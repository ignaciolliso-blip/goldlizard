import { useEffect, useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import UraniumMinerValuationPanel from '@/components/uranium/UraniumMinerValuationPanel';
import { fetchAllUraniumData } from '@/lib/uraniumDataFetcher';
import {
  computeUraniumAnchor, computeUraniumForces, computeUraniumLeverage,
  type UraniumAnchorResult, type UraniumForcesResult, type UraniumLeverageResult, type UraniumPrice, type UraniumSupplyDemand, type UraniumReactor,
} from '@/lib/uraniumEngine';
import type { MinerPrice } from '@/lib/leverageEngine';
import LoadingProgress from '@/components/LoadingProgress';
import PageIntro from '@/components/PageIntro';
import NarratorPanel from '@/components/NarratorPanel';
import UraniumSignalLenses from '@/components/uranium/UraniumSignalLenses';
import UraniumProjectionTable from '@/components/uranium/UraniumProjectionTable';
import UraniumPositioning from '@/components/uranium/UraniumPositioning';
import Footer from '@/components/Footer';

const UraniumSignal = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [anchorResult, setAnchorResult] = useState<UraniumAnchorResult | null>(null);
  const [forcesResult, setForcesResult] = useState<UraniumForcesResult | null>(null);
  const [leverageResult, setLeverageResult] = useState<UraniumLeverageResult | null>(null);
  const [rawData, setRawData] = useState<{
    prices: UraniumPrice[];
    supplyDemand: UraniumSupplyDemand[];
    reactors: UraniumReactor[];
    minerPrices: MinerPrice[];
  } | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const data = await fetchAllUraniumData();
        setRawData(data);

        setAnchorResult(computeUraniumAnchor(data.prices));
        setForcesResult(computeUraniumForces(data.supplyDemand));
        setLeverageResult(computeUraniumLeverage(data.prices, data.minerPrices, data.valuations));
      } catch (e: any) {
        setError(e.message || 'Failed to load uranium data');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const spotPrice = anchorResult?.spotPrice ?? 0;

  const dashboardData = useMemo(() => {
    let text = `Uranium Spot: $${spotPrice.toFixed(0)}/lb`;
    if (anchorResult) text += `\nAnchor zone: ${anchorResult.zoneLabel}, ${anchorResult.gapToGreenfield.toFixed(1)}% gap to greenfield incentive`;
    if (forcesResult) text += `\nForces: deficit=${forcesResult.deficit.toFixed(1)} Mlb (${forcesResult.deficitPct.toFixed(1)}%), demand=${forcesResult.demandSignal}, supply=${forcesResult.supplySignal}`;
    if (leverageResult) text += `\nLeverage: Sector P/NAV ${leverageResult.sectorPNAV.toFixed(2)}× (hist. avg ${leverageResult.historicalAvgPNAV.toFixed(2)}×)`;
    return text;
  }, [spotPrice, anchorResult, forcesResult, leverageResult]);

  const dataHash = useMemo(() => {
    const parts = [
      `spot:${spotPrice.toFixed(0)}`,
      anchorResult ? `zone:${anchorResult.zoneLabel}` : '',
      forcesResult ? `deficit:${forcesResult.deficit.toFixed(1)}` : '',
      leverageResult ? `pnav:${leverageResult.sectorPNAV.toFixed(2)}` : '',
    ].filter(Boolean).join('|');
    return parts;
  }, [spotPrice, anchorResult, forcesResult, leverageResult]);

  if (loading) return <LoadingProgress message="Loading uranium data..." />;

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="text-center">
          <h1 className="font-display text-2xl text-destructive mb-3">Error</h1>
          <p className="text-muted-foreground mb-4">{error}</p>
          <button onClick={() => window.location.reload()} className="px-5 py-2.5 bg-uranium/20 text-uranium rounded-lg font-medium hover:bg-uranium/30 transition-colors">
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-[1200px] mx-auto px-4 sm:px-6 pt-6 pb-8 space-y-10">
        {/* Page intro */}
        <PageIntro storageKey="uranium_signal_intro_dismissed">
          <h3 className="font-display text-foreground mb-3">How to Read This Page</h3>
          <p className="text-muted-foreground leading-relaxed mb-4">
            This page answers one question: <span className="text-foreground font-medium">should you buy, hold, or sell uranium miners?</span>
          </p>
          <p className="text-muted-foreground leading-relaxed mb-2">It uses three independent lenses:</p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
            <div className="bg-secondary/30 rounded-lg p-3">
              <span className="text-uranium font-semibold">THE ANCHOR</span>
              <span className="text-muted-foreground ml-2">Is uranium priced above or below the cost of producing it?</span>
            </div>
            <div className="bg-secondary/30 rounded-lg p-3">
              <span className="text-uranium font-semibold">THE FORCES</span>
              <span className="text-muted-foreground ml-2">Is the supply-demand gap widening or narrowing?</span>
            </div>
            <div className="bg-secondary/30 rounded-lg p-3">
              <span className="text-uranium font-semibold">THE LEVERAGE</span>
              <span className="text-muted-foreground ml-2">Are uranium miners cheap or expensive relative to the commodity?</span>
            </div>
          </div>
          <p className="text-muted-foreground text-sm mt-3">
            Uranium is different from gold. Gold is a monetary asset — its price reflects money supply and fear. 
            Uranium is an industrial fuel — its price reflects the gap between how much the world needs and how much 
            it can produce. Nuclear reactors MUST have fuel. There is no substitute.
          </p>
        </PageIntro>

        {/* Band 1: Three Lenses */}
        <UraniumSignalLenses
          anchorResult={anchorResult}
          forcesResult={forcesResult}
          leverageResult={leverageResult}
        />

        {/* Band 2: Projection Table */}
        <div className="space-y-3">
          <div>
            <h3 className="font-display text-foreground">Where Is Uranium Heading?</h3>
            <p className="text-muted-foreground text-sm mt-1">
              Projections based on the supply-demand deficit trajectory. The "Greenfield Cost" row rises with 
              inflation — this is the minimum price the market needs to sustain long-term supply growth. 
              The "Supply-Gap EV" is the probability-weighted estimate based on deficit projections.
            </p>
          </div>
          <UraniumProjectionTable
            anchorResult={anchorResult}
            forcesResult={forcesResult}
            leverageResult={leverageResult}
          />
        </div>

        {/* Band 3: Positioning */}
        <div className="space-y-3">
          <p className="text-muted-foreground text-sm">Based on the combined reading of all three lenses:</p>
          <UraniumPositioning
            anchorResult={anchorResult}
            forcesResult={forcesResult}
            leverageResult={leverageResult}
          />
        </div>

        {/* Miner Valuation Panel */}
        <UraniumMinerValuationPanel uraniumSpotPrice={anchorResult?.spotPrice ?? 78} />

        {/* AI Narrator */}
        {anchorResult && (
          <NarratorPanel
            asset="uranium"
            currentPrice={anchorResult.spotPrice ?? 0}
            dashboardData={dashboardData}
            dataHash={dataHash}
            accentColor="uranium"
          />
        )}

        {/* Navigation CTA */}
        <div className="text-center">
          <Link
            to="/uranium/analysis"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-card border border-border text-foreground font-medium hover:border-uranium/30 hover:shadow-[0_0_15px_-5px_hsl(var(--uranium)/0.3)] transition-all duration-200"
          >
            Explore Analysis <ArrowRight size={16} />
          </Link>
        </div>

        <Footer />
      </div>
    </div>
  );
};

export default UraniumSignal;
