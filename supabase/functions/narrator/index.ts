import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, serviceRoleKey);

  try {
    const { dashboardData, dataHash, checkCacheOnly, asset = 'gold' } = await req.json();

    // Cache check (using service role so RLS doesn't block)
    if (dataHash) {
      const { data: cached } = await supabase
        .from("narrator_cache")
        .select("*")
        .eq("id", 1)
        .single();

      if (cached && cached.data_hash === dataHash && cached.briefing_text) {
        return new Response(JSON.stringify({
          briefing: cached.briefing_text,
          generated_at: cached.generated_at,
          fromCache: true,
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (checkCacheOnly) {
        return new Response(JSON.stringify({ briefing: null, fromCache: false }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const systemPrompt = `You are Nacho's personal gold macro analyst. Write a 3-4 paragraph briefing about the current gold market regime based on the data below. Be direct, analytical, and opinionated. Speak as if writing a weekly note to a value investor who holds gold miners (GDX, GDXJ), uranium (DNN), and physical gold.

Structure:
- Paragraph 1: Current regime summary — what the GDI says and whether it aligns with price action
- Paragraph 2: What's driving it — the 2-3 most influential variables right now, with specific numbers
- Paragraph 3: What changed recently — biggest shifts in the last 30 days and why they matter
- Paragraph 4: What to watch — 2-3 upcoming catalysts or data points that could shift the picture

Use specific numbers from the data. Reference the z-scores and contributions. If there's a divergence between the GDI and gold price, highlight it prominently. Keep it under 300 words. No bullet points — flowing prose only. Sign off with the one-line takeaway.

When discussing specific variables, explain them the way you would across a desk — not what the variable IS (the user knows), but what it's DOING right now, why the current level matters, what's offsetting or reinforcing it, and what would change it. Use the specific z-scores, percentiles, and contributions from the data. The user is a sophisticated M&A professional who understands finance — don't oversimplify, but don't use jargon without context either.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `Dashboard data as of ${new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}:\n\n${dashboardData}` },
        ],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limited, please try again later." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Credits exhausted. Add funds at Settings > Workspace > Usage." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      return new Response(JSON.stringify({ error: "AI gateway error" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await response.json();
    const briefing = data.choices?.[0]?.message?.content || "";
    const now = new Date().toISOString();

    // Cache result server-side
    if (dataHash) {
      await supabase.from("narrator_cache").update({
        briefing_text: briefing,
        data_hash: dataHash,
        generated_at: now,
      }).eq("id", 1);
    }

    return new Response(JSON.stringify({ briefing, generated_at: now }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("narrator error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
