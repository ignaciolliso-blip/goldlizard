import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const AI_GATEWAY = "https://ai.gateway.lovable.dev/v1/chat/completions";

interface MinerRow {
  ticker: string;
  company: string;
  stage: string;
  jurisdiction_operations: string;
}

interface ExtractionResult {
  resources_mlb: number | null;
  resources_source_url: string | null;
  resources_source_date: string | null;
  annual_production_mlb: number | null;
  production_source_url: string | null;
  capex_to_production_usd_m: number | null;
  capex_source_url: string | null;
  optionality_narrative: string | null;
  optionality_source_url: string | null;
}

async function extractMinerData(
  miner: MinerRow,
  apiKey: string
): Promise<{ success: boolean; data?: ExtractionResult; error?: string }> {
  const stageContext =
    miner.stage === "Producer"
      ? "This is a PRODUCER — extract annual_production_mlb (annual uranium production in million pounds U3O8). capex_to_production_usd_m should be null."
      : miner.stage === "Developer"
      ? "This is a DEVELOPER — extract capex_to_production_usd_m (estimated capital expenditure to reach production, in USD millions). annual_production_mlb should be null unless they have started production."
      : miner.stage === "Royalty"
      ? "This is a ROYALTY company — annual_production_mlb and capex_to_production_usd_m should both be null. Focus on resources and optionality."
      : "This is an EXPLORER — annual_production_mlb and capex_to_production_usd_m should both be null. Focus on resources and optionality.";

  const systemPrompt = `You are a mining industry research analyst extracting factual data from public company disclosures about uranium miners. You must provide accurate, sourced data. Use your knowledge of the most recent public filings (annual reports, 10-K, 20-F, AIF, NI 43-101 technical reports) for these companies.

When you extract data, provide the EXACT URL where the information can be verified (e.g. the company's investor relations page, SEDAR filing, SEC EDGAR filing, or the company website where the technical report is hosted). If you cannot find an exact URL, provide the most specific URL you can (e.g. the investor relations page).

For resources, use Measured + Indicated categories only (not Inferred). Report in million pounds U3O8.`;

  const userPrompt = `Extract the following data for ${miner.company} (ticker: ${miner.ticker}), a uranium ${miner.stage.toLowerCase()} operating in ${miner.jurisdiction_operations}:

${stageContext}

Please provide:
1. **resources_mlb**: Primary uranium resource estimate (Measured + Indicated) in million pounds U3O8
2. **resources_source_url**: URL of the source document (technical report, annual report, or investor presentation)
3. **resources_source_date**: Date of the source document (YYYY-MM-DD format)
4. **annual_production_mlb**: Annual uranium production in million pounds U3O8 (producers only, null for others)
5. **production_source_url**: URL of the production data source
6. **capex_to_production_usd_m**: Estimated capex to reach production in USD millions (developers only, null for others)
7. **capex_source_url**: URL of the capex estimate source
8. **optionality_narrative**: A 2-3 sentence summary of additional resources beyond the primary deposit, exploration upside, and any additional projects. Be specific with numbers. No fluff.
9. **optionality_source_url**: URL for the optionality information

Use the most recent publicly available data (2024 or 2025 filings preferred).`;

  try {
    const response = await fetch(AI_GATEWAY, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-pro",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "store_miner_data",
              description:
                "Store extracted uranium miner data from public filings",
              parameters: {
                type: "object",
                properties: {
                  resources_mlb: {
                    type: "number",
                    nullable: true,
                    description:
                      "Measured + Indicated resource in million pounds U3O8",
                  },
                  resources_source_url: {
                    type: "string",
                    nullable: true,
                    description: "URL of the resource estimate source",
                  },
                  resources_source_date: {
                    type: "string",
                    nullable: true,
                    description: "Date of source document (YYYY-MM-DD)",
                  },
                  annual_production_mlb: {
                    type: "number",
                    nullable: true,
                    description:
                      "Annual production in million pounds U3O8 (producers only)",
                  },
                  production_source_url: {
                    type: "string",
                    nullable: true,
                    description: "URL of the production data source",
                  },
                  capex_to_production_usd_m: {
                    type: "number",
                    nullable: true,
                    description:
                      "Capex to production in USD millions (developers only)",
                  },
                  capex_source_url: {
                    type: "string",
                    nullable: true,
                    description: "URL of the capex estimate source",
                  },
                  optionality_narrative: {
                    type: "string",
                    nullable: true,
                    description:
                      "2-3 sentence optionality summary — additional deposits, exploration upside, other projects",
                  },
                  optionality_source_url: {
                    type: "string",
                    nullable: true,
                    description: "URL for optionality information",
                  },
                },
                required: [
                  "resources_mlb",
                  "resources_source_url",
                  "resources_source_date",
                  "annual_production_mlb",
                  "production_source_url",
                  "capex_to_production_usd_m",
                  "capex_source_url",
                  "optionality_narrative",
                  "optionality_source_url",
                ],
              },
            },
          },
        ],
        tool_choice: {
          type: "function",
          function: { name: "store_miner_data" },
        },
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error(
        `AI gateway error for ${miner.ticker}: ${response.status} ${errText}`
      );
      if (response.status === 429) {
        return {
          success: false,
          error: `Rate limited — will retry on next run`,
        };
      }
      if (response.status === 402) {
        return { success: false, error: `Credits exhausted` };
      }
      return {
        success: false,
        error: `AI gateway error ${response.status}`,
      };
    }

    const result = await response.json();
    const toolCall = result.choices?.[0]?.message?.tool_calls?.[0];

    if (!toolCall || toolCall.function.name !== "store_miner_data") {
      console.error(
        `No tool call in response for ${miner.ticker}:`,
        JSON.stringify(result)
      );
      return { success: false, error: "AI did not return structured data" };
    }

    const extracted: ExtractionResult = JSON.parse(
      toolCall.function.arguments
    );
    return { success: true, data: extracted };
  } catch (e) {
    console.error(`Error extracting ${miner.ticker}:`, e);
    return {
      success: false,
      error: (e as Error).message,
    };
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  if (!LOVABLE_API_KEY) {
    return new Response(
      JSON.stringify({ error: "LOVABLE_API_KEY is not configured" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  try {
    // Optionally filter to specific tickers
    let tickerFilter: string[] | null = null;
    try {
      const body = await req.json();
      if (body?.tickers && Array.isArray(body.tickers)) {
        tickerFilter = body.tickers;
      }
    } catch {
      // No body or invalid JSON — process all miners
    }

    // 1. Read miners needing extraction
    let query = supabase
      .from("uranium_miner_universe")
      .select("ticker, company, stage, jurisdiction_operations");

    if (tickerFilter && tickerFilter.length > 0) {
      query = query.in("ticker", tickerFilter);
    } else {
      query = query.or(
        "resources_approved.eq.false,last_ai_extraction.is.null"
      );
    }

    const { data: miners, error: minersErr } = await query;

    if (minersErr) {
      throw new Error("Failed to read miners: " + minersErr.message);
    }

    if (!miners || miners.length === 0) {
      return new Response(
        JSON.stringify({
          message: "No miners need extraction",
          total: 0,
          results: [],
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    console.log(
      `Extracting data for ${miners.length} miners: ${miners
        .map((m) => m.ticker)
        .join(", ")}`
    );

    const results: {
      ticker: string;
      company: string;
      status: string;
      data?: ExtractionResult;
      error?: string;
    }[] = [];

    // 2. Process each miner sequentially to respect rate limits
    for (const miner of miners) {
      console.log(`Processing ${miner.ticker} (${miner.company})...`);

      const extraction = await extractMinerData(
        miner as MinerRow,
        LOVABLE_API_KEY
      );

      if (extraction.success && extraction.data) {
        // 3. Update uranium_miner_universe
        const updatePayload: Record<string, unknown> = {
          resources_mlb: extraction.data.resources_mlb,
          resources_source_url: extraction.data.resources_source_url,
          resources_source_date: extraction.data.resources_source_date,
          annual_production_mlb: extraction.data.annual_production_mlb,
          production_source_url: extraction.data.production_source_url,
          capex_to_production_usd_m:
            extraction.data.capex_to_production_usd_m,
          capex_source_url: extraction.data.capex_source_url,
          optionality_narrative: extraction.data.optionality_narrative,
          optionality_source_url: extraction.data.optionality_source_url,
          resources_approved: false,
          last_ai_extraction: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };

        const { error: updateErr } = await supabase
          .from("uranium_miner_universe")
          .update(updatePayload)
          .eq("ticker", miner.ticker);

        if (updateErr) {
          console.error(
            `Failed to update ${miner.ticker}: ${updateErr.message}`
          );
          results.push({
            ticker: miner.ticker,
            company: miner.company,
            status: "extracted but failed to save",
            data: extraction.data,
            error: updateErr.message,
          });
        } else {
          results.push({
            ticker: miner.ticker,
            company: miner.company,
            status: "ok",
            data: extraction.data,
          });
        }
      } else {
        results.push({
          ticker: miner.ticker,
          company: miner.company,
          status: "failed",
          error: extraction.error,
        });
      }

      // Small delay between requests to avoid rate limiting
      await new Promise((r) => setTimeout(r, 2000));
    }

    const succeeded = results.filter((r) => r.status === "ok").length;
    const failed = results.filter((r) => r.status !== "ok").length;

    const summary = {
      total: miners.length,
      succeeded,
      failed,
      results,
    };

    console.log(
      `Done: ${succeeded} succeeded, ${failed} failed out of ${miners.length}`
    );

    return new Response(JSON.stringify(summary), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("Fatal error:", e);
    return new Response(
      JSON.stringify({ error: (e as Error).message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
