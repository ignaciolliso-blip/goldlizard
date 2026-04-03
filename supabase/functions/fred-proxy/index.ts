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

      // Try multiple sources: FMP first, then Alpha Vantage, then stale cache
      const fmpKey = Deno.env.get('FMP_API_KEY')?.trim();
      const avKey = Deno.env.get('ALPHA_VANTAGE_KEY')?.trim();

      // Source 1: FMP historical gold price
      if (fmpKey) {
        try {
          const fmpUrl = `https://financialmodelingprep.com/api/v3/historical-price-full/XAUUSD?from=2005-01-01&apikey=${fmpKey}`;
          const fmpRes = await fetch(fmpUrl);
          const fmpData = await fmpRes.json();

          if (fmpData?.historical && Array.isArray(fmpData.historical)) {
            const fmpObs = fmpData.historical
              .map((d: any) => ({ date: d.date, value: parseFloat(d.close) }))
              .filter((o: any) => !isNaN(o.value))
              .sort((a: any, b: any) => a.date.localeCompare(b.date));

            if (fmpObs.length > 100) {
              await supabase.from('data_cache').upsert({
                series_id: 'GOLD_SPOT',
                data_json: fmpObs,
                last_fetched: new Date().toISOString(),
              });

              const latestPrice = fmpObs[fmpObs.length - 1]?.value;
              return new Response(JSON.stringify({ observations: fmpObs, fromCache: false, livePrice: latestPrice, source: 'fmp' }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
              });
            }
          }
          console.error('FMP unexpected response:', JSON.stringify(fmpData).slice(0, 500));
        } catch (fmpErr) {
          console.error('FMP fetch failed:', fmpErr);
        }
      }

      // Source 2: Alpha Vantage FX_DAILY XAU/USD
      if (avKey) {
        try {
          const avUrl = `https://www.alphavantage.co/query?function=FX_DAILY&from_symbol=XAU&to_symbol=USD&outputsize=full&apikey=${avKey}`;
          const avRes = await fetch(avUrl);
          const avData = await avRes.json();

          const timeSeries = avData?.['Time Series FX (Daily)'];
          if (timeSeries && typeof timeSeries === 'object') {
            const avObs: { date: string; value: number }[] = [];
            for (const [date, ohlc] of Object.entries(timeSeries)) {
              const close = parseFloat((ohlc as any)['4. close']);
              if (!isNaN(close) && date >= '2005-01-01') {
                avObs.push({ date, value: close });
              }
            }
            avObs.sort((a, b) => a.date.localeCompare(b.date));

            if (avObs.length > 100) {
              await supabase.from('data_cache').upsert({
                series_id: 'GOLD_SPOT',
                data_json: avObs,
                last_fetched: new Date().toISOString(),
              });

              const latestPrice = avObs[avObs.length - 1]?.value;
              return new Response(JSON.stringify({ observations: avObs, fromCache: false, livePrice: latestPrice, source: 'alphavantage' }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
              });
            }
          }
          console.error('Alpha Vantage unexpected response:', JSON.stringify(avData).slice(0, 500));
        } catch (avErr) {
          console.error('Alpha Vantage fetch failed:', avErr);
        }
      }

      // Source 3: Return stale cache if available
      if (cached) {
        return new Response(JSON.stringify({ observations: cached.data_json, fromCache: true, stale: true }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      return new Response(JSON.stringify({ error: 'No gold price source available and no cache' }), {
        status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
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
