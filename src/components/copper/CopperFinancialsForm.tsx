import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronDown, Save, Database } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { CopperEquityName, CopperEquityFinancial } from "@/lib/copperDataFetcher";

interface Props {
  equities: CopperEquityName[];
  financials: CopperEquityFinancial[];
  onUpdated: () => void;
}

interface FormState {
  as_of_date: string;
  market_cap_usd_m: string;
  ev_usd_m: string;
  net_debt_usd_m: string;
  ev_ebitda: string;
  ev_ebitda_forward: string;
  p_nav: string;
  fcf_yield_pct: string;
  dividend_yield_pct: string;
  net_debt_ebitda: string;
  production_kt: string;
  production_growth_pct: string;
  reserve_life_years: string;
  copper_revenue_pct: string;
  capex_usd_m: string;
  insider_net_buying_usd_m: string;
  insider_flag: string;
  roic_pct: string;
  source: string;
  source_url: string;
  guidance_production: string;
  guidance_aisc: string;
}

const emptyForm: FormState = {
  as_of_date: "",
  market_cap_usd_m: "",
  ev_usd_m: "",
  net_debt_usd_m: "",
  ev_ebitda: "",
  ev_ebitda_forward: "",
  p_nav: "",
  fcf_yield_pct: "",
  dividend_yield_pct: "",
  net_debt_ebitda: "",
  production_kt: "",
  production_growth_pct: "",
  reserve_life_years: "",
  copper_revenue_pct: "",
  capex_usd_m: "",
  insider_net_buying_usd_m: "",
  insider_flag: "NEUTRAL",
  roic_pct: "",
  source: "",
  source_url: "",
  guidance_production: "",
  guidance_aisc: "",
};

function parseNum(v: string): number | null {
  const n = parseFloat(v);
  return isNaN(n) ? null : n;
}

export default function CopperFinancialsForm({ equities, financials, onUpdated }: Props) {
  const producers = useMemo(() => equities.filter(e => e.tier === "producer" || e.tier === "developer"), [equities]);
  const [selectedId, setSelectedId] = useState<string>("");
  const [form, setForm] = useState<FormState>({ ...emptyForm });
  const [saving, setSaving] = useState(false);

  const selectedEquity = producers.find(p => p.id === selectedId);

  // Pre-fill form when selecting an equity with existing financials
  function handleSelect(id: string) {
    setSelectedId(id);
    const existing = financials.find(f => f.equity_id === id);
    if (existing) {
      setForm({
        as_of_date: existing.as_of_date || "",
        market_cap_usd_m: existing.market_cap_usd_m?.toString() || "",
        ev_usd_m: existing.ev_usd_m?.toString() || "",
        net_debt_usd_m: existing.net_debt_usd_m?.toString() || "",
        ev_ebitda: existing.ev_ebitda?.toString() || "",
        ev_ebitda_forward: existing.ev_ebitda_forward?.toString() || "",
        p_nav: existing.p_nav?.toString() || "",
        fcf_yield_pct: existing.fcf_yield_pct?.toString() || "",
        dividend_yield_pct: existing.dividend_yield_pct?.toString() || "",
        net_debt_ebitda: existing.net_debt_ebitda?.toString() || "",
        production_kt: existing.production_kt?.toString() || "",
        production_growth_pct: existing.production_growth_pct?.toString() || "",
        reserve_life_years: existing.reserve_life_years?.toString() || "",
        copper_revenue_pct: existing.copper_revenue_pct?.toString() || "",
        capex_usd_m: existing.capex_usd_m?.toString() || "",
        insider_net_buying_usd_m: existing.insider_net_buying_usd_m?.toString() || "",
        insider_flag: existing.insider_flag || "NEUTRAL",
        roic_pct: existing.roic_pct?.toString() || "",
        source: existing.source || "",
        source_url: existing.source_url || "",
        guidance_production: existing.guidance_production || "",
        guidance_aisc: existing.guidance_aisc || "",
      });
    } else {
      setForm({ ...emptyForm });
    }
  }

  async function handleSave() {
    if (!selectedId || !form.as_of_date) {
      toast.error("Select a company and enter as-of date");
      return;
    }
    setSaving(true);
    try {
      const row = {
        equity_id: selectedId,
        as_of_date: form.as_of_date,
        market_cap_usd_m: parseNum(form.market_cap_usd_m),
        ev_usd_m: parseNum(form.ev_usd_m),
        net_debt_usd_m: parseNum(form.net_debt_usd_m),
        ev_ebitda: parseNum(form.ev_ebitda),
        ev_ebitda_forward: parseNum(form.ev_ebitda_forward),
        p_nav: parseNum(form.p_nav),
        fcf_yield_pct: parseNum(form.fcf_yield_pct),
        dividend_yield_pct: parseNum(form.dividend_yield_pct),
        net_debt_ebitda: parseNum(form.net_debt_ebitda),
        production_kt: parseNum(form.production_kt),
        production_growth_pct: parseNum(form.production_growth_pct),
        reserve_life_years: parseNum(form.reserve_life_years),
        copper_revenue_pct: parseNum(form.copper_revenue_pct),
        capex_usd_m: parseNum(form.capex_usd_m),
        insider_net_buying_usd_m: parseNum(form.insider_net_buying_usd_m),
        insider_flag: form.insider_flag || null,
        roic_pct: parseNum(form.roic_pct),
        source: form.source || null,
      };

      const { error } = await supabase.from("copper_equity_financials").insert(row as any);
      if (error) throw error;
      toast.success(`Financials saved for ${selectedEquity?.ticker}`);
      onUpdated();
    } catch (e: any) {
      toast.error(e.message || "Failed to save");
    } finally {
      setSaving(false);
    }
  }

  const updateField = (key: keyof FormState, value: string) => {
    setForm(prev => ({ ...prev, [key]: value }));
  };

  return (
    <Collapsible>
      <Card className="border-copper/20">
        <CollapsibleTrigger className="w-full">
          <CardHeader className="pb-3 flex flex-row items-center justify-between">
            <div className="flex items-center gap-2">
              <Database className="h-5 w-5 text-copper" />
              <CardTitle className="text-base">Copper Financials — Data Management</CardTitle>
            </div>
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <CardContent className="space-y-4">
            {/* Company Selector */}
            <div className="space-y-1.5">
              <Label className="text-xs">Company</Label>
              <Select value={selectedId} onValueChange={handleSelect}>
                <SelectTrigger className="text-xs">
                  <SelectValue placeholder="Select a company" />
                </SelectTrigger>
                <SelectContent>
                  {producers.map(p => (
                    <SelectItem key={p.id} value={p.id} className="text-xs">
                      {p.ticker} — {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {selectedId && (
              <>
                {/* Date */}
                <div className="space-y-1.5">
                  <Label className="text-xs">As-of Date (quarter-end)</Label>
                  <Input
                    type="date"
                    value={form.as_of_date}
                    onChange={e => updateField("as_of_date", e.target.value)}
                    className="text-xs"
                  />
                </div>

                {/* Valuation Metrics */}
                <div>
                  <p className="text-xs font-semibold text-muted-foreground mb-2">Valuation Metrics</p>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    <Field label="Market Cap ($M)" value={form.market_cap_usd_m} onChange={v => updateField("market_cap_usd_m", v)} />
                    <Field label="EV ($M)" value={form.ev_usd_m} onChange={v => updateField("ev_usd_m", v)} />
                    <Field label="Net Debt ($M)" value={form.net_debt_usd_m} onChange={v => updateField("net_debt_usd_m", v)} />
                    <Field label="EV/EBITDA (trailing)" value={form.ev_ebitda} onChange={v => updateField("ev_ebitda", v)} />
                    <Field label="EV/EBITDA (NTM)" value={form.ev_ebitda_forward} onChange={v => updateField("ev_ebitda_forward", v)} />
                    <Field label="P/NAV" value={form.p_nav} onChange={v => updateField("p_nav", v)} />
                    <Field label="FCF Yield (%)" value={form.fcf_yield_pct} onChange={v => updateField("fcf_yield_pct", v)} />
                    <Field label="Dividend Yield (%)" value={form.dividend_yield_pct} onChange={v => updateField("dividend_yield_pct", v)} />
                    <Field label="Net Debt/EBITDA" value={form.net_debt_ebitda} onChange={v => updateField("net_debt_ebitda", v)} />
                  </div>
                </div>

                {/* Operational Metrics */}
                <div>
                  <p className="text-xs font-semibold text-muted-foreground mb-2">Operational Metrics</p>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    <Field label="Production (kt)" value={form.production_kt} onChange={v => updateField("production_kt", v)} />
                    <Field label="Growth (%)" value={form.production_growth_pct} onChange={v => updateField("production_growth_pct", v)} />
                    <Field label="Reserve Life (yrs)" value={form.reserve_life_years} onChange={v => updateField("reserve_life_years", v)} />
                    <Field label="Cu Revenue (%)" value={form.copper_revenue_pct} onChange={v => updateField("copper_revenue_pct", v)} />
                    <Field label="Capex ($M)" value={form.capex_usd_m} onChange={v => updateField("capex_usd_m", v)} />
                    <Field label="ROIC (%)" value={form.roic_pct} onChange={v => updateField("roic_pct", v)} />
                  </div>
                </div>

                {/* Insider */}
                <div>
                  <p className="text-xs font-semibold text-muted-foreground mb-2">Insider Activity</p>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    <Field label="Net Buying ($M, 12mo)" value={form.insider_net_buying_usd_m} onChange={v => updateField("insider_net_buying_usd_m", v)} />
                    <div className="space-y-1">
                      <Label className="text-[10px] text-muted-foreground">Flag</Label>
                      <Select value={form.insider_flag} onValueChange={v => updateField("insider_flag", v)}>
                        <SelectTrigger className="text-xs h-8">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="BUYING" className="text-xs">BUYING</SelectItem>
                          <SelectItem value="NEUTRAL" className="text-xs">NEUTRAL</SelectItem>
                          <SelectItem value="SELLING" className="text-xs">SELLING</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>

                {/* Source */}
                <div className="space-y-1.5">
                  <Label className="text-xs">Source</Label>
                  <Input
                    value={form.source}
                    onChange={e => updateField("source", e.target.value)}
                    placeholder="e.g. Q1 2026 earnings, Bloomberg"
                    className="text-xs"
                  />
                </div>

                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="flex items-center gap-2 px-4 py-2 bg-copper text-white rounded-md text-xs font-medium hover:bg-copper/90 disabled:opacity-50"
                >
                  <Save className="h-3.5 w-3.5" />
                  {saving ? "Saving..." : "Save Financials"}
                </button>
              </>
            )}
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}

function Field({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div className="space-y-1">
      <Label className="text-[10px] text-muted-foreground">{label}</Label>
      <Input
        type="number"
        step="any"
        value={value}
        onChange={e => onChange(e.target.value)}
        className="text-xs h-8"
      />
    </div>
  );
}
