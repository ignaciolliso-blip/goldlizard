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
  DFII10: {
    id: 'DFII10',
    name: '10Y Real Yield (TIPS)',
    fredUrl: 'https://fred.stlouisfed.org/series/DFII10',
    provider: 'Federal Reserve Bank of St. Louis',
    frequency: 'Daily',
    unit: '%',
    explanation:
      'The 10-year TIPS yield measures the real (inflation-adjusted) return investors earn on US government bonds. It is the single strongest empirical predictor of gold prices. When real yields rise, the opportunity cost of holding non-yielding gold increases, making bonds more attractive. When real yields fall or go negative, gold becomes the preferred store of value. Since 2022, this relationship has weakened as central bank buying created an independent demand floor, but real yields remain the dominant short-to-medium-term driver.',
    evidenceSources: [
      {
        title: 'Chicago Fed Letter #464',
        quote: '1pp real rate innovation → -3.4% gold price',
        url: 'https://www.chicagofed.org/publications/chicago-fed-letter/2021/464',
      },
      {
        title: 'LBMA Alchemist Issue 90',
        quote: 'R²=0.65, 100bp TIPS rise → -$173 gold over 13 weeks',
        url: 'https://www.lbma.org.uk/alchemist/issue-90/an-update-on-gold-real-interest-rates-and-the-dollar',
      },
      {
        title: 'J.P. Morgan Private Bank',
        quote: 'Post-2022 asymmetric: gold rises when yields drop but declines less when yields rise',
        url: 'https://privatebank.jpmorgan.com/eur/en/insights/markets-and-investing/is-it-a-golden-era-for-gold',
      },
      {
        title: 'NBER Working Paper (Jermann)',
        quote: 'Model driven by 10Y yields captures gold movements from 2007 onward',
        url: 'https://www.nber.org/system/files/working_papers/w31386/w31386.pdf',
      },
    ],
    contextLinks: [
      { title: 'FOMC Calendar', url: 'https://www.federalreserve.gov/monetarypolicy/fomccalendars.htm' },
      { title: 'TradingEconomics TIPS Yield', url: 'https://tradingeconomics.com/united-states/10-year-tips-yield' },
      { title: 'BLS CPI Release Schedule', url: 'https://www.bls.gov/schedule/news_release/cpi.htm' },
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
      "Gold is priced globally in US dollars, creating a mechanical denominator effect: when the dollar strengthens, it takes fewer dollars to buy gold. Beyond mechanics, a stronger dollar signals tighter monetary conditions and reduces foreign demand. The 5-month correlation between DXY and gold has averaged -39%, but during extreme periods exceeds -95%, when gold returns average 8% vs 3% normally.",
    evidenceSources: [
      {
        title: 'E*TRADE / Morgan Stanley',
        quote: '5-month gold-DXY correlation >-95% → gold averaged 8% returns',
        url: 'https://us.etrade.com/knowledge/library/perspectives/daily-insights/gold-dollar-correlation',
      },
      {
        title: 'CME Group',
        quote: 'Since 2022, central bank diversification partially decoupled the gold-dollar inverse',
        url: 'https://www.cmegroup.com/openmarkets/metals/2025/Gold-and-the-US-Dollar-An-Evolving-Relationship.html',
      },
      {
        title: 'LBMA Alchemist',
        quote: '1 point DXY rise → -$10.05 gold over 13 weeks',
        url: 'https://www.lbma.org.uk/alchemist/issue-90/an-update-on-gold-real-interest-rates-and-the-dollar',
      },
    ],
    contextLinks: [
      { title: 'FRED Dollar Data', url: 'https://fred.stlouisfed.org/series/DTWEXBGS' },
      { title: 'TradingEconomics USD', url: 'https://tradingeconomics.com/united-states/currency' },
      { title: 'FOMC Decisions', url: 'https://www.federalreserve.gov/monetarypolicy/fomccalendars.htm' },
    ],
  },

  central_bank_gold: {
    id: 'central_bank_gold',
    name: 'Central Bank Net Gold Purchases',
    fredUrl: '',
    provider: 'World Gold Council (manual quarterly)',
    frequency: 'Quarterly',
    unit: 'tonnes/qtr',
    explanation:
      "Central bank gold accumulation has become the most powerful structural force in the gold market since 2022. Emerging market central banks — China, India, Poland — have been buying at unprecedented pace to diversify from US dollar assets. This buying (1,000+ tonnes annually for three years) has offset the traditional headwind from rising real yields. Unlike investor flows, central bank purchases are structural and strategic — they don't reverse on short-term price moves.",
    evidenceSources: [
      {
        title: 'J.P. Morgan',
        quote: '70% of QoQ gold price change explained by CB+investor demand. 350t+ quarterly needed for rise; each 100t above ≈ +2% QoQ',
        url: 'https://www.jpmorgan.com/insights/global-research/commodities/gold-prices',
      },
      {
        title: 'World Gold Council',
        quote: 'Fiscal stress statistically significant alongside DXY and yields',
        url: 'https://www.gold.org/goldhub/gold-focus/2025/06/you-asked-we-answered-are-fiscal-concerns-driving-gold',
      },
      {
        title: 'State Street',
        quote: 'ETF cycle still below 2008-2012 and 2016-2020 totals',
        url: 'https://www.ssga.com/us/en/intermediary/insights/gold-2026-outlook-can-the-structural-bull-cycle-continue-to-5000',
      },
    ],
    contextLinks: [
      { title: 'WGC Gold Demand Trends', url: 'https://www.gold.org/goldhub/research/gold-demand-trends' },
      { title: 'PBoC Gold Reserves', url: 'https://tradingeconomics.com/china/gold-reserves' },
      { title: 'WGC Central Bank Survey', url: 'https://www.gold.org/goldhub/research/2025-central-bank-gold-reserves-survey' },
    ],
  },

  T10Y2Y: {
    id: 'T10Y2Y',
    name: 'US Fiscal Stress (10Y-2Y Spread)',
    fredUrl: 'https://fred.stlouisfed.org/series/T10Y2Y',
    provider: 'Federal Reserve Bank of St. Louis',
    frequency: 'Daily',
    unit: '%',
    explanation:
      'The yield curve spread between 10-year and 2-year Treasuries is a recession and fiscal stress indicator. A flat or inverted curve signals slowdown expectations, which is gold-supportive as the Fed eventually eases. The WGC found fiscal stress measures statistically significant in explaining gold. With US debt-to-GDP above 120%, fiscal stress is a structural tailwind for gold.',
    evidenceSources: [
      {
        title: 'World Gold Council',
        quote: 'Fiscal stress statistically significant alongside DXY and yields in regression',
        url: 'https://www.gold.org/goldhub/gold-focus/2025/06/you-asked-we-answered-are-fiscal-concerns-driving-gold',
      },
      {
        title: 'State Street',
        quote: 'Rising deficits → more Treasury issuance → higher term premium → may force deeper Fed cuts → bullish gold',
        url: 'https://www.ssga.com/us/en/intermediary/insights/gold-2026-outlook-can-the-structural-bull-cycle-continue-to-5000',
      },
    ],
    contextLinks: [
      { title: 'US Treasury Yield Curve', url: 'https://www.ustreasuryyieldcurve.com/' },
      { title: 'CBO Budget Outlook', url: 'https://www.cbo.gov/topics/budget' },
      { title: 'TradingEconomics US Debt', url: 'https://tradingeconomics.com/united-states/government-debt-to-gdp' },
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
      "The VIX measures expected S&P 500 volatility. Spikes signal fear and risk-off sentiment. Gold benefits from VIX spikes as investors seek safe havens. The relationship is episodic — gold responds to large VIX jumps but doesn't track small daily moves. In extreme events (March 2020), even gold sells off initially before recovering.",
    evidenceSources: [
      {
        title: 'FXNX',
        quote: 'Risk-off: gold and dollar rise, yields and stocks fall. Hidden accumulation when gold holds despite rising yields+DXY',
        url: 'https://fxnx.com/en/blog/xauusd-correlation-secrets-trading-gold-via-dxy-yields',
      },
      {
        title: 'Chicago Fed',
        quote: '10pp increase in pessimistic expectations raises real gold price by 5%',
        url: 'https://www.chicagofed.org/publications/chicago-fed-letter/2021/464',
      },
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
      "Oil affects gold via two channels. Inflation channel: spikes feed CPI/PPI, raising gold's inflation-hedge appeal. Geopolitical channel: spikes coincide with crises driving safe-haven demand. Currently Brent at ~$100/bbl from the Iran war does both. However, very high oil can be temporarily bearish if it forces the Fed to stay hawkish.",
    evidenceSources: [
      {
        title: 'USAGOLD (March 2026)',
        quote: "PPI inflation surge hits BEFORE Iran war's energy shock flows through data — oil surged 70%+ YTD",
        url: 'https://www.usagold.com/daily-gold-price-history/',
      },
      {
        title: 'ScienceDirect',
        quote: 'CPI YoY >4% nearly doubles the negative correlation between real rates and gold',
        url: 'https://www.sciencedirect.com/science/article/abs/pii/S0957417425032099',
      },
    ],
    contextLinks: [
      { title: 'EIA Outlook', url: 'https://www.eia.gov/outlooks/steo/' },
      { title: 'TradingEconomics Brent', url: 'https://tradingeconomics.com/commodity/brent-crude-oil' },
      { title: 'OPEC Monthly Report', url: 'https://www.opec.org/opec_web/en/publications/338.htm' },
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
      "The 10-year breakeven is the market's implied inflation expectation. When it rises, bond participants expect higher inflation ahead. Chicago Fed found a 1pp increase in expected inflation raises real gold price by 37%. Particularly important at turning points: when breakevens start rising from a low base, it catalyses gold rallies.",
    evidenceSources: [
      {
        title: 'Chicago Fed #464',
        quote: '1pp expected inflation → +37% real gold price',
        url: 'https://www.chicagofed.org/publications/chicago-fed-letter/2021/464',
      },
      {
        title: 'InvestingHaven',
        quote: 'TIP ETF trendline leads gold higher',
        url: 'https://investinghaven.com/forecasts/gold-price-prediction/',
      },
    ],
    contextLinks: [
      { title: 'Cleveland Fed Inflation Expectations', url: 'https://www.clevelandfed.org/indicators-and-data/inflation-expectations' },
      { title: 'FRED Breakeven', url: 'https://fred.stlouisfed.org/series/T10YIE' },
      { title: 'UMich Consumer Sentiment', url: 'https://www.sca.isr.umich.edu/' },
    ],
  },

  DFF: {
    id: 'DFF',
    name: 'Fed Funds Rate',
    fredUrl: 'https://fred.stlouisfed.org/series/DFF',
    provider: 'Federal Reserve Board',
    frequency: 'Daily',
    unit: '%',
    explanation:
      "The Fed Funds Rate sets the baseline opportunity cost of holding gold. Rate cuts reduce yields, making gold more attractive and weakening the dollar. The direction matters more than the level: a cutting Fed is more bullish than a holding Fed at the same rate. Current 3.50-3.75% with 1 cut expected is a 'higher for longer' headwind.",
    evidenceSources: [
      {
        title: 'J.P. Morgan Private Bank',
        quote: 'ETF demand inversely correlated with cash rates; rate cuts → reallocation into gold',
        url: 'https://privatebank.jpmorgan.com/eur/en/insights/markets-and-investing/is-it-a-golden-era-for-gold',
      },
      {
        title: 'State Street',
        quote: 'Fed shift from QT to supportive stance marks inflection. Rate cuts support gold by lowering opportunity cost',
        url: 'https://www.ssga.com/us/en/intermediary/insights/gold-2026-outlook-can-the-structural-bull-cycle-continue-to-5000',
      },
      {
        title: 'CNBC (March 2026)',
        quote: 'Fed holds 3.50-3.75%, dot plot signals 1 cut, inflation forecast revised up to 2.7% PCE',
        url: 'https://www.cnbc.com/2026/03/18/fed-interest-rate-decision-march-2026.html',
      },
    ],
    contextLinks: [
      { title: 'CME FedWatch', url: 'https://www.cmegroup.com/markets/interest-rates/cme-fedwatch-tool.html' },
      { title: 'FOMC Calendar', url: 'https://www.federalreserve.gov/monetarypolicy/fomccalendars.htm' },
      { title: 'Fed Dot Plot', url: 'https://fred.stlouisfed.org/series/FEDTARMD' },
    ],
  },
};
