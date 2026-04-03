import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const AI_GATEWAY = "https://ai.gateway.lovable.dev/v1/chat/completions";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const SB_URL = Deno.env.get("SUPABASE_URL")!;
    const SB_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const supabase = createClient(SB_URL, SB_KEY);

    // Step 1: Fetch UxC price indicators page
    console.log("Fetching UxC price indicators page...");
    const pageRes = await fetch("https://www.uxc.com/p/prices/UxCPriceIndicators.aspx", {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; PriceBot/1.0)",
        "Accept": "text/html",
      },
    });

    if (!pageRes.ok) {
      throw new Error(`Failed to fetch UxC page: ${pageRes.status}`);
    }

    const html = await pageRes.text();

    // Trim HTML to reduce token usage — keep only the main content area
    const trimmedHtml = html.length > 30000 ? html.substring(0, 30000) : html;

    // Step 2: Use AI to extract prices
    console.log("Extracting prices via AI...");
    const aiRes = await fetch(AI_GATEWAY, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content:
              "You are a data extraction assistant. Extract uranium prices from web page HTML. Use the tool provided to return structured data. Prices are in USD per pound U3O8.",
          },
          {
            role: "user",
            content: `Extract the current uranium spot price (Ux U3O8 Price) and long-term contract price (Ux LT U3O8 Price) from this UxC price indicators page HTML:\n\n${trimmedHtml}`,
          },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "store_uranium_prices",
              description: "Store the extracted uranium spot and long-term contract prices",
              parameters: {
                type: "object",
                properties: {
                  spot_price: {
                    type: "number",
                    description: "Current uranium spot price in USD/lb U3O8",
                  },
                  lt_contract_price: {
                    type: "number",
                    description: "Current uranium long-term contract price in USD/lb U3O8",
                  },
                },
                required: ["spot_price"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "store_uranium_prices" } },
      }),
    });

    if (!aiRes.ok) {
      const errText = await aiRes.text();
      console.error("AI gateway error:", aiRes.status, errText);
      throw new Error(`AI extraction failed: ${aiRes.status}`);
    }

    const aiData = await aiRes.json();
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall?.function?.arguments) {
      throw new Error("AI did not return structured price data");
    }

    const prices = JSON.parse(toolCall.function.arguments);
    const spotPrice = Number(prices.spot_price);
    const ltPrice = prices.lt_contract_price ? Number(prices.lt_contract_price) : null;

    if (!spotPrice || isNaN(spotPrice) || spotPrice < 10 || spotPrice > 500) {
      throw new Error(`Extracted spot price looks invalid: ${spotPrice}`);
    }

    console.log(`Extracted: spot=$${spotPrice}, LT=$${ltPrice}`);

    // Step 3: Insert into uranium_prices
    const today = new Date().toISOString().split("T")[0];

    // Upsert: delete existing row for today then insert
    await supabase.from("uranium_prices").delete().eq("date", today);

    const { error: insertErr } = await supabase.from("uranium_prices").insert({
      date: today,
      spot_price: spotPrice,
      lt_contract_price: ltPrice,
    });

    if (insertErr) throw new Error(`Insert failed: ${insertErr.message}`);

    console.log(`Inserted uranium price for ${today}`);

    return new Response(
      JSON.stringify({
        success: true,
        date: today,
        spot_price: spotPrice,
        lt_contract_price: ltPrice,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("fetch-uranium-price error:", e);
    return new Response(
      JSON.stringify({ success: false, error: (e as Error).message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
