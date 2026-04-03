import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const CACHE_TTL_HOURS = 6;

function isCacheFresh(lastFetched: string): boolean {
  return (Date.now() - new Date(lastFetched).getTime()) < CACHE_TTL_HOURS * 60 * 60 * 1000;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(supabaseUrl, serviceRoleKey);

  try {
    const { series_id, observation_start, action, cache_key, observations: goldObs } = await req.json();

    // Cache gold data from frontend (service role write)
    if (action === 'cache_gold' && cache_key && goldObs) {
      await supabase.from('data_cache').upsert({
        series_id: cache_key,
        data_json: goldObs,
        last_fetched: new Date().toISOString(),
      });
      return new Response(JSON.stringify({ ok: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Live gold spot price via Alpha Vantage
    if (action === 'gold_spot_price') {
      // Check cache first
      const { data: cached } = await supabase
        .from('data_cache')
        .select('*')
        .eq('series_id', 'GOLD_SPOT')
        .maybeSingle();

      if (cached && isCacheFresh(cached.last_fetched)) {
        return new Response(JSON.stringify({ observations: cached.data_json, fromCache: true }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Cache is stale or missing — fetch live gold price and merge with history
      try {
        // Fetch current gold price from free gold-api.com (no key needed)
        const goldApiRes = await fetch('https://api.gold-api.com/price/XAU');
        const goldApiData = await goldApiRes.json();

        if (!goldApiData?.price || isNaN(goldApiData.price)) {
          console.error('gold-api.com unexpected response:', JSON.stringify(goldApiData).slice(0, 500));
          if (cached) {
            return new Response(JSON.stringify({ observations: cached.data_json, fromCache: true, stale: true }), {
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
          }
          return new Response(JSON.stringify({ error: 'Gold API error and no cache available' }), {
            status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        const livePrice = goldApiData.price;
        const today = new Date().toISOString().slice(0, 10);

        // Merge: take existing cached observations, replace/add today's price
        let observations: { date: string; value: number }[] = [];
        if (cached && Array.isArray(cached.data_json)) {
          observations = (cached.data_json as any[]).filter((o: any) => o.date !== today);
        }
        observations.push({ date: today, value: livePrice });
        observations.sort((a, b) => a.date.localeCompare(b.date));

        // Update cache
        await supabase.from('data_cache').upsert({
          series_id: 'GOLD_SPOT',
          data_json: observations,
          last_fetched: new Date().toISOString(),
        });

        return new Response(JSON.stringify({ observations, fromCache: false, livePrice, source: 'gold-api' }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      } catch (err) {
        console.error('Gold price fetch failed:', err);
        if (cached) {
          return new Response(JSON.stringify({ observations: cached.data_json, fromCache: true, stale: true }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
        return new Response(JSON.stringify({ error: 'Gold price fetch failed and no cache' }), {
          status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    // Check cache first (using service role)
    const cacheId = cache_key || series_id;
    if (cacheId) {
      const { data: cached } = await supabase
        .from('data_cache')
        .select('*')
        .eq('series_id', cacheId)
        .maybeSingle();

      if (cached && isCacheFresh(cached.last_fetched)) {
        return new Response(JSON.stringify({ observations: cached.data_json, fromCache: true }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    // FRED proxy
    const apiKey = Deno.env.get('FRED_API_KEY')?.trim();
    if (!apiKey) {
      return new Response(JSON.stringify({ error: 'FRED_API_KEY not configured' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const url = `https://api.stlouisfed.org/fred/series/observations?series_id=${series_id}&api_key=${apiKey}&file_type=json&observation_start=${observation_start || '2015-01-01'}`;
    const response = await fetch(url);
    const data = await response.json();

    // Cache the parsed observations server-side
    if (data?.observations && cacheId) {
      const parsed = data.observations
        .filter((o: any) => o.value !== '.' && !isNaN(parseFloat(o.value)))
        .map((o: any) => ({ date: o.date, value: parseFloat(o.value) }));

      await supabase.from('data_cache').upsert({
        series_id: cacheId,
        data_json: parsed,
        last_fetched: new Date().toISOString(),
      });
    }

    return new Response(JSON.stringify(data), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
