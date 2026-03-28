import { useState } from 'react';
import { Pencil, Check, X, Plus, ExternalLink } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { CentralBankEntry, EtfFlowEntry } from '@/lib/gdiEngine';
import type { MinerPrice } from '@/lib/leverageEngine';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface Props {
  physicalDemand: CentralBankEntry[];
  etfFlows: EtfFlowEntry[];
  minerPrices: MinerPrice[];
  onPhysicalChange: (d: CentralBankEntry[]) => void;
  onEtfChange: (d: EtfFlowEntry[]) => void;
  onMinerChange: (d: MinerPrice[]) => void;
}

function generateQuarterOptions(existing: string[]): string[] {
  const set = new Set(existing);
  const opts: string[] = [];
  const currentYear = new Date().getFullYear();
  for (let y = currentYear + 1; y >= 2010; y--) {
    for (let q = 4; q >= 1; q--) {
      const key = `${y}-Q${q}`;
      if (!set.has(key)) opts.push(key);
    }
  }
  return opts;
}

function generateMonthOptions(existing: string[]): string[] {
  const set = new Set(existing);
  const opts: string[] = [];
  const now = new Date();
  for (let y = now.getFullYear(); y >= 2020; y--) {
    const maxM = y === now.getFullYear() ? now.getMonth() + 1 : 12;
    for (let m = maxM; m >= 1; m--) {
      const key = `${y}-${String(m).padStart(2, '0')}`;
      if (!set.has(key)) opts.push(key);
    }
  }
  return opts;
}

export default function DataManagement({ physicalDemand, etfFlows, minerPrices, onPhysicalChange, onEtfChange, onMinerChange }: Props) {
  const [data, setData] = useState(physicalDemand);
  const [etfData, setEtfData] = useState(etfFlows);
  const [minerData, setMinerData] = useState(minerPrices);
  const [loading, setLoading] = useState(false);

  // Physical demand editing
  const [editingQ, setEditingQ] = useState<string | null>(null);
  const [editTonnes, setEditTonnes] = useState(0);
  const [editBarCoin, setEditBarCoin] = useState(0);
  const [newQ, setNewQ] = useState('');
  const [newTonnes, setNewTonnes] = useState(0);
  const [newBarCoin, setNewBarCoin] = useState(0);

  // ETF editing
  const [editingMonth, setEditingMonth] = useState<string | null>(null);
  const [editFlows, setEditFlows] = useState(0);
  const [editHoldings, setEditHoldings] = useState(0);
  const [newMonth, setNewMonth] = useState('');
  const [newFlows, setNewFlows] = useState(0);
  const [newHoldings, setNewHoldings] = useState(0);

  // Miner editing
  const [newMinerDate, setNewMinerDate] = useState('');
  const [newMinerPrice, setNewMinerPrice] = useState(0);
  const [editingMinerDate, setEditingMinerDate] = useState<string | null>(null);
  const [editMinerPrice, setEditMinerPrice] = useState(0);

  const sortedData = [...data].sort((a, b) => b.quarter.localeCompare(a.quarter));
  const sortedEtf = [...etfData].sort((a, b) => b.month.localeCompare(a.month));
  const sortedMiners = [...minerData].sort((a, b) => b.date.localeCompare(a.date));

  // Physical demand handlers
  const handleAddPhysical = async () => {
    if (!newQ) return;
    setLoading(true);
    try {
      const { error } = await supabase.from('central_bank_gold').insert({ quarter: newQ, tonnes: newTonnes, bar_coin_tonnes: newBarCoin } as any);
      if (error) throw error;
      const updated = [...data, { quarter: newQ, tonnes: newTonnes, bar_coin_tonnes: newBarCoin }];
      setData(updated); onPhysicalChange(updated);
      setNewQ(''); setNewTonnes(0); setNewBarCoin(0);
      toast.success('Physical demand added');
    } catch (e: any) { toast.error(e.message); } finally { setLoading(false); }
  };

  const savePhysicalEdit = async (quarter: string) => {
    setLoading(true);
    try {
      const { error } = await supabase.from('central_bank_gold').update({ tonnes: editTonnes, bar_coin_tonnes: editBarCoin } as any).eq('quarter', quarter);
      if (error) throw error;
      const updated = data.map(d => d.quarter === quarter ? { ...d, tonnes: editTonnes, bar_coin_tonnes: editBarCoin } : d);
      setData(updated); onPhysicalChange(updated); setEditingQ(null);
      toast.success('Updated');
    } catch (e: any) { toast.error(e.message); } finally { setLoading(false); }
  };

  // ETF handlers
  const handleAddEtf = async () => {
    if (!newMonth) return;
    setLoading(true);
    try {
      const { error } = await supabase.from('etf_flows').insert({ month: newMonth, flows_usd_bn: newFlows, holdings_tonnes: newHoldings });
      if (error) throw error;
      const updated = [...etfData, { month: newMonth, flows_usd_bn: newFlows, holdings_tonnes: newHoldings }];
      setEtfData(updated); onEtfChange(updated);
      setNewMonth(''); setNewFlows(0); setNewHoldings(0);
      toast.success('ETF flow added');
    } catch (e: any) { toast.error(e.message); } finally { setLoading(false); }
  };

  const saveEtfEdit = async (month: string) => {
    setLoading(true);
    try {
      const { error } = await supabase.from('etf_flows').update({ flows_usd_bn: editFlows, holdings_tonnes: editHoldings }).eq('month', month);
      if (error) throw error;
      const updated = etfData.map(d => d.month === month ? { ...d, flows_usd_bn: editFlows, holdings_tonnes: editHoldings } : d);
      setEtfData(updated); onEtfChange(updated); setEditingMonth(null);
      toast.success('Updated');
    } catch (e: any) { toast.error(e.message); } finally { setLoading(false); }
  };

  // Miner handlers
  const handleAddMiner = async () => {
    if (!newMinerDate || !newMinerPrice) return;
    setLoading(true);
    try {
      const { error } = await supabase.from('miner_prices').insert({ date: newMinerDate, close_price: newMinerPrice, ticker: 'GDX' });
      if (error) throw error;
      const newEntry: MinerPrice = { date: newMinerDate, close_price: newMinerPrice, ticker: 'GDX' };
      const updated = [...minerData, newEntry];
      setMinerData(updated); onMinerChange(updated);
      setNewMinerDate(''); setNewMinerPrice(0);
      toast.success('Miner price added');
    } catch (e: any) { toast.error(e.message); } finally { setLoading(false); }
  };

  const saveMinerEdit = async (date: string) => {
    setLoading(true);
    try {
      const { error } = await supabase.from('miner_prices').update({ close_price: editMinerPrice }).eq('date', date).eq('ticker', 'GDX');
      if (error) throw error;
      const updated = minerData.map(d => d.date === date ? { ...d, close_price: editMinerPrice } : d);
      setMinerData(updated); onMinerChange(updated); setEditingMinerDate(null);
      toast.success('Updated');
    } catch (e: any) { toast.error(e.message); } finally { setLoading(false); }
  };

  const inputCls = "bg-secondary/30 border border-border/50 rounded px-2 py-1 text-xs font-mono text-foreground";

  return (
    <Tabs defaultValue="physical" className="w-full">
      <TabsList className="bg-card border border-border rounded-lg h-auto p-1">
        <TabsTrigger value="physical" className="text-xs data-[state=active]:bg-primary/20 data-[state=active]:text-primary">Physical Demand</TabsTrigger>
        <TabsTrigger value="etf" className="text-xs data-[state=active]:bg-primary/20 data-[state=active]:text-primary">ETF Flows</TabsTrigger>
        <TabsTrigger value="miners" className="text-xs data-[state=active]:bg-primary/20 data-[state=active]:text-primary">Miner Prices</TabsTrigger>
      </TabsList>

      {/* Physical Demand */}
      <TabsContent value="physical" className="mt-4">
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b border-border">
            <h3 className="text-sm font-semibold text-foreground">Physical Gold Demand (Quarterly)</h3>
            <p className="text-[10px] text-muted-foreground">
              Source: <a href="https://www.gold.org/goldhub/research/gold-demand-trends" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline inline-flex items-center gap-0.5">World Gold Council Quarterly Gold Demand Trends <ExternalLink className="w-2.5 h-2.5" /></a>
            </p>
          </div>
          <div className="max-h-80 overflow-y-auto">
            <table className="w-full text-xs">
              <thead className="sticky top-0 bg-card">
                <tr className="border-b border-border text-muted-foreground">
                  <th className="text-left px-3 py-2">Quarter</th>
                  <th className="text-right px-3 py-2">CB Tonnes</th>
                  <th className="text-right px-3 py-2">Bar/Coin</th>
                  <th className="text-right px-3 py-2">Total</th>
                  <th className="w-16" />
                </tr>
              </thead>
              <tbody>
                {sortedData.map((row, i) => (
                  <tr key={row.quarter} className={`border-b border-border/30 ${i % 2 ? 'bg-secondary/5' : ''}`}>
                    <td className="px-3 py-2 font-mono text-foreground">{row.quarter}</td>
                    {editingQ === row.quarter ? (
                      <>
                        <td className="px-2 py-1.5"><input type="number" value={editTonnes} onChange={e => setEditTonnes(Number(e.target.value))} className={`${inputCls} w-16 text-right`} /></td>
                        <td className="px-2 py-1.5"><input type="number" value={editBarCoin} onChange={e => setEditBarCoin(Number(e.target.value))} className={`${inputCls} w-16 text-right`} /></td>
                        <td className="px-3 py-2 text-right font-mono">{editTonnes + editBarCoin}</td>
                        <td className="px-2 py-2 text-right">
                          <button onClick={() => savePhysicalEdit(row.quarter)} className="text-bullish mr-1"><Check className="w-3 h-3 inline" /></button>
                          <button onClick={() => setEditingQ(null)} className="text-destructive"><X className="w-3 h-3 inline" /></button>
                        </td>
                      </>
                    ) : (
                      <>
                        <td className="px-3 py-2 text-right font-mono text-foreground">{row.tonnes}</td>
                        <td className="px-3 py-2 text-right font-mono text-foreground">{row.bar_coin_tonnes || 0}</td>
                        <td className="px-3 py-2 text-right font-mono text-foreground font-semibold">{row.tonnes + (row.bar_coin_tonnes || 0)}</td>
                        <td className="px-2 py-2 text-right">
                          <button onClick={() => { setEditingQ(row.quarter); setEditTonnes(row.tonnes); setEditBarCoin(row.bar_coin_tonnes || 0); }} className="text-muted-foreground hover:text-foreground"><Pencil className="w-3 h-3" /></button>
                        </td>
                      </>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex flex-wrap items-end gap-2 p-3 border-t border-border">
            <div><label className="text-[9px] text-muted-foreground block">Quarter</label>
              <select value={newQ} onChange={e => setNewQ(e.target.value)} className={`${inputCls} block`}>
                <option value="">Select</option>
                {generateQuarterOptions(data.map(d => d.quarter)).slice(0, 12).map(q => <option key={q} value={q}>{q}</option>)}
              </select>
            </div>
            <div><label className="text-[9px] text-muted-foreground block">CB Tonnes</label>
              <input type="number" value={newTonnes} onChange={e => setNewTonnes(Number(e.target.value))} className={`${inputCls} w-20 block`} />
            </div>
            <div><label className="text-[9px] text-muted-foreground block">Bar/Coin</label>
              <input type="number" value={newBarCoin} onChange={e => setNewBarCoin(Number(e.target.value))} className={`${inputCls} w-20 block`} />
            </div>
            <button onClick={handleAddPhysical} disabled={!newQ || loading} className="flex items-center gap-1 px-3 py-1.5 bg-primary/20 text-primary rounded text-xs font-medium hover:bg-primary/30 disabled:opacity-50">
              <Plus className="w-3 h-3" /> Add
            </button>
          </div>
        </div>
      </TabsContent>

      {/* ETF Flows */}
      <TabsContent value="etf" className="mt-4">
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b border-border">
            <h3 className="text-sm font-semibold text-foreground">ETF Flows (Monthly)</h3>
            <p className="text-[10px] text-muted-foreground">
              Source: <a href="https://www.gold.org/goldhub/data/gold-etfs-holdings-and-flows" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline inline-flex items-center gap-0.5">World Gold Council Monthly ETF Reports <ExternalLink className="w-2.5 h-2.5" /></a>
            </p>
          </div>
          <div className="max-h-80 overflow-y-auto">
            <table className="w-full text-xs">
              <thead className="sticky top-0 bg-card">
                <tr className="border-b border-border text-muted-foreground">
                  <th className="text-left px-3 py-2">Month</th>
                  <th className="text-right px-3 py-2">Flows ($B)</th>
                  <th className="text-right px-3 py-2">Holdings (t)</th>
                  <th className="w-16" />
                </tr>
              </thead>
              <tbody>
                {sortedEtf.map((row, i) => (
                  <tr key={row.month} className={`border-b border-border/30 ${i % 2 ? 'bg-secondary/5' : ''}`}>
                    <td className="px-3 py-2 font-mono text-foreground">{row.month}</td>
                    {editingMonth === row.month ? (
                      <>
                        <td className="px-2 py-1.5"><input type="number" step="0.1" value={editFlows} onChange={e => setEditFlows(Number(e.target.value))} className={`${inputCls} w-20 text-right`} /></td>
                        <td className="px-2 py-1.5"><input type="number" value={editHoldings} onChange={e => setEditHoldings(Number(e.target.value))} className={`${inputCls} w-20 text-right`} /></td>
                        <td className="px-2 py-2 text-right">
                          <button onClick={() => saveEtfEdit(row.month)} className="text-bullish mr-1"><Check className="w-3 h-3 inline" /></button>
                          <button onClick={() => setEditingMonth(null)} className="text-destructive"><X className="w-3 h-3 inline" /></button>
                        </td>
                      </>
                    ) : (
                      <>
                        <td className={`px-3 py-2 text-right font-mono ${row.flows_usd_bn > 0 ? 'text-bullish' : row.flows_usd_bn < 0 ? 'text-destructive' : 'text-foreground'}`}>
                          {row.flows_usd_bn > 0 ? '+' : ''}{row.flows_usd_bn.toFixed(1)}
                        </td>
                        <td className="px-3 py-2 text-right font-mono text-foreground">{Math.round(row.holdings_tonnes).toLocaleString()}</td>
                        <td className="px-2 py-2 text-right">
                          <button onClick={() => { setEditingMonth(row.month); setEditFlows(row.flows_usd_bn); setEditHoldings(row.holdings_tonnes); }} className="text-muted-foreground hover:text-foreground"><Pencil className="w-3 h-3" /></button>
                        </td>
                      </>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex flex-wrap items-end gap-2 p-3 border-t border-border">
            <div><label className="text-[9px] text-muted-foreground block">Month</label>
              <select value={newMonth} onChange={e => setNewMonth(e.target.value)} className={`${inputCls} block`}>
                <option value="">Select</option>
                {generateMonthOptions(etfData.map(d => d.month)).slice(0, 12).map(m => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
            <div><label className="text-[9px] text-muted-foreground block">Flows ($B)</label>
              <input type="number" step="0.1" value={newFlows} onChange={e => setNewFlows(Number(e.target.value))} className={`${inputCls} w-20 block`} />
            </div>
            <div><label className="text-[9px] text-muted-foreground block">Holdings (t)</label>
              <input type="number" value={newHoldings} onChange={e => setNewHoldings(Number(e.target.value))} className={`${inputCls} w-20 block`} />
            </div>
            <button onClick={handleAddEtf} disabled={!newMonth || loading} className="flex items-center gap-1 px-3 py-1.5 bg-primary/20 text-primary rounded text-xs font-medium hover:bg-primary/30 disabled:opacity-50">
              <Plus className="w-3 h-3" /> Add
            </button>
          </div>
        </div>
      </TabsContent>

      {/* Miner Prices */}
      <TabsContent value="miners" className="mt-4">
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b border-border">
            <h3 className="text-sm font-semibold text-foreground">GDX Closing Prices</h3>
            <p className="text-[10px] text-muted-foreground">
              Update monthly from <a href="https://finance.yahoo.com/quote/GDX/history/" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline inline-flex items-center gap-0.5">Yahoo Finance <ExternalLink className="w-2.5 h-2.5" /></a>
            </p>
          </div>
          <div className="max-h-80 overflow-y-auto">
            <table className="w-full text-xs">
              <thead className="sticky top-0 bg-card">
                <tr className="border-b border-border text-muted-foreground">
                  <th className="text-left px-3 py-2">Date</th>
                  <th className="text-right px-3 py-2">Close Price</th>
                  <th className="w-16" />
                </tr>
              </thead>
              <tbody>
                {sortedMiners.map((row, i) => (
                  <tr key={row.date} className={`border-b border-border/30 ${i % 2 ? 'bg-secondary/5' : ''}`}>
                    <td className="px-3 py-2 font-mono text-foreground">{row.date}</td>
                    {editingMinerDate === row.date ? (
                      <>
                        <td className="px-2 py-1.5"><input type="number" step="0.01" value={editMinerPrice} onChange={e => setEditMinerPrice(Number(e.target.value))} className={`${inputCls} w-24 text-right`} /></td>
                        <td className="px-2 py-2 text-right">
                          <button onClick={() => saveMinerEdit(row.date)} className="text-bullish mr-1"><Check className="w-3 h-3 inline" /></button>
                          <button onClick={() => setEditingMinerDate(null)} className="text-destructive"><X className="w-3 h-3 inline" /></button>
                        </td>
                      </>
                    ) : (
                      <>
                        <td className="px-3 py-2 text-right font-mono text-foreground">${row.close_price.toFixed(2)}</td>
                        <td className="px-2 py-2 text-right">
                          <button onClick={() => { setEditingMinerDate(row.date); setEditMinerPrice(row.close_price); }} className="text-muted-foreground hover:text-foreground"><Pencil className="w-3 h-3" /></button>
                        </td>
                      </>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex flex-wrap items-end gap-2 p-3 border-t border-border">
            <div><label className="text-[9px] text-muted-foreground block">Date</label>
              <input type="date" value={newMinerDate} onChange={e => setNewMinerDate(e.target.value)} className={`${inputCls} block`} />
            </div>
            <div><label className="text-[9px] text-muted-foreground block">Close Price ($)</label>
              <input type="number" step="0.01" value={newMinerPrice} onChange={e => setNewMinerPrice(Number(e.target.value))} className={`${inputCls} w-24 block`} />
            </div>
            <button onClick={handleAddMiner} disabled={!newMinerDate || !newMinerPrice || loading} className="flex items-center gap-1 px-3 py-1.5 bg-primary/20 text-primary rounded text-xs font-medium hover:bg-primary/30 disabled:opacity-50">
              <Plus className="w-3 h-3" /> Add
            </button>
          </div>
        </div>
      </TabsContent>
    </Tabs>
  );
}
