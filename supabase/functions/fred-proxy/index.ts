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

    // Gold price proxy
    if (action === 'gold_price') {
      const startDate = observation_start || '2005-01-01';
      const endDate = new Date().toISOString().split('T')[0];
      const url = `https://api.freegoldapi.com/v1/daily?start=${startDate}&end=${endDate}`;
      const response = await fetch(url);
      const data = await response.json();
      return new Response(JSON.stringify(data), {
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
