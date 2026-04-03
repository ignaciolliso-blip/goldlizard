import { corsHeaders } from "@supabase/supabase-js/cors";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const FMP_KEY = Deno.env.get("FMP_API_KEY")!;
const SB_URL = Deno.env.get("SUPABASE_URL")!;
const SB_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const supabase = createClient(SB_URL, SB_KEY);

// Tickers that need alternate symbols on FMP
const ALTERNATE_TICKERS: Record<string, string[]> = {
  "KAP": ["KAP.L", "0ZAT.L"],
  "DYL": ["DYL.AX"],
  "BOE": ["BOE.AX"],
  "LOT": ["LOT.AX"],
  "PDN": ["PDN.AX"],
};

interface ProfileData {
  price?: number;
  mktCap?: number;
  sharesOutstanding?: number; // note: this is from the /quote endpoint sometimes
}

async function fmpFetch(url: string) {
  const res = await fetch(url);
  if (!res.ok) return null;
  return await res.json();
}

async function fetchForTicker(ticker: string) {
  const candidates = [ticker, ...(ALTERNATE_TICKERS[ticker] || [])];

  for (const sym of candidates) {
    try {
      const [profileArr, bsArr, isArr] = await Promise.all([
        fmpFetch(`https://financialmodelingprep.com/api/v3/profile/${sym}?apikey=${FMP_KEY}`),
        fmpFetch(`https://financialmodelingprep.com/api/v3/balance-sheet-statement/${sym}?limit=1&apikey=${FMP_KEY}`),
        fmpFetch(`https://financialmodelingprep.com/api/v3/income-statement/${sym}?limit=1&apikey=${FMP_KEY}`),
      ]);

      const profile = Array.isArray(profileArr) && profileArr.length > 0 ? profileArr[0] : null;
      if (!profile || !profile.mktCap) {
        console.log(`No profile data for ${sym}, trying next alternate...`);
        continue;
      }

      const bs = Array.isArray(bsArr) && bsArr.length > 0 ? bsArr[0] : null;
      const is_ = Array.isArray(isArr) && isArr.length > 0 ? isArr[0] : null;

      const B = 1_000_000_000;
      const sharePrice = profile.price ?? null;
      const marketCap = profile.mktCap ? profile.mktCap / B : null;
      const sharesOut = profile.mktCap && profile.price ? (profile.mktCap / profile.price) / B : null;
      const totalDebt = bs?.totalDebt != null ? bs.totalDebt / B : null;
      const cash = bs?.cashAndCashEquivalents != null ? bs.cashAndCashEquivalents / B : null;
      const ebitda = is_?.ebitda != null ? is_.ebitda / B : null;

      let ev: number | null = null;
      if (marketCap != null) {
        ev = marketCap + (totalDebt ?? 0) - (cash ?? 0);
      }

      return {
        ticker,
        share_price: sharePrice,
        market_cap_usd_bn: marketCap,
        total_debt_usd_bn: totalDebt,
        cash_usd_bn: cash,
        ebitda_usd_bn: ebitda,
        ev_usd_bn: ev,
        shares_outstanding_bn: sharesOut,
        annual_production_mlb: null,
        fetched_at: new Date().toISOString(),
        _symbol_used: sym,
      };
    } catch (e) {
      console.error(`Error fetching ${sym}:`, e);
      continue;
    }
  }

  return null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // 1. Read tickers from universe table
    const { data: miners, error: minersErr } = await supabase
      .from("uranium_miner_universe")
      .select("ticker");

    if (minersErr) throw new Error("Failed to read miner universe: " + minersErr.message);

    const tickers = (miners || []).map((m: { ticker: string }) => m.ticker);
    console.log(`Fetching financials for ${tickers.length} tickers: ${tickers.join(", ")}`);

    const results: { ticker: string; status: string; symbol_used?: string }[] = [];
    const rows: Record<string, unknown>[] = [];

    // 2. Fetch data for each ticker
    for (const ticker of tickers) {
      const data = await fetchForTicker(ticker);
      if (data) {
        const { _symbol_used, ...row } = data;
        rows.push(row);
        results.push({ ticker, status: "ok", symbol_used: _symbol_used });
      } else {
        results.push({ ticker, status: "skipped — no data found" });
      }
    }

    // 3. Insert all rows
    if (rows.length > 0) {
      const { error: insertErr } = await supabase
        .from("uranium_miner_financials")
        .insert(rows);

      if (insertErr) throw new Error("Failed to insert financials: " + insertErr.message);
    }

    const succeeded = results.filter((r) => r.status === "ok").length;
    const failed = results.filter((r) => r.status !== "ok").length;

    const summary = {
      total: tickers.length,
      succeeded,
      failed,
      details: results,
    };

    console.log("Done:", JSON.stringify(summary));

    return new Response(JSON.stringify(summary), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (e) {
    console.error("Fatal error:", e);
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
