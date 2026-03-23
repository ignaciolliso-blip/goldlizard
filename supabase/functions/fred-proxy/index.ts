import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { series_id, observation_start, action } = await req.json();

    // Gold price proxy via metals.dev free API
    if (action === 'gold_price') {
      // Use metals.dev free endpoint
      const url = `https://api.metals.dev/v1/timeseries?api_key=demo&currency=USD&unit=toz&start_date=${observation_start || '2015-01-01'}&end_date=${new Date().toISOString().split('T')[0]}&metal=gold`;
      
      try {
        const response = await fetch(url);
        if (response.ok) {
          const data = await response.json();
          return new Response(JSON.stringify(data), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
      } catch (e) {
        // Fall through to alternative
      }

      // Alternative: use Yahoo Finance historical data via a simple proxy
      // If all else fails, return empty to use FRED data fallback
      return new Response(JSON.stringify({ rates: {} }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // FRED proxy
    const apiKey = Deno.env.get('FRED_API_KEY')?.trim();

    if (!apiKey) {
      return new Response(JSON.stringify({ error: 'FRED_API_KEY not configured' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const url = `https://api.stlouisfed.org/fred/series/observations?series_id=${series_id}&api_key=${apiKey}&file_type=json&observation_start=${observation_start || '2015-01-01'}&frequency=d`;

    const response = await fetch(url);
    const data = await response.json();

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
