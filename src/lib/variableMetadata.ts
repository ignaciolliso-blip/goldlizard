export interface EvidenceSource {
  title: string;
  quote: string;
  url: string;
}

export interface ContextLink {
  title: string;
  url: string;
}

export interface RegimeBand {
  startDate: string;
  endDate: string;
  label: string;
  color: 'bullish' | 'bearish';
}

export interface VariableMetadata {
  id: string;
  name: string;
  fredUrl: string;
  provider: string;
  frequency: string;
  unit: string;
  explanation: string;
  evidenceSources: EvidenceSource[];
  contextLinks: ContextLink[];
  regimeBands?: RegimeBand[];
}

export const VARIABLE_METADATA: Record<string, VariableMetadata> = {
  GOLD_CPI_RATIO: {
    id: 'GOLD_CPI_RATIO',
    name: 'Gold / CPI Ratio',
    fredUrl: 'https://fred.stlouisfed.org/series/CPIAUCSL',
    provider: 'Computed from FRED: GOLDAMGBD228NLBM / CPIAUCSL',
    frequency: 'Monthly',
    unit: 'ratio',
    explanation:
      "The Gold/CPI ratio measures how many 'baskets of consumer goods' one ounce of gold can buy. When this ratio is above its long-term average, gold has outpaced consumer inflation — it's 'expensive' in real terms. When below, gold is 'cheap' relative to the cost of living. Over 200 years, this ratio has mean-reverted, making it one of the most reliable long-term valuation anchors for gold. The ratio spiked dramatically in 1980 and 2011 before mean-reverting, and is currently elevated but below those historical extremes.",
    evidenceSources: [
      { title: 'World Gold Council — Gold as a strategic inflation hedge', quote: 'Gold has historically outpaced CPI over multi-decade periods', url: 'https://www.gold.org/goldhub/research/beyond-cpi-gold-as-a-strategic-inflation-hedge' },
      { title: 'GoldSilver.com — Gold vs Inflation: What 100 Years of Data Shows', quote: 'Gold preserves purchasing power across inflationary regimes', url: 'https://goldsilver.com/industry-news/article/gold-vs-inflation-what-100-years-of-data-shows/' },
      { title: 'SPDR Gold Research — Gold as a Store of Value (Harmston study)', quote: 'Gold maintains purchasing power over centuries', url: 'https://www.spdrgoldshares.com/media/GLD/file/research_study_22.pdf' },
    ],
    contextLinks: [
      { title: 'BLS CPI Data', url: 'https://www.bls.gov/cpi/' },
      { title: 'FRED CPI Series', url: 'https://fred.stlouisfed.org/series/CPIAUCSL' },
    ],
  },

  GOLD_M2_RATIO: {
    id: 'GOLD_M2_RATIO',
    name: 'Gold / M2 Ratio',
    fredUrl: 'https://fred.stlouisfed.org/series/WM2NS',
    provider: 'Computed from FRED: GOLDAMGBD228NLBM / WM2NS',
    frequency: 'Monthly',
    unit: 'ratio',
    explanation:
      "The Gold/M2 ratio measures how much gold one unit of money supply can buy. When M2 expands (money printing), but gold hasn't repriced proportionally, this ratio falls — signalling that gold is 'cheap' relative to the money that's been created. This is the core debasement indicator. Since 1971, the ratio has oscillated but shown a clear pattern: after major money supply expansions, gold eventually reprices upward to close the gap. The massive M2 expansion of 2020-2021 ($6 trillion in new money) pushed this ratio to historic lows, from which gold has been repricing upward.",
    evidenceSources: [
      { title: 'Vaulted — Gold vs Money Supply', quote: 'Gold historically reprices to reflect monetary expansion', url: 'https://vaulted.com/nuggets/gold-vs-money-supply/' },
      { title: 'MoneyMetals — U.S. and Global Money Supply Surges to Record Highs', quote: 'Global M2 at record levels signals continued gold tailwind', url: 'https://www.moneymetals.com/news/2025/06/05/us-and-global-money-supply-surges-to-record-highs-004101' },
      { title: 'Scottsdale Bullion — Why Gold Isn\'t Expensive Even at ATHs', quote: 'Relative to money supply, gold remains undervalued', url: 'https://www.sbcgold.com/blog/why-gold-isnt-expensive-even-at-all-time-highs/' },
      { title: 'In Gold We Trust — M2 Gold Ratio Chart', quote: 'The M2/Gold ratio reveals long-term debasement cycles', url: 'https://ingoldwetrust.report/chart-m2-gold-ratio/?lang=en' },
    ],
    contextLinks: [
      { title: 'FRED M2 Series', url: 'https://fred.stlouisfed.org/series/WM2NS' },
      { title: 'Fed Balance Sheet', url: 'https://www.federalreserve.gov/monetarypolicy/bst_recenttrends.htm' },
    ],
  },

  WM2NS_DEV: {
    id: 'WM2NS_DEV',
    name: 'M2 Cumulative Deviation from Trend',
    fredUrl: 'https://fred.stlouisfed.org/series/WM2NS',
    provider: 'Computed from FRED: WM2NS (deviation from exponential trend fit)',
    frequency: 'Weekly → Monthly',
    unit: '%',
    explanation:
      "This measures how far the actual M2 money supply has deviated from its long-term exponential growth trend. After the 2020-2021 pandemic stimulus, M2 surged approximately $6 trillion above trend — the largest deviation in history. Even after the 2022-2023 contraction, M2 remains well above where it would have been without the extraordinary money creation. This excess liquidity eventually flows into asset prices, including gold. The cumulative nature of the metric is key: it captures the total stock of excess money, not just the rate of change.",
    evidenceSources: [
      { title: 'Metalorix — M2 Money Supply and Gold Prices', quote: 'Excess M2 above trend is a leading indicator for gold price appreciation', url: 'https://metalorix.com/en/learn/price-factors/money-supply-m2-and-gold' },
      { title: 'National Gold Group — M2 Money Supply Hits $22.4 Trillion', quote: 'M2 remains elevated above pre-COVID trend despite contraction', url: 'https://www.nationalgoldgroup.com/blog/m2-money-supply-hits-22-4-trillion-what-it-means-for-inflation/' },
    ],
    contextLinks: [
      { title: 'FRED M2 Weekly', url: 'https://fred.stlouisfed.org/series/WM2NS' },
      { title: 'Fed Balance Sheet', url: 'https://www.federalreserve.gov/monetarypolicy/bst_recenttrends.htm' },
    ],
  },

  GFDEGDQ188S: {
    id: 'GFDEGDQ188S',
    name: 'US Federal Debt-to-GDP',
    fredUrl: 'https://fred.stlouisfed.org/series/GFDEGDQ188S',
    provider: 'Federal Reserve Bank of St. Louis / US Treasury',
    frequency: 'Quarterly',
    unit: '%',
    explanation:
      "Federal debt as a percentage of GDP measures the government's debt burden relative to the size of the economy. At over 120% and rising, it's at levels last seen during World War II. The higher this ratio, the stronger the government's incentive to allow inflation to erode the real value of its debt — a process economists call 'financial repression.' Reinhart and Sbrancia's landmark IMF research showed that this mechanism liquidated 3-4% of GDP per year in government debt during 1945-1980. The CBO projects debt/GDP rising to ~140% by 2031, making this a structurally bullish force for gold that only intensifies over time.",
    evidenceSources: [
      { title: 'IMF — The Liquidation of Government Debt (Reinhart & Sbrancia)', quote: 'Financial repression liquidated 3-4% of GDP per year in government debt during 1945-1980', url: 'https://www.imf.org/external/np/seminars/eng/2011/res2/pdf/crbs.pdf' },
      { title: 'Richmond Fed — A Look Back at Financial Repression', quote: 'Governments historically use negative real rates to erode debt burdens', url: 'https://www.richmondfed.org/publications/research/econ_focus/2021/q1/economic_history' },
      { title: 'Beacon Pointe — Investing in the Age of Financial Repression', quote: 'Real assets like gold benefit most during financial repression regimes', url: 'https://beaconpointe.com/investing-in-the-age-of-financial-repression/' },
    ],
    contextLinks: [
      { title: 'CBO Budget Outlook', url: 'https://www.cbo.gov/topics/budget' },
      { title: 'FRED Debt/GDP', url: 'https://fred.stlouisfed.org/series/GFDEGDQ188S' },
      { title: 'US Treasury Fiscal Data', url: 'https://fiscaldata.treasury.gov/' },
    ],
  },

  REAL_FFR: {
    id: 'REAL_FFR',
    name: 'Real Federal Funds Rate',
    fredUrl: 'https://fred.stlouisfed.org/series/DFF',
    provider: 'Federal Reserve / BLS (computed: DFF minus CPI YoY)',
    frequency: 'Daily (DFF) / Monthly (CPI)',
    unit: '%',
    explanation:
      "The real Fed Funds rate is the Federal Reserve's policy rate minus the current inflation rate. When it's negative, the government is actively eroding the purchasing power of cash and debt — savers lose money in real terms, and debtors (including the government) benefit. This is the operational mechanism of financial repression. Gold thrives in negative real rate environments because holding cash is a guaranteed loss. Currently the real FFR is slightly positive, but the structural trajectory — given debt levels and the political impossibility of sustained austerity — points toward lower or negative real rates over the medium term.",
    evidenceSources: [
      { title: 'MintBuilder — How Inflation Affects Gold Prices', quote: 'Negative real rates are the primary mechanism through which gold benefits from monetary policy', url: 'https://mintbuilder.com/blog/how-inflation-affects-gold-prices' },
      { title: 'PIMCO — Understanding Gold Prices', quote: 'Real interest rates are the single most important driver of gold prices', url: 'https://www.pimco.com/us/en/resources/education/understanding-gold-prices' },
      { title: 'Intereconomics — Beware of Financial Repression', quote: 'Financial repression transfers wealth from savers to governments through negative real rates', url: 'https://www.intereconomics.eu/contents/year/2019/number/4/article/beware-of-financial-repression-lessons-from-history.html' },
    ],
    contextLinks: [
      { title: 'CME FedWatch', url: 'https://www.cmegroup.com/markets/interest-rates/cme-fedwatch-tool.html' },
      { title: 'BLS CPI', url: 'https://www.bls.gov/cpi/' },
      { title: 'FOMC Calendar', url: 'https://www.federalreserve.gov/monetarypolicy/fomccalendars.htm' },
    ],
  },

  PHYSICAL_DEMAND: {
    id: 'PHYSICAL_DEMAND',
    name: 'Physical Gold Demand (CB + Bar/Coin)',
    fredUrl: '',
    provider: 'World Gold Council (manual quarterly)',
    frequency: 'Quarterly',
    unit: 'tonnes/qtr',
    explanation:
      'Combined central bank and bar/coin demand. Central bank buying has been the most powerful structural force since 2022 — 1,000+ tonnes annually for three years. Bar/coin demand reflects retail accumulation. Together, they represent the physical floor under gold prices that makes this cycle different from previous ones.',
    evidenceSources: [
      { title: 'J.P. Morgan', quote: '70% of QoQ gold price change explained by CB+investor demand', url: 'https://www.jpmorgan.com/insights/global-research/commodities/gold-prices' },
      { title: 'World Gold Council', quote: 'Central banks bought 1,037t in 2023, 1,045t in 2024', url: 'https://www.gold.org/goldhub/research/gold-demand-trends' },
    ],
    contextLinks: [
      { title: 'WGC Gold Demand Trends', url: 'https://www.gold.org/goldhub/research/gold-demand-trends' },
      { title: 'WGC Central Bank Survey', url: 'https://www.gold.org/goldhub/research/2025-central-bank-gold-reserves-survey' },
      { title: 'PBoC Gold Reserves', url: 'https://tradingeconomics.com/china/gold-reserves' },
    ],
  },

  ETF_FLOWS: {
    id: 'ETF_FLOWS',
    name: 'Gold ETF Net Flows',
    fredUrl: '',
    provider: 'World Gold Council (manual monthly)',
    frequency: 'Monthly',
    unit: '$B/month',
    explanation:
      'Monthly net flows into gold-backed ETFs. The most volatile demand component — reversed from heavy outflows in 2022-2023 to record inflows in 2025. Partially predictable from the real rate trajectory (lower rates → more ETF inflows). For long-term projections, mean-revert toward modest positive baseline (~$2-3B/month).',
    evidenceSources: [
      { title: 'State Street', quote: 'ETF cycle still below 2008-2012 and 2016-2020 totals', url: 'https://www.ssga.com/us/en/intermediary/insights/gold-2026-outlook-can-the-structural-bull-cycle-continue-to-5000' },
      { title: 'WGC', quote: 'Global gold ETFs saw $9.4B inflows in Q3 2024', url: 'https://www.gold.org/goldhub/research/gold-demand-trends' },
    ],
    contextLinks: [
      { title: 'WGC ETF Flows', url: 'https://www.gold.org/goldhub/data/global-gold-backed-etf-holdings-and-flows' },
      { title: 'SPDR Gold Shares', url: 'https://www.spdrgoldshares.com/' },
    ],
  },

  DFII10: {
    id: 'DFII10',
    name: '10Y Real Yield (TIPS)',
    fredUrl: 'https://fred.stlouisfed.org/series/DFII10',
    provider: 'Federal Reserve Bank of St. Louis',
    frequency: 'Daily',
    unit: '%',
    explanation:
      'The 10-year TIPS yield measures the real return on US government bonds. The strongest short-term predictor of gold. When real yields rise, the opportunity cost of holding gold increases. Since 2022, central bank buying has created an independent demand floor, partially decoupling the relationship.',
    evidenceSources: [
      { title: 'Chicago Fed Letter #464', quote: '1pp real rate innovation → -3.4% gold price', url: 'https://www.chicagofed.org/publications/chicago-fed-letter/2021/464' },
      { title: 'LBMA Alchemist Issue 90', quote: 'R²=0.65, 100bp TIPS rise → -$173 gold over 13 weeks', url: 'https://www.lbma.org.uk/alchemist/issue-90/an-update-on-gold-real-interest-rates-and-the-dollar' },
    ],
    contextLinks: [
      { title: 'FOMC Calendar', url: 'https://www.federalreserve.gov/monetarypolicy/fomccalendars.htm' },
      { title: 'TradingEconomics TIPS', url: 'https://tradingeconomics.com/united-states/10-year-tips-yield' },
    ],
    regimeBands: [
      { startDate: '2020-03-01', endDate: '2022-03-01', label: 'Negative real yields (COVID QE)', color: 'bullish' },
      { startDate: '2022-03-01', endDate: '2026-12-31', label: 'Aggressive tightening', color: 'bearish' },
    ],
  },

  DTWEXBGS: {
    id: 'DTWEXBGS',
    name: 'US Dollar (Broad Trade-Weighted)',
    fredUrl: 'https://fred.stlouisfed.org/series/DTWEXBGS',
    provider: 'Federal Reserve Board',
    frequency: 'Daily',
    unit: 'index',
    explanation:
      "Gold is priced globally in USD, creating a mechanical denominator effect. A stronger dollar makes gold more expensive for foreign buyers. The 5-month correlation with gold averages -39%. J.P. Morgan estimates the dollar is ~9% overvalued, suggesting structural weakening ahead.",
    evidenceSources: [
      { title: 'E*TRADE / Morgan Stanley', quote: '5-month gold-DXY correlation >-95% → gold averaged 8% returns', url: 'https://us.etrade.com/knowledge/library/perspectives/daily-insights/gold-dollar-correlation' },
      { title: 'CME Group', quote: 'Since 2022, central bank diversification partially decoupled the gold-dollar inverse', url: 'https://www.cmegroup.com/openmarkets/metals/2025/Gold-and-the-US-Dollar-An-Evolving-Relationship.html' },
    ],
    contextLinks: [
      { title: 'FRED Dollar Data', url: 'https://fred.stlouisfed.org/series/DTWEXBGS' },
      { title: 'FOMC Decisions', url: 'https://www.federalreserve.gov/monetarypolicy/fomccalendars.htm' },
    ],
  },

  T10YIE: {
    id: 'T10YIE',
    name: 'Breakeven Inflation',
    fredUrl: 'https://fred.stlouisfed.org/series/T10YIE',
    provider: 'Federal Reserve Bank of St. Louis',
    frequency: 'Daily',
    unit: '%',
    explanation:
      "The 10-year breakeven is the market's implied inflation expectation. Chicago Fed found a 1pp increase in expected inflation raises real gold price by 37%. Important at turning points: when breakevens start rising from a low base, it catalyses gold rallies.",
    evidenceSources: [
      { title: 'Chicago Fed #464', quote: '1pp expected inflation → +37% real gold price', url: 'https://www.chicagofed.org/publications/chicago-fed-letter/2021/464' },
      { title: 'InvestingHaven', quote: 'TIP ETF trendline leads gold higher', url: 'https://investinghaven.com/forecasts/gold-price-prediction/' },
    ],
    contextLinks: [
      { title: 'Cleveland Fed Inflation Expectations', url: 'https://www.clevelandfed.org/indicators-and-data/inflation-expectations' },
      { title: 'FRED Breakeven', url: 'https://fred.stlouisfed.org/series/T10YIE' },
    ],
  },

  VIXCLS: {
    id: 'VIXCLS',
    name: 'VIX',
    fredUrl: 'https://fred.stlouisfed.org/series/VIXCLS',
    provider: 'CBOE / Federal Reserve',
    frequency: 'Daily',
    unit: 'index',
    explanation:
      "Measures expected S&P 500 volatility. Spikes signal fear and risk-off sentiment. Gold benefits from VIX spikes as investors seek safe havens. The relationship is episodic — gold responds to large VIX jumps but doesn't track small daily moves.",
    evidenceSources: [
      { title: 'FXNX', quote: 'Risk-off: gold and dollar rise, yields and stocks fall', url: 'https://fxnx.com/en/blog/xauusd-correlation-secrets-trading-gold-via-dxy-yields' },
      { title: 'Chicago Fed', quote: '10pp increase in pessimistic expectations raises real gold price by 5%', url: 'https://www.chicagofed.org/publications/chicago-fed-letter/2021/464' },
    ],
    contextLinks: [
      { title: 'CBOE VIX', url: 'https://www.cboe.com/tradable_products/vix/' },
      { title: 'TradingEconomics VIX', url: 'https://tradingeconomics.com/united-states/volatility-index' },
    ],
  },

  DCOILBRENTEU: {
    id: 'DCOILBRENTEU',
    name: 'Brent Crude Oil',
    fredUrl: 'https://fred.stlouisfed.org/series/DCOILBRENTEU',
    provider: 'US EIA / Federal Reserve',
    frequency: 'Daily',
    unit: '$/bbl',
    explanation:
      "Oil affects gold via inflation (spikes feed CPI/PPI) and geopolitics (crises drive safe-haven demand). Currently Brent at ~$100/bbl supports gold through both channels, but very high oil can be temporarily bearish if it forces the Fed to stay hawkish. A background variable in the model — its 4% weight is marginal.",
    evidenceSources: [
      { title: 'USAGOLD', quote: "PPI inflation surge hits BEFORE Iran war's energy shock flows through data", url: 'https://www.usagold.com/daily-gold-price-history/' },
    ],
    contextLinks: [
      { title: 'EIA Outlook', url: 'https://www.eia.gov/outlooks/steo/' },
      { title: 'OPEC Monthly Report', url: 'https://www.opec.org/opec_web/en/publications/338.htm' },
    ],
  },

  GDX_GOLD_RATIO: {
    id: 'GDX_GOLD_RATIO',
    name: 'GDX / Gold Ratio',
    fredUrl: '',
    provider: 'GDX price from miner_prices table / gold spot',
    frequency: 'Daily (manually updated)',
    unit: 'ratio',
    explanation:
      "The GDX/Gold ratio measures whether gold mining equities are cheap or expensive relative to the commodity they produce. When the ratio is low, it means the market hasn't yet translated gold's strength into miner valuations — representing catch-up potential. Miners have historically traded at a significant discount to gold in recent years, with senior producers at 0.5-0.7x NAV versus historical norms of 1.5-3.0x. This discount reflects market skepticism, cost inflation fears, and ESG concerns. However, with record margins (AISC ~$1,600 vs gold ~$4,300), improved capital discipline, and a technical breakout in the HUI/Gold ratio in September 2025, the conditions for a multi-year re-rating are in place.",
    evidenceSources: [
      { title: 'Investing.com — Gold: HUI Ratio Signals Regime Shift', quote: 'HUI/Gold ratio breakout signals miners stepping out of bullion\'s shadow', url: 'https://www.investing.com/analysis/gold-hui-ratio-signals-regime-shift-as-miners-step-out-of-bullions-shadow-200667943' },
      { title: 'Sprott — Gold Miners Shine in 2025', quote: 'Record margins and improved capital discipline drive miner re-rating', url: 'https://sprott.com/insights/gold-miners-shine-in-2025/' },
      { title: 'VanEck — Gold in 2025: A New Era', quote: 'Structural strength and enduring appeal support gold miners', url: 'https://www.vaneck.com/us/en/blogs/gold-investing/gold-in-2025-a-new-era-of-structural-strength-and-enduring-appeal/' },
      { title: 'AInvest — Gold Miners Underperformance: Valuation Misalignment', quote: 'Valuation misalignment creates opportunity as sector momentum shifts', url: 'https://www.ainvest.com/news/gold-miners-underperformance-valuation-misalignment-sector-momentum-shifts-2510/' },
    ],
    contextLinks: [
      { title: 'VanEck GDX Fund', url: 'https://www.vaneck.com/us/en/investments/gold-miners-etf-gdx/' },
      { title: 'Yahoo Finance GDX', url: 'https://finance.yahoo.com/quote/GDX/' },
      { title: 'Blackrock World Gold Fund', url: 'https://www.blackrock.com/' },
    ],
  },
};
