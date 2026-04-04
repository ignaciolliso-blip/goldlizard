import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseKey)

    // Check if data was fetched recently (within 15 minutes)
    const { data: lastFetch } = await supabase
      .from('solana_metrics')
      .select('fetched_at')
      .eq('metric_name', 'sol_price')
      .single()

    if (lastFetch?.fetched_at) {
      const lastFetchTime = new Date(lastFetch.fetched_at).getTime()
      const now = Date.now()
      const fifteenMinutes = 15 * 60 * 1000
      if (now - lastFetchTime < fifteenMinutes) {
        return new Response(
          JSON.stringify({ status: 'cached', message: 'Data is fresh (< 15 min old)' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
    }

    // ============================================
    // FETCH 1: CoinGecko — SOL, BTC, ETH prices
    // ============================================
    let solPrice = 0, solMarketCap = 0, solFdv = 0, solVolume = 0
    let btcPrice = 0, ethPrice = 0

    try {
      const cgResponse = await fetch(
        'https://api.coingecko.com/api/v3/simple/price?ids=solana,bitcoin,ethereum&vs_currencies=usd&include_market_cap=true&include_24hr_vol=true'
      )
      if (cgResponse.ok) {
        const cgData = await cgResponse.json()
        solPrice = cgData.solana?.usd || 0
        solMarketCap = cgData.solana?.usd_market_cap || 0
        solVolume = cgData.solana?.usd_24h_vol || 0
        btcPrice = cgData.bitcoin?.usd || 0
        ethPrice = cgData.ethereum?.usd || 0
      }
    } catch (e) {
      console.error('CoinGecko fetch failed:', e)
    }

    // Get SOL FDV separately
    try {
      const solDataResponse = await fetch(
        'https://api.coingecko.com/api/v3/coins/solana?localization=false&tickers=false&market_data=true&community_data=false&developer_data=false'
      )
      if (solDataResponse.ok) {
        const solData = await solDataResponse.json()
        solFdv = solData.market_data?.fully_diluted_valuation?.usd || solMarketCap
      }
    } catch (e) {
      console.error('CoinGecko FDV fetch failed:', e)
      solFdv = solMarketCap
    }

    // ============================================
    // FETCH 2: DefiLlama — Solana TVL
    // ============================================
    let tvlUsd = 0

    try {
      const tvlResponse = await fetch('https://api.llama.fi/v2/chains')
      if (tvlResponse.ok) {
        const chainsData = await tvlResponse.json()
        const solanaChain = chainsData.find((c: any) => c.name === 'Solana')
        tvlUsd = solanaChain?.tvl || 0
      }
    } catch (e) {
      console.error('DefiLlama TVL fetch failed:', e)
    }

    // ============================================
    // FETCH 3: DefiLlama — Stablecoin supply on Solana
    // ============================================
    let stablecoinSupply = 0

    try {
      const stablesResponse = await fetch('https://stablecoins.llama.fi/stablecoinchains')
      if (stablesResponse.ok) {
        const stablesData = await stablesResponse.json()
        const solanaStables = stablesData.find((c: any) => c.name === 'Solana')
        stablecoinSupply = solanaStables?.totalCirculatingUSD?.peggedUSD || 0
      }
    } catch (e) {
      console.error('DefiLlama stablecoins fetch failed:', e)
    }

    // ============================================
    // FEES: Read from manual input in solana_metrics
    // ============================================
    const { data: feesRow } = await supabase
      .from('solana_metrics')
      .select('value')
      .eq('metric_name', 'daily_fees')
      .single()

    const dailyFees = feesRow?.value || 0
    const annualisedFees = dailyFees * 365
    const fdvFeeRatio = annualisedFees > 0 ? solFdv / annualisedFees : 0

    // ============================================
    // FETCH 4: Solana RPC — Total daily transactions
    // ============================================
    let dailyTransactions = 0

    try {
      const rpcResponse = await fetch('https://api.mainnet-beta.solana.com', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 1,
          method: 'getRecentPerformanceSamples',
          params: [1]
        })
      })
      if (rpcResponse.ok) {
        const rpcData = await rpcResponse.json()
        if (rpcData.result && rpcData.result[0]) {
          const sample = rpcData.result[0]
          const txPerSecond = sample.numTransactions / sample.samplePeriodSecs
          dailyTransactions = Math.round(txPerSecond * 86400)
        }
      }
    } catch (e) {
      console.error('Solana RPC fetch failed:', e)
    }

    // ============================================
    // WRITE ALL METRICS TO SUPABASE
    // ============================================
    const now = new Date().toISOString()
    const metrics = [
      { metric_name: 'sol_price', value: solPrice, source: 'coingecko', fetched_at: now },
      { metric_name: 'sol_market_cap', value: solMarketCap, source: 'coingecko', fetched_at: now },
      { metric_name: 'sol_fdv', value: solFdv, source: 'coingecko', fetched_at: now },
      { metric_name: 'sol_volume_24h', value: solVolume, source: 'coingecko', fetched_at: now },
      { metric_name: 'btc_price', value: btcPrice, source: 'coingecko', fetched_at: now },
      { metric_name: 'eth_price', value: ethPrice, source: 'coingecko', fetched_at: now },
      { metric_name: 'tvl_usd', value: tvlUsd, source: 'defillama', fetched_at: now },
      { metric_name: 'stablecoin_supply', value: stablecoinSupply, source: 'defillama', fetched_at: now },
      { metric_name: 'fdv_fee_ratio', value: fdvFeeRatio, source: 'computed', fetched_at: now },
      { metric_name: 'daily_transactions', value: dailyTransactions, source: 'solana_rpc', fetched_at: now },
    ]

    for (const metric of metrics) {
      await supabase
        .from('solana_metrics')
        .upsert(metric, { onConflict: 'metric_name' })
    }

    // ============================================
    // APPEND DAILY SNAPSHOT (once per day)
    // ============================================
    const today = new Date().toISOString().split('T')[0]

    const { data: existingSnapshot } = await supabase
      .from('solana_daily_history')
      .select('id')
      .eq('date', today)
      .single()

    if (!existingSnapshot) {
      await supabase.from('solana_daily_history').insert({
        date: today,
        sol_price: solPrice,
        sol_market_cap: solMarketCap,
        sol_fdv: solFdv,
        sol_volume_24h: solVolume,
        tvl_usd: tvlUsd,
        stablecoin_supply_usd: stablecoinSupply,
        daily_fees_usd: dailyFees,
        annualised_fees: annualisedFees,
        fdv_fee_ratio: fdvFeeRatio,
        btc_price: btcPrice,
        eth_price: ethPrice,
      })
    }

    return new Response(
      JSON.stringify({
        status: 'success',
        sol_price: solPrice,
        tvl: tvlUsd,
        fdv_fee_ratio: fdvFeeRatio,
        fetched_at: now
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    )
  }
})
