import { useState, useEffect } from "react";
import { fetchCopperMarketData, fetchCopperJurisdictions, fetchCopperForces, fetchCopperEquities, fetchCopperSupplyDemand, type CopperMarketData, type CopperJurisdiction, type CopperForce, type CopperEquityName, type CopperSupplyDemandRow } from "@/lib/copperDataFetcher";
import { computeCopperAnchor, type CopperAnchorResult } from "@/lib/copperEngine";
import CopperAnchorGauge from "@/components/copper/CopperAnchorGauge";
import CopperHonestFindings from "@/components/copper/CopperHonestFindings";
import CopperForcesCard from "@/components/copper/CopperForcesCard";
import CopperJurisdictionTable from "@/components/copper/CopperJurisdictionTable";
import CopperEquityTiers from "@/components/copper/CopperEquityTiers";
import CopperSupplyDemandCharts from "@/components/copper/CopperSupplyDemandCharts";
import Footer from "@/components/Footer";
import LoadingProgress from "@/components/LoadingProgress";

const CopperSignal = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [marketData, setMarketData] = useState<CopperMarketData | null>(null);
  const [jurisdictions, setJurisdictions] = useState<CopperJurisdiction[]>([]);
  const [forces, setForces] = useState<CopperForce[]>([]);
  const [equities, setEquities] = useState<CopperEquityName[]>([]);
  const [supplyDemand, setSupplyDemand] = useState<CopperSupplyDemandRow[]>([]);
  const [anchorResult, setAnchorResult] = useState<CopperAnchorResult | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const [md, jur, frc, eq, sd] = await Promise.all([
          fetchCopperMarketData(),
          fetchCopperJurisdictions(),
          fetchCopperForces(),
          fetchCopperEquities(),
          fetchCopperSupplyDemand(),
        ]);
        setMarketData(md);
        setJurisdictions(jur);
        setForces(frc);
        setEquities(eq);
        setSupplyDemand(sd);
        if (md) setAnchorResult(computeCopperAnchor(md));
      } catch (e: any) {
        setError(e.message || "Failed to load copper data");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading) return <LoadingProgress message="Loading Copper data..." />;
  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-4">
          <p className="text-destructive">{error}</p>
          <button onClick={() => window.location.reload()} className="text-copper underline">Retry</button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <div className="max-w-[1200px] mx-auto px-4 sm:px-6 py-8 space-y-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="font-display text-3xl text-copper">Copper</h1>
            <p className="text-sm text-muted-foreground mt-1">Incentive Price Parity — The Anchor</p>
          </div>
          {marketData && (
            <div className="flex flex-col items-end gap-1">
              <span className="px-3 py-1.5 rounded-md bg-copper/10 text-copper font-mono text-lg font-semibold">
                ${Number(marketData.spot_price_lb).toFixed(2)}/lb&nbsp;(${Number(marketData.spot_price_tonne).toLocaleString()}/t)
              </span>
              <span className="text-xs text-muted-foreground">
                Last updated: {marketData.date}
              </span>
            </div>
          )}
        </div>

        {/* Anchor Gauge */}
        {anchorResult && marketData && (
          <CopperAnchorGauge anchor={anchorResult} marketData={marketData} />
        )}

        {/* Forces Scorecard */}
        {forces.length > 0 && (
          <div className="space-y-3">
            <h2 className="font-display text-xl text-copper">Forces</h2>
            <CopperForcesCard forces={forces} />
          </div>
        )}

        {/* Jurisdiction Risk */}
        {jurisdictions.length > 0 && (
          <div className="space-y-3">
            <h2 className="font-display text-xl text-copper">Leverage — Equity Positioning</h2>
            <CopperJurisdictionTable jurisdictions={jurisdictions} marketData={marketData} />
          </div>
        )}

        {/* Equity Tiers + Composite */}
        {equities.length > 0 && anchorResult && marketData && (
          <CopperEquityTiers
            equities={equities}
            marketData={marketData}
            anchorResult={anchorResult}
            forces={forces}
            jurisdictions={jurisdictions}
          />
        )}

        {/* Honest Findings */}
        <CopperHonestFindings />
      </div>
      <Footer />
    </div>
  );
};

export default CopperSignal;
