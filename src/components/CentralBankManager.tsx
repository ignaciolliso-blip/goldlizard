import { useState, useEffect } from 'react';
import { ChevronDown, ChevronUp, Pencil, Check, X, Plus, ExternalLink } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import type { CentralBankEntry } from '@/lib/dataFetcher';
import { toast } from 'sonner';

interface CentralBankManagerProps {
  initialData: CentralBankEntry[];
  onDataChange: (data: CentralBankEntry[]) => void;
}

function generateQuarterOptions(existing: string[]): string[] {
  const options: string[] = [];
  const now = new Date();
  const currentYear = now.getFullYear();
  for (let y = currentYear + 1; y >= 2010; y--) {
    for (let q = 4; q >= 1; q--) {
      const quarter = `${y}-Q${q}`;
      if (!existing.includes(quarter)) options.push(quarter);
    }
  }
  return options;
}

const CentralBankManager = ({ initialData, onDataChange }: CentralBankManagerProps) => {
  const [expanded, setExpanded] = useState(false);
  const [data, setData] = useState<(CentralBankEntry & { created_at?: string })[]>([]);
  const [editingQuarter, setEditingQuarter] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const [newQuarter, setNewQuarter] = useState('');
  const [newTonnes, setNewTonnes] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (expanded && data.length === 0) {
      loadData();
    }
  }, [expanded]);

  const loadData = async () => {
    const { data: rows, error } = await supabase
      .from('central_bank_gold')
      .select('quarter, tonnes, created_at')
      .order('quarter', { ascending: false });
    if (error) {
      toast.error('Failed to load data');
      return;
    }
    setData(rows || []);
  };

  const handleAdd = async () => {
    if (!newQuarter || !newTonnes) return;
    setSaving(true);
    const { error } = await supabase
      .from('central_bank_gold')
      .insert({ quarter: newQuarter, tonnes: parseInt(newTonnes) });
    if (error) {
      toast.error('Failed to add: ' + error.message);
    } else {
      toast.success(`Added ${newQuarter}`);
      setNewQuarter('');
      setNewTonnes('');
      await loadData();
      // Notify parent to recalculate
      const { data: all } = await supabase
        .from('central_bank_gold')
        .select('quarter, tonnes')
        .order('quarter', { ascending: true });
      if (all) onDataChange(all);
    }
    setSaving(false);
  };

  const startEdit = (quarter: string, tonnes: number) => {
    setEditingQuarter(quarter);
    setEditValue(String(tonnes));
  };

  const cancelEdit = () => {
    setEditingQuarter(null);
    setEditValue('');
  };

  const saveEdit = async (quarter: string) => {
    setSaving(true);
    // Use RPC or direct update - we need update policy
    const { error } = await supabase
      .from('central_bank_gold')
      .update({ tonnes: parseInt(editValue) })
      .eq('quarter', quarter);
    if (error) {
      toast.error('Failed to update: ' + error.message);
    } else {
      toast.success(`Updated ${quarter}`);
      setEditingQuarter(null);
      await loadData();
      const { data: all } = await supabase
        .from('central_bank_gold')
        .select('quarter, tonnes')
        .order('quarter', { ascending: true });
      if (all) onDataChange(all);
    }
    setSaving(false);
  };

  const existingQuarters = data.map(d => d.quarter);
  const quarterOptions = generateQuarterOptions(existingQuarters);

  return (
    <div className="rounded-lg border border-card-border bg-card overflow-hidden">
      {/* Header */}
      <button
        onClick={() => setExpanded(v => !v)}
        className={`w-full flex items-center justify-between px-5 py-3 text-left transition-colors ${
          expanded ? 'border-b border-gold/30 bg-gold/5' : 'hover:bg-secondary/20'
        }`}
      >
        <span className={`text-sm font-semibold ${expanded ? 'text-gold' : 'text-foreground'}`}>
          Central Bank Purchase Data
        </span>
        {expanded ? (
          <ChevronUp className="w-4 h-4 text-gold" />
        ) : (
          <ChevronDown className="w-4 h-4 text-muted-foreground" />
        )}
      </button>

      {expanded && (
        <div className="animate-fade-in">
          {/* Table */}
          <div className="max-h-[400px] overflow-y-auto">
            <table className="w-full text-xs">
              <thead className="sticky top-0 z-10">
                <tr className="border-b border-card-border bg-card text-muted-foreground">
                  <th className="text-left px-4 py-2 font-medium">Quarter</th>
                  <th className="text-right px-4 py-2 font-medium">Tonnes</th>
                  <th className="text-right px-4 py-2 font-medium">Date Entered</th>
                  <th className="w-16 px-4 py-2"></th>
                </tr>
              </thead>
              <tbody>
                {data.map((row, i) => {
                  const isEditing = editingQuarter === row.quarter;
                  return (
                    <tr
                      key={row.quarter}
                      className={`border-b border-card-border/30 ${i % 2 === 0 ? 'bg-[#151820]' : 'bg-[#1A1E28]'}`}
                    >
                      <td className="px-4 py-2 font-mono text-foreground">{row.quarter}</td>
                      <td className="px-4 py-2 text-right font-mono">
                        {isEditing ? (
                          <input
                            type="number"
                            value={editValue}
                            onChange={e => setEditValue(e.target.value)}
                            className="w-20 bg-secondary/50 border border-card-border rounded px-2 py-0.5 text-xs font-mono text-foreground text-right focus:border-gold/50 focus:outline-none"
                            autoFocus
                          />
                        ) : (
                          <span className="text-foreground">{row.tonnes}</span>
                        )}
                      </td>
                      <td className="px-4 py-2 text-right text-muted-foreground">
                        {row.created_at ? new Date(row.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'}
                      </td>
                      <td className="px-4 py-2 text-right">
                        {isEditing ? (
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => saveEdit(row.quarter)}
                              disabled={saving}
                              className="p-1 text-bullish hover:text-bullish/80 transition-colors disabled:opacity-50"
                            >
                              <Check className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={cancelEdit}
                              className="p-1 text-bearish hover:text-bearish/80 transition-colors"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => startEdit(row.quarter, row.tonnes)}
                            className="p-1 text-muted-foreground hover:text-foreground transition-colors"
                          >
                            <Pencil className="w-3 h-3" />
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Add form */}
          <div className="flex items-center gap-3 px-4 py-3 border-t border-card-border bg-[#151820]">
            <select
              value={newQuarter}
              onChange={e => setNewQuarter(e.target.value)}
              className="bg-secondary/30 border border-card-border rounded px-2 py-1.5 text-xs font-mono text-foreground focus:border-gold/50 focus:outline-none"
            >
              <option value="">Select quarter...</option>
              {quarterOptions.slice(0, 12).map(q => (
                <option key={q} value={q}>{q}</option>
              ))}
            </select>
            <input
              type="number"
              placeholder="Tonnes"
              value={newTonnes}
              onChange={e => setNewTonnes(e.target.value)}
              className="w-24 bg-secondary/30 border border-card-border rounded px-2 py-1.5 text-xs font-mono text-foreground focus:border-gold/50 focus:outline-none"
            />
            <button
              onClick={handleAdd}
              disabled={!newQuarter || !newTonnes || saving}
              className="flex items-center gap-1 px-3 py-1.5 bg-gold/10 text-gold text-xs font-medium rounded hover:bg-gold/20 disabled:opacity-40 transition-colors"
            >
              <Plus className="w-3 h-3" />
              Add
            </button>
          </div>

          {/* Source note */}
          <div className="px-4 py-3 border-t border-card-border">
            <p className="text-[10px] text-muted-foreground/60">
              Source: World Gold Council Quarterly Gold Demand Trends reports. Update quarterly after each WGC publication.{' '}
              <a
                href="https://www.gold.org/goldhub/research/gold-demand-trends"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-0.5 text-index-blue hover:text-index-blue/80 transition-colors"
              >
                View reports <ExternalLink className="w-2.5 h-2.5" />
              </a>
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default CentralBankManager;
