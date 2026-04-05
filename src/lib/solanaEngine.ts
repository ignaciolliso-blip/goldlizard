import type { SolanaMetrics, SolanaDailyHistory, SolanaAgentMetric } from '@/hooks/useSolanaData';

// ── Anchor: FDV / Fee Revenue ──

export interface SolanaAnchorResult {
  fdv: number;
  dailyFees: number;
  annualisedFees: number;
  fdvFeeRatio: number;
  ethFdvFeeRatio: number;
  ratioTrend6m: 'compressing' | 'expanding' | 'flat';
  conclusion: { text: string; detail: string; color: string };
}

export function computeSolanaAnchor(
  metrics: SolanaMetrics,
  history: SolanaDailyHistory[]
): SolanaAnchorResult {
  const fdv = Number(metrics.sol_fdv) || 0;
  const dailyFees = Number(metrics.daily_fees) || 0;
  const annualisedFees = dailyFees * 365;
  const fdvFeeRatio = annualisedFees > 0 ? fdv / annualisedFees : 0;

  // Ethereum comparison — manually inputted
  const ethDailyFees = metrics.eth_daily_fees || 0;
  const ethAnnFees = ethDailyFees * 365;
  // Eth FDV ~$250B as rough reference, but we'll compute from what we have
  const ethFdvFeeRatio = ethAnnFees > 0 ? 250_000_000_000 / ethAnnFees : 300;

  // 6-month trend from history
  let ratioTrend6m: 'compressing' | 'expanding' | 'flat' = 'flat';
  if (history.length >= 2) {
    const recent = history.filter(h => h.fdv_fee_ratio && h.fdv_fee_ratio > 0);
    if (recent.length >= 2) {
      const oldRatio = recent[Math.max(0, recent.length - 180)]?.fdv_fee_ratio ?? 0;
      const newRatio = recent[recent.length - 1]?.fdv_fee_ratio ?? 0;
      if (oldRatio > 0 && newRatio > 0) {
        const change = (newRatio - oldRatio) / oldRatio;
        if (change < -0.1) ratioTrend6m = 'compressing';
        else if (change > 0.1) ratioTrend6m = 'expanding';
      }
    }
  }

  const conclusion = deriveAnchorConclusion(fdvFeeRatio, ethFdvFeeRatio, ratioTrend6m);

  return { fdv, dailyFees, annualisedFees, fdvFeeRatio, ethFdvFeeRatio, ratioTrend6m, conclusion };
}

function deriveAnchorConclusion(
  solanaRatio: number,
  ethRatio: number,
  ratioTrend6m: string
): { text: string; detail: string; color: string } {
  if (solanaRatio === 0) {
    return {
      text: 'AWAITING FEE DATA',
      detail: 'Daily fee revenue has not been entered yet. Enter it in the Data Management tab to enable this analysis.',
      color: 'muted',
    };
  }

  const vsEth = ethRatio > 0 ? solanaRatio / ethRatio : 0;

  if (solanaRatio > 10000) {
    return {
      text: 'EXTREMELY EXPENSIVE',
      detail: `Solana trades at ${Math.round(vsEth)}× Ethereum's fee multiple. At current fee levels, you'd wait ${Math.round(solanaRatio).toLocaleString()} years to earn back your investment from fees alone. This is only justified if you believe fee revenue will grow 30-50× from here.`,
      color: 'bearish',
    };
  }
  if (solanaRatio > 2000) {
    if (ratioTrend6m === 'compressing') {
      return {
        text: 'EXPENSIVE BUT IMPROVING',
        detail: `The ratio is still high (${Math.round(solanaRatio).toLocaleString()}×) but compressing — fees are growing faster than price. If this trend continues, the ratio reaches more reasonable levels within 1-2 years.`,
        color: 'neutral',
      };
    }
    return {
      text: 'EXPENSIVE — FEES NOT KEEPING UP',
      detail: `The ratio is high and NOT compressing. Either fee growth has stalled or the market is pricing in growth that isn't materialising. Be cautious.`,
      color: 'bearish',
    };
  }
  if (solanaRatio > 500) {
    return {
      text: 'GROWTH PREMIUM — REASONABLE IF ADOPTION CONTINUES',
      detail: `Solana's fee multiple (${Math.round(solanaRatio).toLocaleString()}×) is within range of a high-growth tech platform. This implies the market expects fees to grow ${Math.round(solanaRatio / 300)}-${Math.round(solanaRatio / 100)}× to reach mature valuations.`,
      color: 'neutral',
    };
  }
  if (solanaRatio > 100) {
    return {
      text: 'FAIRLY VALUED — FEE REVENUE SUPPORTS THE PRICE',
      detail: `Solana's fee multiple is approaching mature platform territory. If fee growth continues, this could be an attractive entry point.`,
      color: 'bullish',
    };
  }
  return {
    text: 'UNDERVALUED ON FEES — RARE FOR CRYPTO',
    detail: `Solana trades at a lower fee multiple than Ethereum. This either means the market sees structural risks or it's a genuine value opportunity.`,
    color: 'bullish',
  };
}

// ── Forces: Network Activity ──

export interface ForceMetric {
  name: string;
  value: number | string;
  signal: 'up' | 'down' | 'flat';
  tier: 1 | 2 | 3;
}

export interface SolanaForcesResult {
  metrics: ForceMetric[];
  tier1Score: { improving: number; total: number; verdict: string };
  tier2Score: { improving: number; total: number; verdict: string };
  tier3Score: { improving: number; total: number; verdict: string };
  overallVerdict: 'growing' | 'stalling' | 'contracting' | 'insufficient_data';
  insufficientData: boolean;
}

export function computeSolanaForces(
  metrics: SolanaMetrics,
  history: SolanaDailyHistory[],
  agentMetrics: SolanaAgentMetric[]
): SolanaForcesResult {
  const insufficientData = history.length < 7;
  const lastAgent = agentMetrics.length > 0 ? agentMetrics[agentMetrics.length - 1] : null;

  const forceMetrics: ForceMetric[] = [
    // Tier 1: Agentic
    { name: 'x402 transactions/day', value: lastAgent?.x402_daily_transactions ?? 0, signal: 'flat' as const, tier: 1 },
    { name: 'Agent % of total txns', value: lastAgent?.agent_pct_of_total_txns ? `${lastAgent.agent_pct_of_total_txns}%` : 'N/A', signal: 'flat' as const, tier: 1 },
    { name: 'Agent fee revenue/day', value: lastAgent?.x402_daily_volume_usd ?? 0, signal: 'flat' as const, tier: 1 },
    // Tier 2: Ecosystem
    { name: 'Total TVL', value: metrics.tvl_usd, signal: 'flat' as const, tier: 2 },
    { name: 'Stablecoin supply', value: metrics.stablecoin_supply, signal: 'flat' as const, tier: 2 },
    { name: 'SOL 24h volume', value: metrics.sol_volume_24h, signal: 'flat' as const, tier: 2 },
    // Tier 3: Market
    { name: 'BTC price', value: metrics.btc_price, signal: 'flat' as const, tier: 3 },
    { name: 'ETH price', value: metrics.eth_price, signal: 'flat' as const, tier: 3 },
    { name: 'SOL price', value: metrics.sol_price, signal: 'flat' as const, tier: 3 },
  ];

  // Without historical comparison data yet, default to flat
  const tier1 = forceMetrics.filter(m => m.tier === 1);
  const tier2 = forceMetrics.filter(m => m.tier === 2);
  const tier3 = forceMetrics.filter(m => m.tier === 3);

  const countImproving = (arr: ForceMetric[]) => arr.filter(m => m.signal === 'up').length;

  const tierVerdict = (improving: number, total: number) => {
    if (improving >= total * 0.6) return 'GROWING';
    if (improving <= total * 0.3) return 'CONTRACTING';
    return 'STALLING';
  };

  const t1 = { improving: countImproving(tier1), total: tier1.length, verdict: tierVerdict(countImproving(tier1), tier1.length) };
  const t2 = { improving: countImproving(tier2), total: tier2.length, verdict: tierVerdict(countImproving(tier2), tier2.length) };
  const t3 = { improving: countImproving(tier3), total: tier3.length, verdict: tierVerdict(countImproving(tier3), tier3.length) };

  const totalImproving = countImproving(forceMetrics);

  let overallVerdict: 'growing' | 'stalling' | 'contracting' | 'insufficient_data';
  if (insufficientData) {
    overallVerdict = 'insufficient_data';
  } else {
    overallVerdict = totalImproving >= forceMetrics.length * 0.5 ? 'growing' :
      totalImproving <= forceMetrics.length * 0.3 ? 'contracting' : 'stalling';
  }

  return { metrics: forceMetrics, tier1Score: t1, tier2Score: t2, tier3Score: t3, overallVerdict, insufficientData };
}

// ── Leverage: Timing Signal ──

export interface SolanaLeverageResult {
  timingSignal: { text: string; color: string };
}

export function computeSolanaLeverage(
  anchorTrend: 'compressing' | 'expanding' | 'flat',
  forcesVerdict: 'growing' | 'stalling' | 'contracting' | 'insufficient_data'
): SolanaLeverageResult {
  if (forcesVerdict === 'insufficient_data') {
    return { timingSignal: { text: 'WAIT — Accumulating baseline data. Check back in one week for trend signals.', color: 'neutral' } };
  }
  if (forcesVerdict === 'contracting' && anchorTrend === 'expanding') {
    return { timingSignal: { text: 'DO NOT ADD — fundamentals deteriorating while valuation stays high', color: 'bearish' } };
  }
  if (forcesVerdict === 'contracting' && anchorTrend === 'compressing') {
    return { timingSignal: { text: 'WAIT — price adjusting to weaker fundamentals. Look for stabilisation.', color: 'bearish' } };
  }
  if (forcesVerdict === 'growing' && anchorTrend === 'compressing') {
    return { timingSignal: { text: 'ACCUMULATE — fundamentals improving and valuation becoming reasonable', color: 'bullish' } };
  }
  if (forcesVerdict === 'growing' && anchorTrend === 'expanding') {
    return { timingSignal: { text: 'HOLD — fundamentals good but market may be ahead of itself', color: 'neutral' } };
  }
  return { timingSignal: { text: 'NEUTRAL — no clear signal. Maintain current allocation.', color: 'neutral' } };
}

// ── Formatting helpers ──

export function formatUSD(n: number): string {
  if (n >= 1e12) return `$${(n / 1e12).toFixed(2)}T`;
  if (n >= 1e9) return `$${(n / 1e9).toFixed(2)}B`;
  if (n >= 1e6) return `$${(n / 1e6).toFixed(1)}M`;
  if (n >= 1e3) return `$${(n / 1e3).toFixed(0)}K`;
  return `$${n.toFixed(0)}`;
}

export function formatNumber(n: number): string {
  if (n >= 1e9) return `${(n / 1e9).toFixed(2)}B`;
  if (n >= 1e6) return `${(n / 1e6).toFixed(1)}M`;
  if (n >= 1e3) return `${(n / 1e3).toFixed(0)}K`;
  return n.toFixed(0);
}
