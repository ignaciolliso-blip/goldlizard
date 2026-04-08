import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const AV_KEY = Deno.env.get("ALPHA_VANTAGE_KEY")!;
const SB_URL = Deno.env.get("SUPABASE_URL")!;
const SB_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const supabase = createClient(SB_URL, SB_KEY);

// Map copper tickers to Alpha Vantage symbols
const AV_SYMBOL_MAP: Record<string, string> = {
  "TECK.B": "TECK",
  FCX: "FCX",
  LUN: "LUNMF",
  CS: "CPPMF",
  SCCO: "SCCO",
  IVN: "IVPAF",
  MARI: "MRREF",
  MUX: "MUX",
  COPX: "COPX",
  COPJ: "COPJ",
};

const M = 1_000_000;
const B = 1_000_000_000;

function toNum(val: string | undefined | null): number | null {
  if (!val || val === "None" || val === "-") return null;
  const n = Number(val);
  return isNaN(n) ? null : n;
}

async function fetchOverview(avSymbol: string) {
  const url = `https://www.alphavantage.co/query?function=OVERVIEW&symbol=${avSymbol}&apikey=${AV_KEY}`;
  const res = await fetch(url);
  if (!res.ok) {
    console.error(`AV OVERVIEW ${res.status} for ${avSymbol}`);
    return null;
  }
  const json = await res.json();
  if (json["Error Message"] || json["Note"] || !json["MarketCapitalization"]) {
    console.error(`AV OVERVIEW no data for ${avSymbol}:`, json["Error Message"] || json["Note"] || "empty");
    return null;
  }
  return json;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Freshness check: skip if most recent copper financial < 23 hours old
    const { data: recentRow } = await supabase
      .from("copper_equity_financials")
      .select("updated_at")
      .eq("data_tier", "yahoo_auto")
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (recentRow) {
      const ageMs = Date.now() - new Date(recentRow.updated_at).getTime();
      const ageHours = ageMs / (1000 * 60 * 60);
      if (ageHours < 23) {
        const msg = `Data already fresh — last updated ${ageHours.toFixed(1)} hours ago`;
        console.log(msg);
        return new Response(JSON.stringify({ fresh: true, message: msg, hours_ago: Math.round(ageHours * 10) / 10 }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // Get all active equities (non-ETF, non-explorer)
    const { data: equities, error: eqErr } = await supabase
      .from("copper_equity_names")
      .select("id, ticker, tier")
      .eq("active", true)
      .in("tier", ["producer", "developer"]);

    if (eqErr) throw new Error("Failed to read equities: " + eqErr.message);
    if (!equities || equities.length === 0) {
      return new Response(JSON.stringify({ message: "No equities to fetch" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`Fetching Alpha Vantage data for ${equities.length} copper equities`);
    const results: { ticker: string; status: string }[] = [];
    const today = new Date().toISOString().split("T")[0];

    for (const eq of equities) {
      const avSymbol = AV_SYMBOL_MAP[eq.ticker] || eq.ticker;
      try {
        const overview = await fetchOverview(avSymbol);
        if (!overview) {
          results.push({ ticker: eq.ticker, status: `skipped — no AV data (${avSymbol})` });
          continue;
        }

        const marketCapRaw = toNum(overview["MarketCapitalization"]);
        if (!marketCapRaw) {
          results.push({ ticker: eq.ticker, status: "skipped — no market cap" });
          continue;
        }

        const ebitdaRaw = toNum(overview["EBITDA"]);
        const totalDebtRaw = toNum(overview["TotalDebt"]) || toNum(overview["LongTermDebt"]);
        const cashRaw = toNum(overview["CashAndCashEquivalentsAtCarryingValue"]) || toNum(overview["TotalCash"]);
        const divYieldRaw = toNum(overview["DividendYield"]);
        const evRaw = marketCapRaw + (totalDebtRaw ?? 0) - (cashRaw ?? 0);

        const netDebt = (totalDebtRaw != null && cashRaw != null) ? totalDebtRaw - cashRaw : null;
        const evEbitda = (evRaw && ebitdaRaw && ebitdaRaw > 0) ? evRaw / ebitdaRaw : null;
        const netDebtEbitda = (netDebt != null && ebitdaRaw != null && ebitdaRaw > 0) ? netDebt / ebitdaRaw : null;

        // FCF not directly available from OVERVIEW — skip for now
        const tierAFields: Record<string, any> = {
          equity_id: eq.id,
          as_of_date: today,
          market_cap_usd_m: Math.round(marketCapRaw / M),
          ev_usd_m: Math.round(evRaw / M),
          net_debt_usd_m: netDebt != null ? Math.round(netDebt / M) : null,
          ev_ebitda: evEbitda != null ? Math.round(evEbitda * 10) / 10 : null,
          net_debt_ebitda: netDebtEbitda != null ? Math.round(netDebtEbitda * 10) / 10 : null,
          dividend_yield_pct: divYieldRaw != null ? Math.round(divYieldRaw * 10000) / 100 : null,
          data_tier: "yahoo_auto",
          source: "Alpha Vantage",
          updated_at: new Date().toISOString(),
        };

        // Check for existing row this week
        const weekAgo = new Date();
        weekAgo.setDate(weekAgo.getDate() - 7);
        const { data: existing } = await supabase
          .from("copper_equity_financials")
          .select("id")
          .eq("equity_id", eq.id)
          .gte("as_of_date", weekAgo.toISOString().split("T")[0])
          .order("as_of_date", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (existing) {
          const { error: updateErr } = await supabase
            .from("copper_equity_financials")
            .update(tierAFields)
            .eq("id", existing.id);
          if (updateErr) {
            console.error(`Update error for ${eq.ticker}:`, updateErr.message);
            results.push({ ticker: eq.ticker, status: `error: ${updateErr.message}` });
          } else {
            results.push({ ticker: eq.ticker, status: "updated" });
          }
        } else {
          const { error: insertErr } = await supabase
            .from("copper_equity_financials")
            .insert(tierAFields);
          if (insertErr) {
            console.error(`Insert error for ${eq.ticker}:`, insertErr.message);
            results.push({ ticker: eq.ticker, status: `error: ${insertErr.message}` });
          } else {
            results.push({ ticker: eq.ticker, status: "inserted" });
          }
        }

        // Rate limit: AV free tier = 5 calls/min
        await new Promise(r => setTimeout(r, 15000));
      } catch (e) {
        console.error(`Error processing ${eq.ticker}:`, e);
        results.push({ ticker: eq.ticker, status: `error: ${(e as Error).message}` });
      }
    }

    const succeeded = results.filter(r => r.status === "updated" || r.status === "inserted").length;
    const summary = { total: equities.length, succeeded, details: results };
    console.log("Done:", JSON.stringify(summary));

    return new Response(JSON.stringify(summary), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("Fatal error:", e);
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
