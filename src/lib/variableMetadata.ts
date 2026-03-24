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
  WM2NS_DEV: {
    id: 'WM2NS_DEV',
    name: 'M2 Cumulative Deviation from Trend',
    fredUrl: 'https://fred.stlouisfed.org/series/WM2NS',
    provider: 'Federal Reserve Board',
    frequency: 'Weekly → Monthly',
    unit: '%',
    explanation:
      'Measures how far M2 money supply has deviated from its 20-year exponential trend. After the 2020-2021 surge, M2 remains well above pre-COVID trend despite the 2022-2023 contraction. The cumulative excess from money creation eventually flows into asset prices including gold. The level matters more than the growth rate — even when M2 growth turned negative, the accumulated deviation stayed elevated.',
    evidenceSources: [
      { title: 'St. Louis Fed', quote: 'M2 grew 40% in 2020-2021, unprecedented peacetime expansion', url: 'https://fred.stlouisfed.org/series/WM2NS' },
      { title: 'Bridgewater Associates', quote: 'Monetary debasement is the primary driver of gold over centuries', url: 'https://www.bridgewater.com/' },
    ],
    contextLinks: [
      { title: 'FRED M2 Data', url: 'https://fred.stlouisfed.org/series/WM2NS' },
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
      'The ratio of total public debt to GDP. Higher debt/GDP creates incentive for financial repression (keeping real rates below growth rates to erode debt). This is structurally one-directional — debt only increases in current political regime. CBO projects 120% rising to 140%+ by 2031. This persistent fiscal deterioration is a fundamental reason gold is repricing as a monetary asset.',
    evidenceSources: [
      { title: 'World Gold Council', quote: 'Fiscal stress statistically significant alongside DXY and yields', url: 'https://www.gold.org/goldhub/gold-focus/2025/06/you-asked-we-answered-are-fiscal-concerns-driving-gold' },
      { title: 'CBO Budget Outlook', quote: 'Debt/GDP projected to reach 140%+ by 2031', url: 'https://www.cbo.gov/topics/budget' },
    ],
    contextLinks: [
      { title: 'CBO Budget Outlook', url: 'https://www.cbo.gov/topics/budget' },
      { title: 'US Debt Clock', url: 'https://www.usdebtclock.org/' },
      { title: 'TradingEconomics', url: 'https://tradingeconomics.com/united-states/government-debt-to-gdp' },
    ],
  },

  REAL_FFR: {
    id: 'REAL_FFR',
    name: 'Real Fed Funds Rate',
    fredUrl: 'https://fred.stlouisfed.org/series/DFF',
    provider: 'Federal Reserve / BLS (computed)',
    frequency: 'Daily (DFF) / Monthly (CPI)',
    unit: '%',
    explanation:
      'The effective Fed Funds Rate minus CPI YoY inflation. When negative, the government is actively eroding the real value of its debt — the operational mechanism of financial repression. Distinct from the 10Y TIPS yield (market real rate expectation); this measures the policy real rate. They can diverge significantly.',
    evidenceSources: [
      { title: 'J.P. Morgan Private Bank', quote: 'ETF demand inversely correlated with cash rates; rate cuts → reallocation into gold', url: 'https://privatebank.jpmorgan.com/eur/en/insights/markets-and-investing/is-it-a-golden-era-for-gold' },
      { title: 'State Street', quote: 'Fed shift from QT to supportive stance marks inflection', url: 'https://www.ssga.com/us/en/intermediary/insights/gold-2026-outlook-can-the-structural-bull-cycle-continue-to-5000' },
    ],
    contextLinks: [
      { title: 'CME FedWatch', url: 'https://www.cmegroup.com/markets/interest-rates/cme-fedwatch-tool.html' },
      { title: 'BLS CPI Release', url: 'https://www.bls.gov/schedule/news_release/cpi.htm' },
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
      'Gold is priced globally in USD, creating a mechanical denominator effect. A stronger dollar makes gold more expensive for foreign buyers. The 5-month correlation with gold averages -39%. J.P. Morgan estimates the dollar is ~9% overvalued, suggesting structural weakening ahead.',
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
};
