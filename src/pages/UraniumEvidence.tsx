import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Plus, Save, Edit2, X } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { fetchAllUraniumData } from '@/lib/uraniumDataFetcher';
import {
  computeUraniumAnchor, computeUraniumForces, computeUraniumLeverage,
  type UraniumAnchorResult, type UraniumForcesResult, type UraniumLeverageResult,
  type UraniumPrice, type UraniumSupplyDemand, type UraniumReactor,
} from '@/lib/uraniumEngine';
import type { MinerPrice } from '@/lib/leverageEngine';
import LoadingProgress from '@/components/LoadingProgress';
import Footer from '@/components/Footer';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/components/ui/use-toast';

const UraniumEvidence = () => {
  const [searchParams] = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState(searchParams.get('tab') || 'prices');

  const [prices, setPrices] = useState<UraniumPrice[]>([]);
  const [supplyDemand, setSupplyDemand] = useState<UraniumSupplyDemand[]>([]);
  const [reactors, setReactors] = useState<UraniumReactor[]>([]);
  const [minerPrices, setMinerPrices] = useState<MinerPrice[]>([]);

  // Edit states
  const [editingPrice, setEditingPrice] = useState<string | null>(null);
  const [editPriceValues, setEditPriceValues] = useState<{ spot: string; lt: string }>({ spot: '', lt: '' });
  const [newPriceDate, setNewPriceDate] = useState('');
  const [newPriceSpot, setNewPriceSpot] = useState('');
  const [newPriceLT, setNewPriceLT] = useState('');

  const [editingSD, setEditingSD] = useState<string | null>(null);
  const [editSDValues, setEditSDValues] = useState<{ mine: string; secondary: string; demand: string; contracting: string }>({ mine: '', secondary: '', demand: '', contracting: '' });
  const [newSDQuarter, setNewSDQuarter] = useState('');
  const [newSDMine, setNewSDMine] = useState('');
  const [newSDSecondary, setNewSDSecondary] = useState('');
  const [newSDDemand, setNewSDDemand] = useState('');
  const [newSDContracting, setNewSDContracting] = useState('');

  useEffect(() => {
    async function load() {
      try {
        const data = await fetchAllUraniumData();
        setPrices(data.prices);
        setSupplyDemand(data.supplyDemand);
        setReactors(data.reactors);
        setMinerPrices(data.minerPrices);
      } catch (e: any) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  // ─── Price management ───
  const handleAddPrice = async () => {
    if (!newPriceDate || !newPriceSpot) return;
    const { error } = await supabase.from('uranium_prices').insert({
      date: newPriceDate,
      spot_price: parseFloat(newPriceSpot),
      lt_contract_price: newPriceLT ? parseFloat(newPriceLT) : null,
    });
    if (error) { toast({ title: 'Error', description: error.message, variant: 'destructive' }); return; }
    const newEntry: UraniumPrice = { date: newPriceDate, spot_price: parseFloat(newPriceSpot), lt_contract_price: newPriceLT ? parseFloat(newPriceLT) : null };
    setPrices(prev => [...prev, newEntry].sort((a, b) => a.date.localeCompare(b.date)));
    setNewPriceDate(''); setNewPriceSpot(''); setNewPriceLT('');
    toast({ title: 'Price added' });
  };

  const savePriceEdit = async (date: string) => {
    const { error } = await supabase.from('uranium_prices').update({
      spot_price: parseFloat(editPriceValues.spot),
      lt_contract_price: editPriceValues.lt ? parseFloat(editPriceValues.lt) : null,
    }).eq('date', date);
    if (error) { toast({ title: 'Error', description: error.message, variant: 'destructive' }); return; }
    setPrices(prev => prev.map(p => p.date === date ? { ...p, spot_price: parseFloat(editPriceValues.spot), lt_contract_price: editPriceValues.lt ? parseFloat(editPriceValues.lt) : null } : p));
    setEditingPrice(null);
    toast({ title: 'Price updated' });
  };

  // ─── Supply/Demand management ───
  const handleAddSD = async () => {
    if (!newSDQuarter || !newSDMine || !newSDDemand) return;
    const { error } = await supabase.from('uranium_supply_demand').insert({
      quarter: newSDQuarter,
      mine_production_mlb: parseFloat(newSDMine),
      secondary_supply_mlb: parseFloat(newSDSecondary || '0'),
      reactor_demand_mlb: parseFloat(newSDDemand),
      contracting_mlb: parseFloat(newSDContracting || '0'),
    });
    if (error) { toast({ title: 'Error', description: error.message, variant: 'destructive' }); return; }
    const newEntry: UraniumSupplyDemand = {
      quarter: newSDQuarter,
      mine_production_mlb: parseFloat(newSDMine),
      secondary_supply_mlb: parseFloat(newSDSecondary || '0'),
      reactor_demand_mlb: parseFloat(newSDDemand),
      contracting_mlb: parseFloat(newSDContracting || '0'),
    };
    setSupplyDemand(prev => [...prev, newEntry].sort((a, b) => a.quarter.localeCompare(b.quarter)));
    setNewSDQuarter(''); setNewSDMine(''); setNewSDSecondary(''); setNewSDDemand(''); setNewSDContracting('');
    toast({ title: 'Supply/demand data added' });
  };

  const saveSDEdit = async (quarter: string) => {
    const { error } = await supabase.from('uranium_supply_demand').update({
      mine_production_mlb: parseFloat(editSDValues.mine),
      secondary_supply_mlb: parseFloat(editSDValues.secondary),
      reactor_demand_mlb: parseFloat(editSDValues.demand),
      contracting_mlb: parseFloat(editSDValues.contracting),
    }).eq('quarter', quarter);
    if (error) { toast({ title: 'Error', description: error.message, variant: 'destructive' }); return; }
    setSupplyDemand(prev => prev.map(sd => sd.quarter === quarter ? {
      ...sd,
      mine_production_mlb: parseFloat(editSDValues.mine),
      secondary_supply_mlb: parseFloat(editSDValues.secondary),
      reactor_demand_mlb: parseFloat(editSDValues.demand),
      contracting_mlb: parseFloat(editSDValues.contracting),
    } : sd));
    setEditingSD(null);
    toast({ title: 'Supply/demand updated' });
  };

  if (loading) return <LoadingProgress message="Loading uranium evidence..." />;

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="text-center">
          <h1 className="font-display text-2xl text-destructive mb-3">Error</h1>
          <p className="text-muted-foreground mb-4">{error}</p>
          <button onClick={() => window.location.reload()} className="px-5 py-2.5 bg-uranium/20 text-uranium rounded-lg font-medium">Retry</button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-[1200px] mx-auto px-4 sm:px-6 pt-4 pb-8">
        {/* Breadcrumb */}
        <div className="flex items-center justify-between mb-4">
          <Link to="/uranium/analysis" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft size={14} /> The Analysis
          </Link>
          <Link to="/uranium" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
            The Signal <ArrowRight size={14} />
          </Link>
        </div>

        <h1 className="font-display text-2xl text-uranium mb-1">Uranium Evidence</h1>
        <p className="text-muted-foreground text-sm mb-6">
          Data management for uranium prices, supply/demand, and reactor data.
        </p>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="w-full justify-start overflow-x-auto bg-card border border-border rounded-lg h-auto p-1 flex-nowrap">
            <TabsTrigger value="prices" className="text-xs data-[state=active]:bg-uranium/20 data-[state=active]:text-uranium whitespace-nowrap">
              Uranium Prices
            </TabsTrigger>
            <TabsTrigger value="supplydemand" className="text-xs data-[state=active]:bg-uranium/20 data-[state=active]:text-uranium whitespace-nowrap">
              Supply / Demand
            </TabsTrigger>
            <TabsTrigger value="miners" className="text-xs data-[state=active]:bg-uranium/20 data-[state=active]:text-uranium whitespace-nowrap">
              Miner Prices
            </TabsTrigger>
          </TabsList>

          {/* Prices Tab */}
          <TabsContent value="prices" className="mt-4">
            <div className="bg-card border border-border rounded-xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-secondary/30">
                      <th className="text-left p-3 text-xs font-semibold text-muted-foreground">Date</th>
                      <th className="text-right p-3 text-xs font-semibold text-muted-foreground">Spot ($/lb)</th>
                      <th className="text-right p-3 text-xs font-semibold text-muted-foreground">LT Contract ($/lb)</th>
                      <th className="text-right p-3 text-xs font-semibold text-muted-foreground w-20">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {prices.map(p => (
                      <tr key={p.date} className="border-b border-border/30">
                        <td className="p-3 font-mono text-sm">{p.date}</td>
                        {editingPrice === p.date ? (
                          <>
                            <td className="p-3 text-right">
                              <input type="number" value={editPriceValues.spot} onChange={e => setEditPriceValues(v => ({ ...v, spot: e.target.value }))} className="w-20 bg-secondary rounded px-2 py-1 text-right text-sm font-mono" />
                            </td>
                            <td className="p-3 text-right">
                              <input type="number" value={editPriceValues.lt} onChange={e => setEditPriceValues(v => ({ ...v, lt: e.target.value }))} className="w-20 bg-secondary rounded px-2 py-1 text-right text-sm font-mono" />
                            </td>
                            <td className="p-3 text-right flex gap-1 justify-end">
                              <button onClick={() => savePriceEdit(p.date)} className="p-1 text-bullish hover:bg-bullish/10 rounded"><Save size={14} /></button>
                              <button onClick={() => setEditingPrice(null)} className="p-1 text-muted-foreground hover:bg-secondary rounded"><X size={14} /></button>
                            </td>
                          </>
                        ) : (
                          <>
                            <td className="p-3 text-right font-mono">${p.spot_price.toFixed(1)}</td>
                            <td className="p-3 text-right font-mono">{p.lt_contract_price ? `$${p.lt_contract_price.toFixed(1)}` : '—'}</td>
                            <td className="p-3 text-right">
                              <button onClick={() => { setEditingPrice(p.date); setEditPriceValues({ spot: String(p.spot_price), lt: String(p.lt_contract_price || '') }); }} className="p-1 text-muted-foreground hover:text-foreground hover:bg-secondary rounded"><Edit2 size={14} /></button>
                            </td>
                          </>
                        )}
                      </tr>
                    ))}
                    {/* Add new row */}
                    <tr className="bg-secondary/10">
                      <td className="p-3"><input type="date" value={newPriceDate} onChange={e => setNewPriceDate(e.target.value)} className="bg-secondary rounded px-2 py-1 text-sm" /></td>
                      <td className="p-3 text-right"><input type="number" placeholder="Spot" value={newPriceSpot} onChange={e => setNewPriceSpot(e.target.value)} className="w-20 bg-secondary rounded px-2 py-1 text-right text-sm font-mono" /></td>
                      <td className="p-3 text-right"><input type="number" placeholder="LT" value={newPriceLT} onChange={e => setNewPriceLT(e.target.value)} className="w-20 bg-secondary rounded px-2 py-1 text-right text-sm font-mono" /></td>
                      <td className="p-3 text-right"><button onClick={handleAddPrice} className="p-1.5 text-uranium hover:bg-uranium/10 rounded"><Plus size={14} /></button></td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </TabsContent>

          {/* Supply/Demand Tab */}
          <TabsContent value="supplydemand" className="mt-4">
            <div className="bg-card border border-border rounded-xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-secondary/30">
                      <th className="text-left p-3 text-xs font-semibold text-muted-foreground">Quarter</th>
                      <th className="text-right p-3 text-xs font-semibold text-muted-foreground">Mine (Mlb)</th>
                      <th className="text-right p-3 text-xs font-semibold text-muted-foreground">Secondary</th>
                      <th className="text-right p-3 text-xs font-semibold text-muted-foreground">Demand</th>
                      <th className="text-right p-3 text-xs font-semibold text-muted-foreground">Contracting</th>
                      <th className="text-right p-3 text-xs font-semibold text-muted-foreground w-20">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {supplyDemand.map(sd => (
                      <tr key={sd.quarter} className="border-b border-border/30">
                        <td className="p-3 font-mono text-sm">{sd.quarter}</td>
                        {editingSD === sd.quarter ? (
                          <>
                            <td className="p-3 text-right"><input type="number" value={editSDValues.mine} onChange={e => setEditSDValues(v => ({ ...v, mine: e.target.value }))} className="w-16 bg-secondary rounded px-2 py-1 text-right text-sm font-mono" /></td>
                            <td className="p-3 text-right"><input type="number" value={editSDValues.secondary} onChange={e => setEditSDValues(v => ({ ...v, secondary: e.target.value }))} className="w-16 bg-secondary rounded px-2 py-1 text-right text-sm font-mono" /></td>
                            <td className="p-3 text-right"><input type="number" value={editSDValues.demand} onChange={e => setEditSDValues(v => ({ ...v, demand: e.target.value }))} className="w-16 bg-secondary rounded px-2 py-1 text-right text-sm font-mono" /></td>
                            <td className="p-3 text-right"><input type="number" value={editSDValues.contracting} onChange={e => setEditSDValues(v => ({ ...v, contracting: e.target.value }))} className="w-16 bg-secondary rounded px-2 py-1 text-right text-sm font-mono" /></td>
                            <td className="p-3 text-right flex gap-1 justify-end">
                              <button onClick={() => saveSDEdit(sd.quarter)} className="p-1 text-bullish hover:bg-bullish/10 rounded"><Save size={14} /></button>
                              <button onClick={() => setEditingSD(null)} className="p-1 text-muted-foreground hover:bg-secondary rounded"><X size={14} /></button>
                            </td>
                          </>
                        ) : (
                          <>
                            <td className="p-3 text-right font-mono">{sd.mine_production_mlb.toFixed(1)}</td>
                            <td className="p-3 text-right font-mono">{sd.secondary_supply_mlb.toFixed(1)}</td>
                            <td className="p-3 text-right font-mono">{sd.reactor_demand_mlb.toFixed(1)}</td>
                            <td className="p-3 text-right font-mono">{sd.contracting_mlb.toFixed(1)}</td>
                            <td className="p-3 text-right">
                              <button onClick={() => { setEditingSD(sd.quarter); setEditSDValues({ mine: String(sd.mine_production_mlb), secondary: String(sd.secondary_supply_mlb), demand: String(sd.reactor_demand_mlb), contracting: String(sd.contracting_mlb) }); }} className="p-1 text-muted-foreground hover:text-foreground hover:bg-secondary rounded"><Edit2 size={14} /></button>
                            </td>
                          </>
                        )}
                      </tr>
                    ))}
                    {/* Add new row */}
                    <tr className="bg-secondary/10">
                      <td className="p-3"><input type="text" placeholder="2026-Q2" value={newSDQuarter} onChange={e => setNewSDQuarter(e.target.value)} className="w-24 bg-secondary rounded px-2 py-1 text-sm" /></td>
                      <td className="p-3 text-right"><input type="number" placeholder="Mine" value={newSDMine} onChange={e => setNewSDMine(e.target.value)} className="w-16 bg-secondary rounded px-2 py-1 text-right text-sm font-mono" /></td>
                      <td className="p-3 text-right"><input type="number" placeholder="Sec." value={newSDSecondary} onChange={e => setNewSDSecondary(e.target.value)} className="w-16 bg-secondary rounded px-2 py-1 text-right text-sm font-mono" /></td>
                      <td className="p-3 text-right"><input type="number" placeholder="Dem." value={newSDDemand} onChange={e => setNewSDDemand(e.target.value)} className="w-16 bg-secondary rounded px-2 py-1 text-right text-sm font-mono" /></td>
                      <td className="p-3 text-right"><input type="number" placeholder="Cont." value={newSDContracting} onChange={e => setNewSDContracting(e.target.value)} className="w-16 bg-secondary rounded px-2 py-1 text-right text-sm font-mono" /></td>
                      <td className="p-3 text-right"><button onClick={handleAddSD} className="p-1.5 text-uranium hover:bg-uranium/10 rounded"><Plus size={14} /></button></td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </TabsContent>

          {/* Miners Tab */}
          <TabsContent value="miners" className="mt-4">
            <div className="bg-card border border-border rounded-xl p-5">
              <p className="text-sm text-muted-foreground mb-3">
                URNM and U3O8 ETF prices are managed in the shared miner_prices table (ticker = 'URNM' or 'U3O8'). 
                Use the gold Evidence → Data Management tab to add/edit miner prices with the appropriate ticker.
              </p>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-secondary/30">
                      <th className="text-left p-3 text-xs font-semibold text-muted-foreground">Date</th>
                      <th className="text-left p-3 text-xs font-semibold text-muted-foreground">Ticker</th>
                      <th className="text-right p-3 text-xs font-semibold text-muted-foreground">Close Price</th>
                    </tr>
                  </thead>
                  <tbody>
                    {minerPrices.sort((a, b) => a.date.localeCompare(b.date)).map((mp, i) => (
                      <tr key={`${mp.date}-${mp.ticker}-${i}`} className="border-b border-border/30">
                        <td className="p-3 font-mono text-sm">{mp.date}</td>
                        <td className="p-3 text-sm"><span className={`px-2 py-0.5 rounded text-xs font-medium ${mp.ticker === 'URNM' ? 'bg-leverage-miner/20 text-leverage-miner' : 'bg-uranium/20 text-uranium'}`}>{mp.ticker}</span></td>
                        <td className="p-3 text-right font-mono">${mp.close_price.toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </TabsContent>
        </Tabs>

        <Footer />
      </div>
    </div>
  );
};

export default UraniumEvidence;
