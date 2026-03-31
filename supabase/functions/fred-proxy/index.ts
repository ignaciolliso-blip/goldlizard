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
    const { series_id, observation_start, action, cache_key } = await req.json();

    // Gold price proxy
    if (action === 'gold_price') {
      const url = `https://api.metals.dev/v1/timeseries?api_key=demo&currency=USD&unit=toz&start_date=${observation_start || '2015-01-01'}&end_date=${new Date().toISOString().split('T')[0]}&metal=gold`;
      try {
        const response = await fetch(url);
        if (response.ok) {
          const data = await response.json();
          return new Response(JSON.stringify(data), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
      } catch (_e) { /* fall through */ }
      return new Response(JSON.stringify({ rates: {} }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
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
