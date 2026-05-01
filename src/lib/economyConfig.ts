export type EconomyRegion = 'global' | 'us' | 'europe' | 'spain';

export const REGION_LABELS: Record<EconomyRegion, string> = {
  global: 'Global',
  us: 'United States',
  europe: 'Europe',
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
}

const IMF_WEO = 'https://www.imf.org/en/Publications/WEO';
const ECB_API = 'https://data-api.ecb.europa.eu';

export const INDICATOR_DEFINITIONS: IndicatorDefinition[] = [
  {
    id: 'gdp_absolute',
    label: 'GDP (Absolute)',
    description: 'Nominal Gross Domestic Product in current US dollars.',
    unit: 'USD Trillions',
    chartType: 'line',
    sourceLabel: { global: 'IMF WEO', us: 'FRED / BEA', europe: 'IMF WEO', spain: 'IMF WEO' },
    sourceUrl: {
      global: IMF_WEO,
      us: 'https://fred.stlouisfed.org/series/GDP',
      europe: IMF_WEO,
      spain: IMF_WEO,
    },
  },
  {
    id: 'debt_absolute',
    label: 'Government Debt (Absolute)',
    description: 'Total general government gross debt outstanding.',
    unit: 'USD Trillions',
    chartType: 'line',
    sourceLabel: { global: 'IMF WEO', us: 'FRED', europe: 'IMF WEO', spain: 'IMF WEO' },
    sourceUrl: {
      global: IMF_WEO,
      us: 'https://fred.stlouisfed.org/series/GFDEBTNQ',
      europe: IMF_WEO,
      spain: IMF_WEO,
    },
  },
  {
    id: 'debt_pct_gdp',
    label: 'Debt-to-GDP',
    description: 'Government gross debt as a percentage of GDP.',
    unit: '% of GDP',
    chartType: 'line',
    sourceLabel: { global: 'IMF WEO', us: 'FRED', europe: 'IMF WEO', spain: 'IMF WEO' },
    sourceUrl: {
      global: IMF_WEO,
      us: 'https://fred.stlouisfed.org/series/GFDEGDQ188S',
      europe: IMF_WEO,
      spain: IMF_WEO,
    },
  },
  {
    id: 'gdp_per_capita',
    label: 'GDP per Capita',
    description: 'Nominal GDP divided by total population.',
    unit: 'USD',
    chartType: 'line',
    sourceLabel: { global: 'IMF WEO', us: 'FRED / BEA', europe: 'IMF WEO', spain: 'IMF WEO' },
    sourceUrl: {
      global: IMF_WEO,
      us: 'https://fred.stlouisfed.org/series/A939RX0Q048SBEA',
      europe: IMF_WEO,
      spain: IMF_WEO,
    },
  },
  {
    id: 'population_age',
    label: 'Population by Age Group',
    description: 'Demographic breakdown by broad age cohorts.',
    unit: 'People',
    chartType: 'stacked_area',
    sourceLabel: {
      global: 'UN Pop. Division',
      us: 'UN Pop. Division',
      europe: 'UN Pop. Division',
      spain: 'UN Pop. Division',
    },
    sourceUrl: {
      global: 'https://population.un.org/wpp/',
      us: 'https://population.un.org/wpp/',
      europe: 'https://population.un.org/wpp/',
      spain: 'https://population.un.org/wpp/',
    },
  },
  {
    id: 'unemployment_youth',
    label: 'Youth Unemployment Rate',
    description: 'Unemployment rate for ages 15–24.',
    unit: '%',
    chartType: 'line',
    sourceLabel: {
      global: 'ILO / World Bank',
      us: 'FRED / BLS',
      europe: 'ECB SDW',
      spain: 'FRED / OECD',
    },
    sourceUrl: {
      global: 'https://data.worldbank.org/indicator/SL.UEM.1524.ZS',
      us: 'https://fred.stlouisfed.org/series/LNU04024887',
      europe: ECB_API,
      spain: 'https://fred.stlouisfed.org/series/LRUN24TTESM156S',
    },
  },
  {
    id: 'unemployment_total',
    label: 'Unemployment Rate (Total)',
    description: 'Total unemployment rate, civilian labor force.',
    unit: '%',
    chartType: 'line',
    sourceLabel: {
      global: 'ILO / World Bank',
      us: 'FRED / BLS',
      europe: 'ECB SDW',
      spain: 'FRED / OECD',
    },
    sourceUrl: {
      global: 'https://data.worldbank.org/indicator/SL.UEM.TOTL.ZS',
      us: 'https://fred.stlouisfed.org/series/UNRATE',
      europe: ECB_API,
      spain: 'https://fred.stlouisfed.org/series/LRHUTTTTESM156S',
    },
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
      europe: 'ECB SDW',
      spain: 'IMF WEO / INE',
    },
    sourceUrl: {
      global: IMF_WEO,
      us: 'https://fred.stlouisfed.org/series/CPIAUCSL',
      europe: ECB_API,
      spain: IMF_WEO,
    },
  },
  {
    id: 'policy_rate',
    label: 'Policy Interest Rate',
    description: 'Central bank policy rate.',
    unit: '%',
    chartType: 'line',
    notes:
      'No single global policy rate exists. Spain is a Eurozone member and uses the ECB rate.',
    sourceLabel: {
      global: 'N/A',
      us: 'FRED / Fed',
      europe: 'ECB SDW',
      spain: 'ECB (Spain uses ECB rate)',
    },
    sourceUrl: {
      global: '',
      us: 'https://fred.stlouisfed.org/series/DFF',
      europe: ECB_API,
      spain: ECB_API,
    },
  },
  {
    id: 'm2_absolute',
    label: 'M2 Money Supply (Absolute)',
    description: 'Broad money supply aggregate.',
    unit: 'USD Trillions',
    chartType: 'line',
    sourceLabel: {
      global: 'N/A',
      us: 'FRED / Fed',
      europe: 'ECB SDW',
      spain: 'Banco de España / ECB',
    },
    sourceUrl: {
      global: '',
      us: 'https://fred.stlouisfed.org/series/WM2NS',
      europe: ECB_API,
      spain: ECB_API,
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
  },
  {
    id: 'yield_curve',
    label: 'Yield Curve (10Y–2Y Spread)',
    description: 'Spread between long and short-term sovereign yields.',
    unit: 'bps',
    chartType: 'line',
    notes:
      'US: 10Y–2Y Treasury spread. Europe: 10Y–3M Bund spread. Spain: 10Y Bono minus 10Y Bund (sovereign risk premium, not a true yield curve).',
    sourceLabel: {
      global: 'N/A',
      us: 'FRED',
      europe: 'FRED (Bund 10Y–3M)',
      spain: 'FRED (Bono–Bund spread)',
    },
    sourceUrl: {
      global: '',
      us: 'https://fred.stlouisfed.org/series/T10Y2Y',
      europe: 'https://fred.stlouisfed.org/series/IRLTLT01DEM156N',
      spain: 'https://fred.stlouisfed.org/series/IRLTLT01ESM156N',
    },
  },
];
