import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SB_URL = Deno.env.get("SUPABASE_URL")!;
const SB_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY")!;
const supabase = createClient(SB_URL, SB_KEY);

function buildProducerPrompt(companyName: string, ticker: string): string {
  return `You are the Meridian Listed Company Analyser. Research ${companyName} (${ticker}) and return ONLY a JSON object with these fields. Use web search to find the company's most recent quarterly earnings release, production report, and annual reserve statement.

Required fields:
- aisc_lb: All-in sustaining cost in US$/lb for copper operations. Look for "net cash unit costs" or "C1 costs" or "AISC" in the quarterly MD&A. If the company reports in $/t, divide by 2204.62.
- production_kt: Annual copper production in thousands of tonnes. Use the most recent full-year figure, or annualize the latest quarter x 4.
- production_growth_pct: Year-over-year production growth as a percentage.
- reserve_life_years: Proven + probable copper reserves divided by annual production. Look in the most recent annual information form or reserve statement.
- copper_revenue_pct: Percentage of total revenue derived from copper. Calculate from segment reporting in the latest annual or quarterly report.
- roic_pct: Return on invested capital. Calculate as NOPAT / (total equity + net debt). Use trailing 12-month figures.
- p_nav: Price to net asset value, if available from a recent broker consensus or company presentation. If not available, return null.
- ev_ebitda_forward: Forward EV/EBITDA from consensus analyst estimates, if found. If not available, return null.
- guidance_production: The company's official production guidance for the current year, as a range string (e.g., "455-530 kt").
- guidance_aisc: The company's official AISC or unit cost guidance for the current year, as a range string (e.g., "$1.65-$1.95/lb").
- data_date: The date of the most recent data used (e.g., "Q4 2025" or "FY2025").
- source_url: URL of the primary source document.

Return ONLY valid JSON, no markdown, no explanation. If a field cannot be found, use null.`;
}

function buildDeveloperPrompt(companyName: string, ticker: string): string {
  return `You are the Meridian Listed Company Analyser. Research ${companyName} (${ticker}) and return ONLY a JSON object with these fields. Use web search to find the company's most recent DFS, PFS, or PEA study.

Required fields:
- npv_usd_m: NPV from most recent DFS/PFS (in USD millions).
- pre_production_capex_usd_m: Pre-production capital expenditure estimate (in USD millions).
- expected_first_production_year: Expected year of first production.
- aisc_lb: Projected AISC in US$/lb from the study. If reported in $/t, divide by 2204.62.
- annual_production_kt: Projected annual production at steady state in thousands of tonnes.
- p_nav: Current market cap divided by NPV. Calculate if you have both figures.
- data_date: The date of the most recent data used (e.g., "DFS 2024" or "PFS Q3 2025").
- source_url: URL of the primary source document.

Return ONLY valid JSON, no markdown, no explanation. If a field cannot be found, use null.`;
}

function extractJSON(text: string): any {
  // Strip markdown fencing if present
  let cleaned = text.trim();
  if (cleaned.startsWith("```json")) cleaned = cleaned.slice(7);
  else if (cleaned.startsWith("```")) cleaned = cleaned.slice(3);
  if (cleaned.endsWith("```")) cleaned = cleaned.slice(0, -3);
  cleaned = cleaned.trim();
  return JSON.parse(cleaned);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { equity_id } = await req.json();
    if (!equity_id) {
      return new Response(JSON.stringify({ error: "equity_id required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get equity details
    const { data: equity, error: eqErr } = await supabase
      .from("copper_equity_names")
      .select("*")
      .eq("id", equity_id)
      .single();

    if (eqErr || !equity) {
      return new Response(JSON.stringify({ error: "Equity not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const isProducer = equity.tier === "producer";
    const prompt = isProducer
      ? buildProducerPrompt(equity.name, equity.ticker)
      : buildDeveloperPrompt(equity.name, equity.ticker);

    // Call Lovable AI Gateway
    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-pro",
        messages: [
          { role: "system", content: "You are a financial research analyst. Always return valid JSON only." },
          { role: "user", content: prompt },
        ],
      }),
    });

    if (!aiResponse.ok) {
      const errText = await aiResponse.text();
      console.error("AI Gateway error:", aiResponse.status, errText);

      if (aiResponse.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (aiResponse.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Please add funds." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify({ error: "AI research failed" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiJson = await aiResponse.json();
    const content = aiJson.choices?.[0]?.message?.content;
    if (!content) {
      return new Response(JSON.stringify({ error: "No response from AI" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let parsed: any;
    try {
      parsed = extractJSON(content);
    } catch (e) {
      console.error("Failed to parse AI response:", content);
      return new Response(JSON.stringify({ error: "Failed to parse AI response", raw: content }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Return the parsed data for user confirmation (don't save yet)
    return new Response(JSON.stringify({
      equity_id,
      ticker: equity.ticker,
      name: equity.name,
      tier: equity.tier,
      research: parsed,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("Research error:", e);
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
