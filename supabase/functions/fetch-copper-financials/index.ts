import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SB_URL = Deno.env.get("SUPABASE_URL")!;
const SB_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const supabase = createClient(SB_URL, SB_KEY);

interface YahooQuoteSummary {
  financialData?: Record<string, any>;
  defaultKeyStatistics?: Record<string, any>;
  summaryDetail?: Record<string, any>;
  price?: Record<string, any>;
  insiderTransactions?: { transactions?: Array<Record<string, any>> };
}

function rawVal(obj: any): number | null {
  if (obj == null) return null;
  if (typeof obj === "number") return obj;
  if (typeof obj === "object" && "raw" in obj) return obj.raw ?? null;
  const n = Number(obj);
  return isNaN(n) ? null : n;
}

async function fetchYahooQuoteSummary(symbol: string): Promise<YahooQuoteSummary | null> {
  const modules = "financialData,defaultKeyStatistics,summaryDetail,price,insiderTransactions";
  const url = `https://query1.finance.yahoo.com/v10/finance/quoteSummary/${encodeURIComponent(symbol)}?modules=${modules}`;

  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; Meridian/1.0)" },
    });
    if (!res.ok) {
      console.error(`Yahoo ${res.status} for ${symbol}`);
      return null;
    }
    const json = await res.json();
    const result = json?.quoteSummary?.result?.[0];
    if (!result) {
      console.error(`Yahoo no result for ${symbol}`);
      return null;
    }
    return result as YahooQuoteSummary;
  } catch (e) {
    console.error(`Yahoo fetch error for ${symbol}:`, e);
    return null;
  }
}

function computeInsiderActivity(txns: Array<Record<string, any>> | undefined): { net_usd_m: number; flag: string } {
  if (!txns || txns.length === 0) return { net_usd_m: 0, flag: "NEUTRAL" };

  const oneYearAgo = new Date();
  oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

  let netValue = 0;
  for (const txn of txns) {
    const dateStr = txn.startDate?.fmt || txn.transactionDate?.fmt;
    if (!dateStr) continue;
    const txnDate = new Date(dateStr);
    if (txnDate < oneYearAgo) continue;

    const shares = rawVal(txn.shares) ?? 0;
    const value = rawVal(txn.value) ?? 0;
    const type = txn.transactionText || "";

    if (type.toLowerCase().includes("purchase") || type.toLowerCase().includes("buy")) {
      netValue += Math.abs(value);
    } else if (type.toLowerCase().includes("sale") || type.toLowerCase().includes("sell")) {
      netValue -= Math.abs(value);
    }
  }

  const netM = netValue / 1_000_000;
  const flag = netM > 1 ? "BUYING" : netM < -1 ? "SELLING" : "NEUTRAL";
  return { net_usd_m: Math.round(netM * 10) / 10, flag };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Get all active equities with yahoo_symbol
    const { data: equities, error: eqErr } = await supabase
      .from("copper_equity_names")
      .select("id, ticker, yahoo_symbol, tier")
      .eq("active", true)
      .not("yahoo_symbol", "is", null);

    if (eqErr) throw new Error("Failed to read equities: " + eqErr.message);
    if (!equities || equities.length === 0) {
      return new Response(JSON.stringify({ message: "No equities with yahoo_symbol" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`Fetching Yahoo data for ${equities.length} copper equities`);

    const results: { ticker: string; status: string }[] = [];
    const today = new Date().toISOString().split("T")[0];

    for (const eq of equities) {
      try {
        const data = await fetchYahooQuoteSummary(eq.yahoo_symbol);
        if (!data) {
          results.push({ ticker: eq.ticker, status: "skipped — no Yahoo data" });
          continue;
        }

        const fd = data.financialData || {};
        const dk = data.defaultKeyStatistics || {};
        const sd = data.summaryDetail || {};
        const pr = data.price || {};

        const marketCap = rawVal(pr.marketCap) ?? rawVal(sd.marketCap);
        const ev = rawVal(dk.enterpriseValue);
        const ebitda = rawVal(fd.ebitda);
        const totalDebt = rawVal(fd.totalDebt);
        const totalCash = rawVal(fd.totalCash);
        const fcf = rawVal(fd.freeCashflow);
        const divYield = rawVal(sd.dividendYield);
        const evEbitda = rawVal(dk.enterpriseToEbitda);

        const netDebt = (totalDebt != null && totalCash != null) ? totalDebt - totalCash : null;
        const netDebtEbitda = (netDebt != null && ebitda != null && ebitda > 0) ? netDebt / ebitda : null;
        const fcfYield = (fcf != null && marketCap != null && marketCap > 0) ? (fcf / marketCap) * 100 : null;

        const insider = computeInsiderActivity(data.insiderTransactions?.transactions);

        // Tier A fields only — never overwrite Tier B (mining ops) data
        const tierAFields: Record<string, any> = {
          equity_id: eq.id,
          as_of_date: today,
          market_cap_usd_m: marketCap != null ? Math.round(marketCap / 1_000_000) : null,
          ev_usd_m: ev != null ? Math.round(ev / 1_000_000) : null,
          net_debt_usd_m: netDebt != null ? Math.round(netDebt / 1_000_000) : null,
          ev_ebitda: evEbitda != null ? Math.round(evEbitda * 10) / 10 : null,
          fcf_yield_pct: fcfYield != null ? Math.round(fcfYield * 10) / 10 : null,
          dividend_yield_pct: divYield != null ? Math.round(divYield * 10000) / 100 : null,
          net_debt_ebitda: netDebtEbitda != null ? Math.round(netDebtEbitda * 10) / 10 : null,
          insider_net_buying_usd_m: insider.net_usd_m,
          insider_flag: insider.flag,
          data_tier: "yahoo_auto",
          source: "Yahoo Finance",
          updated_at: new Date().toISOString(),
        };

        // Check for existing row this week for this equity
        const weekAgo = new Date();
        weekAgo.setDate(weekAgo.getDate() - 7);
        const { data: existing } = await supabase
          .from("copper_equity_financials")
          .select("id, data_tier")
          .eq("equity_id", eq.id)
          .gte("as_of_date", weekAgo.toISOString().split("T")[0])
          .order("as_of_date", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (existing) {
          // Update only Tier A fields, never overwrite claude_research fields
          const { error: updateErr } = await supabase
            .from("copper_equity_financials")
            .update(tierAFields)
            .eq("id", existing.id);
          if (updateErr) console.error(`Update error for ${eq.ticker}:`, updateErr.message);
          else results.push({ ticker: eq.ticker, status: "updated" });
        } else {
          // Insert new row
          const { error: insertErr } = await supabase
            .from("copper_equity_financials")
            .insert(tierAFields);
          if (insertErr) console.error(`Insert error for ${eq.ticker}:`, insertErr.message);
          else results.push({ ticker: eq.ticker, status: "inserted" });
        }

        // Small delay to respect rate limits
        await new Promise(r => setTimeout(r, 500));
      } catch (e) {
        console.error(`Error processing ${eq.ticker}:`, e);
        results.push({ ticker: eq.ticker, status: `error: ${(e as Error).message}` });
      }
    }

    const succeeded = results.filter(r => r.status === "ok" || r.status === "updated" || r.status === "inserted").length;
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
