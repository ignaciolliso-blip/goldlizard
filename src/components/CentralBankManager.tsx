import { useState } from 'react';
import { ChevronDown, ChevronUp, Pencil, Check, X, Plus, ExternalLink } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { CentralBankEntry, EtfFlowEntry } from '@/lib/gdiEngine';

interface CentralBankManagerProps {
  initialData: CentralBankEntry[];
  initialEtfFlows: EtfFlowEntry[];
  onDataChange: (data: CentralBankEntry[]) => void;
  onEtfFlowsChange: (data: EtfFlowEntry[]) => void;
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
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;
  for (let y = currentYear; y >= 2020; y--) {
    const maxMonth = y === currentYear ? currentMonth : 12;
    for (let m = maxMonth; m >= 1; m--) {
      const key = `${y}-${String(m).padStart(2, '0')}`;
      if (!set.has(key)) opts.push(key);
    }
  }
  return opts;
}

const CentralBankManager = ({ initialData, initialEtfFlows, onDataChange, onEtfFlowsChange }: CentralBankManagerProps) => {
  const [expanded, setExpanded] = useState(false);
  const [activeTab, setActiveTab] = useState<'physical' | 'etf' | 'structural'>('physical');

  // Physical demand state
  const [data, setData] = useState<CentralBankEntry[]>(initialData);
  const [editingQ, setEditingQ] = useState<string | null>(null);
  const [editTonnes, setEditTonnes] = useState(0);
  const [editBarCoin, setEditBarCoin] = useState(0);
  const [newQ, setNewQ] = useState('');
  const [newTonnes, setNewTonnes] = useState(0);
  const [newBarCoin, setNewBarCoin] = useState(0);
  const [loading, setLoading] = useState(false);

  // ETF flows state
  const [etfData, setEtfData] = useState<EtfFlowEntry[]>(initialEtfFlows);
  const [editingMonth, setEditingMonth] = useState<string | null>(null);
  const [editFlows, setEditFlows] = useState(0);
  const [editHoldings, setEditHoldings] = useState(0);
  const [newMonth, setNewMonth] = useState('');
  const [newFlows, setNewFlows] = useState(0);
  const [newHoldings, setNewHoldings] = useState(0);

  const sortedData = [...data].sort((a, b) => b.quarter.localeCompare(a.quarter));
  const sortedEtf = [...etfData].sort((a, b) => b.month.localeCompare(a.month));

  const quarterOpts = generateQuarterOptions(data.map(d => d.quarter));
  const monthOpts = generateMonthOptions(etfData.map(d => d.month));

  const handleAddPhysical = async () => {
    if (!newQ) return;
    setLoading(true);
    try {
      const { error } = await supabase.from('central_bank_gold').insert({
        quarter: newQ,
        tonnes: newTonnes,
        bar_coin_tonnes: newBarCoin,
      } as any);
      if (error) throw error;
      const newEntry: CentralBankEntry = { quarter: newQ, tonnes: newTonnes, bar_coin_tonnes: newBarCoin };
      const updated = [...data, newEntry];
      setData(updated);
      onDataChange(updated);
      setNewQ('');
      setNewTonnes(0);
      setNewBarCoin(0);
      toast.success('Physical demand data added');
    } catch (e: any) {
      toast.error(e.message || 'Failed to add');
    } finally {
      setLoading(false);
    }
  };

  const savePhysicalEdit = async (quarter: string) => {
    setLoading(true);
    try {
      const { error } = await supabase.from('central_bank_gold')
        .update({ tonnes: editTonnes, bar_coin_tonnes: editBarCoin } as any)
        .eq('quarter', quarter);
      if (error) throw error;
      const updated = data.map(d => d.quarter === quarter ? { ...d, tonnes: editTonnes, bar_coin_tonnes: editBarCoin } : d);
      setData(updated);
      onDataChange(updated);
      setEditingQ(null);
      toast.success('Updated');
    } catch (e: any) {
      toast.error(e.message || 'Failed to update');
    } finally {
      setLoading(false);
    }
  };

  const handleAddEtf = async () => {
    if (!newMonth) return;
    setLoading(true);
    try {
      const { error } = await supabase.from('etf_flows').insert({
        month: newMonth,
        flows_usd_bn: newFlows,
        holdings_tonnes: newHoldings,
      });
      if (error) throw error;
      const newEntry: EtfFlowEntry = { month: newMonth, flows_usd_bn: newFlows, holdings_tonnes: newHoldings };
      const updated = [...etfData, newEntry];
      setEtfData(updated);
      onEtfFlowsChange(updated);
      setNewMonth('');
      setNewFlows(0);
      setNewHoldings(0);
      toast.success('ETF flow data added');
    } catch (e: any) {
      toast.error(e.message || 'Failed to add');
    } finally {
      setLoading(false);
    }
  };

  const saveEtfEdit = async (month: string) => {
    setLoading(true);
    try {
      const { error } = await supabase.from('etf_flows')
        .update({ flows_usd_bn: editFlows, holdings_tonnes: editHoldings })
        .eq('month', month);
      if (error) throw error;
      const updated = etfData.map(d => d.month === month ? { ...d, flows_usd_bn: editFlows, holdings_tonnes: editHoldings } : d);
      setEtfData(updated);
      onEtfFlowsChange(updated);
      setEditingMonth(null);
      toast.success('Updated');
    } catch (e: any) {
      toast.error(e.message || 'Failed to update');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="rounded-lg border border-card-border overflow-hidden bg-card">
      <button
        onClick={() => setExpanded(!expanded)}
        className={`w-full flex items-center justify-between px-4 py-3 hover:bg-secondary/10 transition-colors ${expanded ? 'border-b border-card-border bg-gold/5' : ''}`}
      >
        <h3 className="text-sm font-semibold text-foreground">Demand Data Manager</h3>
        {expanded ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
      </button>

      {expanded && (
        <div className="p-4">
          <div className="flex gap-1 mb-4 border-b border-card-border">
            {(['physical', 'etf', 'structural'] as const).map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-3 py-2 text-xs font-medium transition-colors border-b-2 -mb-px ${
                  activeTab === tab ? 'border-gold text-gold' : 'border-transparent text-muted-foreground hover:text-foreground'
                }`}
              >
                {tab === 'physical' ? 'Physical Demand' : tab === 'etf' ? 'ETF Flows' : 'Structural Data'}
              </button>
            ))}
          </div>

          {activeTab === 'physical' && (
            <div className="space-y-3">
              <div className="max-h-64 overflow-y-auto">
                <table className="w-full text-xs">
                  <thead className="sticky top-0 bg-card">
                    <tr className="border-b border-card-border text-muted-foreground">
                      <th className="text-left px-2 py-1.5">Quarter</th>
                      <th className="text-right px-2 py-1.5">CB Tonnes</th>
                      <th className="text-right px-2 py-1.5">Bar/Coin</th>
                      <th className="text-right px-2 py-1.5">Total</th>
                      <th className="text-right px-2 py-1.5 w-16"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortedData.map((row, i) => (
                      <tr key={row.quarter} className={`border-b border-card-border/30 ${i % 2 === 0 ? '' : 'bg-secondary/5'}`}>
                        <td className="px-2 py-1.5 font-mono text-foreground">{row.quarter}</td>
                        {editingQ === row.quarter ? (
                          <>
                            <td className="px-2 py-1.5"><input type="number" value={editTonnes} onChange={e => setEditTonnes(Number(e.target.value))} className="w-16 bg-secondary/30 border border-card-border rounded px-1 py-0.5 text-xs font-mono text-foreground text-right" /></td>
                            <td className="px-2 py-1.5"><input type="number" value={editBarCoin} onChange={e => setEditBarCoin(Number(e.target.value))} className="w-16 bg-secondary/30 border border-card-border rounded px-1 py-0.5 text-xs font-mono text-foreground text-right" /></td>
                            <td className="px-2 py-1.5 text-right font-mono text-foreground">{editTonnes + editBarCoin}</td>
                            <td className="px-2 py-1.5 text-right">
                              <button onClick={() => savePhysicalEdit(row.quarter)} className="text-bullish mr-1"><Check className="w-3 h-3 inline" /></button>
                              <button onClick={() => setEditingQ(null)} className="text-bearish"><X className="w-3 h-3 inline" /></button>
                            </td>
                          </>
                        ) : (
                          <>
                            <td className="px-2 py-1.5 text-right font-mono text-foreground">{row.tonnes}</td>
                            <td className="px-2 py-1.5 text-right font-mono text-foreground">{row.bar_coin_tonnes || 0}</td>
                            <td className="px-2 py-1.5 text-right font-mono text-foreground font-semibold">{row.tonnes + (row.bar_coin_tonnes || 0)}</td>
                            <td className="px-2 py-1.5 text-right">
                              <button onClick={() => { setEditingQ(row.quarter); setEditTonnes(row.tonnes); setEditBarCoin(row.bar_coin_tonnes || 0); }} className="text-muted-foreground hover:text-foreground"><Pencil className="w-3 h-3 inline" /></button>
                            </td>
                          </>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="flex flex-wrap items-end gap-2 pt-2 border-t border-card-border">
                <div>
                  <label className="text-[9px] text-muted-foreground">Quarter</label>
                  <select value={newQ} onChange={e => setNewQ(e.target.value)} className="block bg-secondary/30 border border-card-border rounded px-2 py-1 text-xs text-foreground">
                    <option value="">Select</option>
                    {quarterOpts.slice(0, 12).map(q => <option key={q} value={q}>{q}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-[9px] text-muted-foreground">CB Tonnes</label>
                  <input type="number" value={newTonnes} onChange={e => setNewTonnes(Number(e.target.value))} className="block w-20 bg-secondary/30 border border-card-border rounded px-2 py-1 text-xs font-mono text-foreground" />
                </div>
                <div>
                  <label className="text-[9px] text-muted-foreground">Bar/Coin</label>
                  <input type="number" value={newBarCoin} onChange={e => setNewBarCoin(Number(e.target.value))} className="block w-20 bg-secondary/30 border border-card-border rounded px-2 py-1 text-xs font-mono text-foreground" />
                </div>
                <button onClick={handleAddPhysical} disabled={!newQ || loading} className="flex items-center gap-1 px-3 py-1 bg-gold/20 text-gold rounded text-xs font-medium hover:bg-gold/30 disabled:opacity-50">
                  <Plus className="w-3 h-3" /> Add
                </button>
              </div>
              <p className="text-[9px] text-muted-foreground">
                Source: <a href="https://www.gold.org/goldhub/research/gold-demand-trends" target="_blank" rel="noopener noreferrer" className="text-gold hover:underline inline-flex items-center gap-0.5">World Gold Council <ExternalLink className="w-2.5 h-2.5" /></a>
              </p>
            </div>
          )}

          {activeTab === 'etf' && (
            <div className="space-y-3">
              <div className="max-h-64 overflow-y-auto">
                <table className="w-full text-xs">
                  <thead className="sticky top-0 bg-card">
                    <tr className="border-b border-card-border text-muted-foreground">
                      <th className="text-left px-2 py-1.5">Month</th>
                      <th className="text-right px-2 py-1.5">Flows ($B)</th>
                      <th className="text-right px-2 py-1.5">Holdings (t)</th>
                      <th className="text-right px-2 py-1.5 w-16"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortedEtf.map((row, i) => (
                      <tr key={row.month} className={`border-b border-card-border/30 ${i % 2 === 0 ? '' : 'bg-secondary/5'}`}>
                        <td className="px-2 py-1.5 font-mono text-foreground">{row.month}</td>
                        {editingMonth === row.month ? (
                          <>
                            <td className="px-2 py-1.5"><input type="number" step="0.1" value={editFlows} onChange={e => setEditFlows(Number(e.target.value))} className="w-20 bg-secondary/30 border border-card-border rounded px-1 py-0.5 text-xs font-mono text-foreground text-right" /></td>
                            <td className="px-2 py-1.5"><input type="number" value={editHoldings} onChange={e => setEditHoldings(Number(e.target.value))} className="w-20 bg-secondary/30 border border-card-border rounded px-1 py-0.5 text-xs font-mono text-foreground text-right" /></td>
                            <td className="px-2 py-1.5 text-right">
                              <button onClick={() => saveEtfEdit(row.month)} className="text-bullish mr-1"><Check className="w-3 h-3 inline" /></button>
                              <button onClick={() => setEditingMonth(null)} className="text-bearish"><X className="w-3 h-3 inline" /></button>
                            </td>
                          </>
                        ) : (
                          <>
                            <td className={`px-2 py-1.5 text-right font-mono ${row.flows_usd_bn > 0 ? 'text-bullish' : row.flows_usd_bn < 0 ? 'text-bearish' : 'text-foreground'}`}>
                              {row.flows_usd_bn > 0 ? '+' : ''}{row.flows_usd_bn.toFixed(1)}
                            </td>
                            <td className="px-2 py-1.5 text-right font-mono text-foreground">{Math.round(row.holdings_tonnes).toLocaleString()}</td>
                            <td className="px-2 py-1.5 text-right">
                              <button onClick={() => { setEditingMonth(row.month); setEditFlows(row.flows_usd_bn); setEditHoldings(row.holdings_tonnes); }} className="text-muted-foreground hover:text-foreground"><Pencil className="w-3 h-3 inline" /></button>
                            </td>
                          </>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="flex flex-wrap items-end gap-2 pt-2 border-t border-card-border">
                <div>
                  <label className="text-[9px] text-muted-foreground">Month</label>
                  <select value={newMonth} onChange={e => setNewMonth(e.target.value)} className="block bg-secondary/30 border border-card-border rounded px-2 py-1 text-xs text-foreground">
                    <option value="">Select</option>
                    {monthOpts.slice(0, 12).map(m => <option key={m} value={m}>{m}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-[9px] text-muted-foreground">Flows ($B)</label>
                  <input type="number" step="0.1" value={newFlows} onChange={e => setNewFlows(Number(e.target.value))} className="block w-20 bg-secondary/30 border border-card-border rounded px-2 py-1 text-xs font-mono text-foreground" />
                </div>
                <div>
                  <label className="text-[9px] text-muted-foreground">Holdings (t)</label>
                  <input type="number" value={newHoldings} onChange={e => setNewHoldings(Number(e.target.value))} className="block w-20 bg-secondary/30 border border-card-border rounded px-2 py-1 text-xs font-mono text-foreground" />
                </div>
                <button onClick={handleAddEtf} disabled={!newMonth || loading} className="flex items-center gap-1 px-3 py-1 bg-gold/20 text-gold rounded text-xs font-medium hover:bg-gold/30 disabled:opacity-50">
                  <Plus className="w-3 h-3" /> Add
                </button>
              </div>
              <p className="text-[9px] text-muted-foreground">
                Source: <a href="https://www.gold.org/goldhub/data/global-gold-backed-etf-holdings-and-flows" target="_blank" rel="noopener noreferrer" className="text-gold hover:underline inline-flex items-center gap-0.5">WGC ETF Data <ExternalLink className="w-2.5 h-2.5" /></a>
              </p>
            </div>
          )}

          {activeTab === 'structural' && (
            <div className="p-6 text-center text-muted-foreground text-sm">
              <p>All Tier 1 structural data currently sourced from FRED automatically.</p>
              <p className="text-xs mt-2">Reserved for future manual structural data inputs.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default CentralBankManager;
