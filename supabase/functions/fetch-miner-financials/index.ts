import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const AV_KEY = Deno.env.get("ALPHA_VANTAGE_KEY")!;
const SB_URL = Deno.env.get("SUPABASE_URL")!;
const SB_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const supabase = createClient(SB_URL, SB_KEY);

// Map internal tickers to Alpha Vantage symbols
const TICKER_MAP: Record<string, string> = {
  CCJ: "CCJ",
  KAP: "KAP.LON",
  NXE: "NXE",
  DNN: "DNN",
  UUUU: "UUUU",
  UEC: "UEC",
  PDN: "PALAF",
  BOE: "BQSSF",
  DYL: "DYLLF",
  LOT: "LTSRF",
  URG: "URG",
  FCU: "FCUUF",
  EU: "EU",
  ISO: "ISENF",
  URC: "UROY",
};

const B = 1_000_000_000;

function toNum(val: string | undefined | null): number | null {
  if (!val || val === "None" || val === "-") return null;
  const n = Number(val);
  return isNaN(n) ? null : n;
}

function fmtMarketCap(bn: number): string {
  if (bn >= 1) return `$${bn.toFixed(1)}B`;
  const m = bn * 1000;
  return `$${m.toFixed(0)}M`;
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

async function fetchForTicker(ticker: string) {
  const avSymbol = TICKER_MAP[ticker] || ticker;

  try {
    const overview = await fetchOverview(avSymbol);
    if (!overview) return null;

    const marketCapRaw = toNum(overview["MarketCapitalization"]);
    if (!marketCapRaw) return null;

    const marketCap = marketCapRaw / B;
    const ebitdaRaw = toNum(overview["EBITDA"]);
    const ebitda = ebitdaRaw != null ? ebitdaRaw / B : null;
    const sharesRaw = toNum(overview["SharesOutstanding"]);
    const sharesOut = sharesRaw != null ? sharesRaw / B : null;

    // Try to get price from overview's AnalystTargetPrice as fallback, but prefer 50DayMovingAverage
    const priceRaw = toNum(overview["AnalystTargetPrice"]) || toNum(overview["50DayMovingAverage"]);
    // Better: derive from market cap / shares
    const sharePrice = sharesRaw && marketCapRaw ? marketCapRaw / sharesRaw : priceRaw;

    // Debt and cash - available in some OVERVIEW responses
    const totalDebtRaw = toNum(overview["TotalDebt"]) || toNum(overview["LongTermDebt"]);
    const totalDebt = totalDebtRaw != null ? totalDebtRaw / B : null;
    const cashRaw = toNum(overview["CashAndCashEquivalentsAtCarryingValue"]) || toNum(overview["TotalCash"]);
    const cash = cashRaw != null ? cashRaw / B : null;

    // EV = market cap + debt - cash (use 0 if unavailable)
    const ev = marketCap + (totalDebt ?? 0) - (cash ?? 0);

    return {
      ticker,
      share_price: sharePrice ?? null,
      market_cap_usd_bn: marketCap,
      total_debt_usd_bn: totalDebt,
      cash_usd_bn: cash,
      ebitda_usd_bn: ebitda,
      ev_usd_bn: ev,
      shares_outstanding_bn: sharesOut,
      annual_production_mlb: null,
      fetched_at: new Date().toISOString(),
      _av_symbol: avSymbol,
      _market_cap_display: fmtMarketCap(marketCap),
    };
  } catch (e) {
    console.error(`Error fetching ${avSymbol}:`, e);
    return null;
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Freshness check: skip if any row was fetched < 23 hours ago
    const { data: recentRow } = await supabase
      .from("uranium_miner_financials")
      .select("fetched_at")
      .order("fetched_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (recentRow) {
      const ageMs = Date.now() - new Date(recentRow.fetched_at).getTime();
      const ageHours = ageMs / (1000 * 60 * 60);
      if (ageHours < 23) {
        const msg = `Data already fresh — last updated ${ageHours.toFixed(1)} hours ago`;
        console.log(msg);
        return new Response(
          JSON.stringify({ fresh: true, message: msg, last_fetched: recentRow.fetched_at, hours_ago: Math.round(ageHours * 10) / 10 }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    const { data: miners, error: minersErr } = await supabase
      .from("uranium_miner_universe")
      .select("ticker");

    if (minersErr) throw new Error("Failed to read miner universe: " + minersErr.message);

    const tickers = (miners || []).map((m: { ticker: string }) => m.ticker);
    console.log(`Fetching financials for ${tickers.length} tickers via Alpha Vantage`);

    const results: { ticker: string; status: string; av_symbol?: string }[] = [];
    const rows: Record<string, unknown>[] = [];
    const marketCapUpdates: { ticker: string; display: string }[] = [];

    // Sequential to respect rate limits
    for (const ticker of tickers) {
      const data = await fetchForTicker(ticker);
      if (data) {
        const { _av_symbol, _market_cap_display, ...row } = data;
        rows.push(row);
        results.push({ ticker, status: "ok", av_symbol: _av_symbol });
        marketCapUpdates.push({ ticker, display: _market_cap_display });
      } else {
        results.push({ ticker, status: "skipped — no data found" });
      }
    }

    // Insert financials
    if (rows.length > 0) {
      const { error: insertErr } = await supabase
        .from("uranium_miner_financials")
        .insert(rows);
      if (insertErr) throw new Error("Failed to insert financials: " + insertErr.message);
    }

    // Update etf_holdings market_cap_usd for matching tickers
    for (const { ticker, display } of marketCapUpdates) {
      await supabase
        .from("etf_holdings")
        .update({ market_cap_usd: display })
        .eq("ticker", ticker);
    }

    const succeeded = results.filter((r) => r.status === "ok").length;
    const failed = results.filter((r) => r.status !== "ok").length;

    const summary = { total: tickers.length, succeeded, failed, details: results };
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
