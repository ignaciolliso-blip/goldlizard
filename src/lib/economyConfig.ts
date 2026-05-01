export type EconomyRegion = 'global' | 'us' | 'europe' | 'spain';

export const REGION_LABELS: Record<EconomyRegion, string> = {
  global: 'Global',
  us: 'United States',
  europe: 'Europe (Euro Area)',
  spain: 'Spain',
};

export const REGION_ORDER: EconomyRegion[] = ['global', 'us', 'europe', 'spain'];

export interface IndicatorDefinition {
  id: string;
  label: string;
  description: string;
  unit: string;
  chartType: 'line' | 'stacked_area';
  notes?: string;
  sourceLabel: Record<EconomyRegion, string>;
  sourceUrl: Record<EconomyRegion, string>;
  /** Optional per-region card title override (e.g. "Fed Funds Rate — United States") */
  cardTitle?: Partial<Record<EconomyRegion, string>>;
  /** Optional per-region empty-state explanation (used when sourceLabel === 'N/A') */
  emptyStateNote?: Partial<Record<EconomyRegion, string>>;
  /** Optional per-region footnote shown beneath the chart */
  regionNote?: Partial<Record<EconomyRegion, string>>;
}

const IMF_WEO = 'https://www.imf.org/en/Publications/WEO';
const ECB_API = 'https://data-api.ecb.europa.eu';
const WORLD_BANK = 'https://data.worldbank.org';

const EUROPE_FOOTNOTE =
  'Data represents the Euro Area (ECB/IMF definition). Where Euro Area data is unavailable, Germany is used as proxy.';

export const INDICATOR_DEFINITIONS: IndicatorDefinition[] = [
  {
    id: 'gdp_absolute',
    label: 'GDP (Absolute)',
    description: 'Nominal Gross Domestic Product in current US dollars.',
    unit: 'USD Trillions',
    chartType: 'line',
    sourceLabel: { global: 'IMF WEO', us: 'FRED / BEA', europe: 'IMF WEO (Euro Area)', spain: 'IMF WEO' },
    sourceUrl: {
      global: IMF_WEO,
      us: 'https://fred.stlouisfed.org/series/GDP',
      europe: IMF_WEO,
      spain: IMF_WEO,
    },
    regionNote: { europe: EUROPE_FOOTNOTE },
  },
  {
    id: 'debt_absolute',
    label: 'Government Debt (Absolute)',
    description: 'Total general government gross debt outstanding.',
    unit: 'USD Trillions',
    chartType: 'line',
    notes: 'Global / Europe / Spain derived from IMF debt-to-GDP × nominal GDP. US is direct from FRED.',
    sourceLabel: { global: 'IMF WEO (derived)', us: 'FRED', europe: 'IMF WEO (derived, Euro Area)', spain: 'IMF WEO (derived)' },
    sourceUrl: {
      global: IMF_WEO,
      us: 'https://fred.stlouisfed.org/series/GFDEBTNQ',
      europe: IMF_WEO,
      spain: IMF_WEO,
    },
    regionNote: { europe: EUROPE_FOOTNOTE },
  },
  {
    id: 'debt_pct_gdp',
    label: 'Debt-to-GDP',
    description: 'Government gross debt as a percentage of GDP.',
    unit: '% of GDP',
    chartType: 'line',
    sourceLabel: { global: 'IMF WEO', us: 'FRED', europe: 'IMF WEO (Euro Area)', spain: 'IMF WEO' },
    sourceUrl: {
      global: IMF_WEO,
      us: 'https://fred.stlouisfed.org/series/GFDEGDQ188S',
      europe: IMF_WEO,
      spain: IMF_WEO,
    },
    regionNote: { europe: EUROPE_FOOTNOTE },
  },
  {
    id: 'gdp_per_capita',
    label: 'GDP per Capita',
    description: 'Nominal GDP divided by total population.',
    unit: 'USD',
    chartType: 'line',
    sourceLabel: { global: 'IMF WEO', us: 'FRED / BEA', europe: 'IMF WEO (Euro Area)', spain: 'IMF WEO' },
    sourceUrl: {
      global: IMF_WEO,
      us: 'https://fred.stlouisfed.org/series/A939RX0Q048SBEA',
      europe: IMF_WEO,
      spain: IMF_WEO,
    },
    regionNote: { europe: EUROPE_FOOTNOTE },
  },
  {
    id: 'population_age',
    label: 'Population by Age Group',
    description: 'Demographic breakdown by broad age cohorts (0-14, 15-64, 65+).',
    unit: 'People',
    chartType: 'stacked_area',
    notes: 'World Bank annual data. Three buckets shown (0-14, 15-64, 65+). Finer age splits are not available from free public APIs at this granularity.',
    sourceLabel: {
      global: 'World Bank',
      us: 'World Bank',
      europe: 'World Bank (Euro Area)',
      spain: 'World Bank',
    },
    sourceUrl: {
      global: WORLD_BANK,
      us: WORLD_BANK,
      europe: WORLD_BANK,
      spain: WORLD_BANK,
    },
    regionNote: { europe: EUROPE_FOOTNOTE },
  },
  {
    id: 'unemployment_youth',
    label: 'Youth Unemployment Rate',
    description: 'Unemployment rate for ages 15–24.',
    unit: '%',
    chartType: 'line',
    sourceLabel: {
      global: 'World Bank / ILO',
      us: 'FRED / BLS',
      europe: 'World Bank (Euro Area)',
      spain: 'World Bank',
    },
    sourceUrl: {
      global: 'https://data.worldbank.org/indicator/SL.UEM.1524.ZS',
      us: 'https://fred.stlouisfed.org/series/LNU04024887',
      europe: 'https://data.worldbank.org/indicator/SL.UEM.1524.ZS',
      spain: 'https://data.worldbank.org/indicator/SL.UEM.1524.ZS',
    },
    regionNote: { europe: EUROPE_FOOTNOTE },
  },
  {
    id: 'unemployment_total',
    label: 'Unemployment Rate (Total)',
    description: 'Total unemployment rate, civilian labor force.',
    unit: '%',
    chartType: 'line',
    sourceLabel: {
      global: 'World Bank / ILO',
      us: 'FRED / BLS',
      europe: 'ECB SDW (Euro Area)',
      spain: 'OECD via FRED',
    },
    sourceUrl: {
      global: 'https://data.worldbank.org/indicator/SL.UEM.TOTL.ZS',
      us: 'https://fred.stlouisfed.org/series/UNRATE',
      europe: ECB_API,
      spain: 'https://fred.stlouisfed.org/series/LRHUTTTTESM156S',
    },
    regionNote: { europe: EUROPE_FOOTNOTE },
  },
  {
    id: 'cpi_yoy',
    label: 'CPI Inflation (YoY)',
    description: 'Year-on-year change in consumer prices.',
    unit: '%',
    chartType: 'line',
    sourceLabel: {
      global: 'IMF WEO',
      us: 'FRED / BLS',
      europe: 'ECB SDW (Euro Area)',
      spain: 'IMF WEO / INE',
    },
    sourceUrl: {
      global: IMF_WEO,
      us: 'https://fred.stlouisfed.org/series/CPIAUCSL',
      europe: ECB_API,
      spain: IMF_WEO,
    },
    regionNote: { europe: EUROPE_FOOTNOTE },
  },
  {
    id: 'policy_rate',
    label: 'Policy Interest Rate',
    description: 'Central bank policy rate.',
    unit: '%',
    chartType: 'line',
    sourceLabel: {
      global: 'N/A',
      us: 'FRED / Fed',
      europe: 'ECB',
      spain: 'ECB (Spain uses ECB rate)',
    },
    sourceUrl: {
      global: '',
      us: 'https://fred.stlouisfed.org/series/DFF',
      europe: ECB_API,
      spain: ECB_API,
    },
    cardTitle: {
      us: 'Fed Funds Rate — United States',
      europe: 'ECB Main Refinancing Rate — Euro Area',
      spain: 'ECB Rate — Spain (Eurozone)',
    },
    emptyStateNote: {
      global: 'No single global rate. See US (Fed) and Europe (ECB) below.',
    },
    regionNote: {
      europe: EUROPE_FOOTNOTE,
      spain: 'Spain is a Eurozone member. The ECB rate applies.',
    },
  },
  {
    id: 'm2_absolute',
    label: 'M2 Money Supply (Absolute)',
    description: 'Broad money supply aggregate.',
    unit: 'Trillions',
    chartType: 'line',
    sourceLabel: {
      global: 'N/A',
      us: 'FRED / Fed (USD)',
      europe: 'ECB SDW (EUR, Euro Area)',
      spain: 'FRED (EUR)',
    },
    sourceUrl: {
      global: '',
      us: 'https://fred.stlouisfed.org/series/WM2NS',
      europe: ECB_API,
      spain: 'https://fred.stlouisfed.org/series/MYAGM2ESM189N',
    },
    emptyStateNote: {
      global: 'No single global M2 aggregate exists. Showing US Fed and ECB Euro Area.',
    },
    regionNote: {
      europe: EUROPE_FOOTNOTE,
      spain: 'Denominated in EUR. Eurozone-wide M2 shown in Europe column.',
    },
  },
  {
    id: 'm2_yoy',
    label: 'M2 Money Supply (YoY %)',
    description: 'Year-on-year growth rate of broad money supply.',
    unit: '%',
    chartType: 'line',
    notes: 'Derived as year-on-year % change from M2 absolute values.',
    sourceLabel: {
      global: 'N/A',
      us: 'FRED (derived)',
      europe: 'ECB SDW (derived)',
      spain: 'ECB (derived)',
    },
    sourceUrl: {
      global: '',
      us: 'https://fred.stlouisfed.org/series/WM2NS',
      europe: ECB_API,
      spain: ECB_API,
    },
    emptyStateNote: {
      global: 'No single global M2 aggregate exists.',
    },
    regionNote: { europe: EUROPE_FOOTNOTE },
  },
  {
    id: 'bond_yield_10y',
    label: '10Y Government Bond Yield',
    description: '10-year benchmark government bond yield.',
    unit: '%',
    chartType: 'line',
    sourceLabel: {
      global: 'N/A',
      us: 'FRED',
      europe: 'FRED (German Bund)',
      spain: 'FRED (Spanish Bono)',
    },
    sourceUrl: {
      global: '',
      us: 'https://fred.stlouisfed.org/series/DGS10',
      europe: 'https://fred.stlouisfed.org/series/IRLTLT01DEM156N',
      spain: 'https://fred.stlouisfed.org/series/IRLTLT01ESM156N',
    },
    emptyStateNote: {
      global: 'Sovereign bond yields are country-specific. See US Treasuries and German Bund columns.',
    },
    regionNote: { europe: EUROPE_FOOTNOTE },
  },
  {
    id: 'yield_curve',
    label: 'Yield Curve (10Y–2Y Spread)',
    description: 'Spread between long and short-term sovereign yields.',
    unit: '%',
    chartType: 'line',
    sourceLabel: {
      global: 'N/A',
      us: 'FRED (10Y–2Y)',
      europe: 'FRED (Bund 10Y–3M)',
      spain: 'FRED (Bono–Bund spread)',
    },
    sourceUrl: {
      global: '',
      us: 'https://fred.stlouisfed.org/series/T10Y2Y',
      europe: 'https://fred.stlouisfed.org/series/IRLTLT01DEM156N',
      spain: 'https://fred.stlouisfed.org/series/IRLTLT01ESM156N',
    },
    cardTitle: {
      spain: 'Spain Sovereign Spread vs Bund',
    },
    emptyStateNote: {
      global: 'Yield curves are country-specific.',
    },
    regionNote: {
      europe: EUROPE_FOOTNOTE,
      spain: 'Sovereign risk premium (10Y Bono − 10Y Bund), not a true yield curve.',
    },
  },
];
