// fetch-economy-data: pulls macro indicators from FRED, ECB, IMF, World Bank
// and stores them in economy_observations / economy_forecasts.
// Processes ONE indicator+region per invocation to stay under CPU limits.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24h

type Obs = { date: string; value: number };

type JobSource = "fred" | "ecb" | "imf" | "wb" | "computed" | "alias";
interface Job {
  indicator_id: string;
  region: string; // global | us | europe | spain
  source: JobSource;
  fred_series?: string;
  ecb_path?: string;
  imf_indicator?: string;
  imf_country?: string;
  wb_country?: string;
  wb_indicator?: string;
  alias_region?: string; // for aliasing one region to another's data
  transform?: (obs: Obs[]) => Obs[];
  notes?: string;
  source_label?: string;
  // computed:
  compute?: (
    fetcher: (j: Job) => Promise<Obs[]>,
  ) => Promise<Obs[]>;
  // multi sub-category (e.g. population by age)
  multi?: (apiKey: string) => Promise<{ subCat: string; obs: Obs[] }[]>;
}

const divideBy = (n: number) => (obs: Obs[]) =>
  obs.map((o) => ({ date: o.date, value: o.value / n }));

const yoyPct = (obs: Obs[]): Obs[] => {
  const byDate = new Map(obs.map((o) => [o.date, o.value]));
  const out: Obs[] = [];
  for (const o of obs) {
    const d = new Date(o.date);
    const prior = new Date(d);
    prior.setUTCFullYear(prior.getUTCFullYear() - 1);
    const key = prior.toISOString().slice(0, 10);
    const priorVal = byDate.get(key);
    if (priorVal && priorVal !== 0) {
      out.push({ date: o.date, value: ((o.value / priorVal) - 1) * 100 });
    }
  }
  return out;
};

const subtractByMonth = (a: Obs[], b: Obs[]): Obs[] => {
  const bMap = new Map(b.map((o) => [o.date.slice(0, 7), o.value]));
  const out: Obs[] = [];
  for (const o of a) {
    const k = o.date.slice(0, 7);
    if (bMap.has(k)) out.push({ date: o.date, value: o.value - (bMap.get(k) as number) });
  }
  return out;
};

// ---------- Job catalogue ----------
const JOBS: Job[] = [
  // ===== GDP ABSOLUTE (USD trillions) =====
  // US: FRED nominal GDP, billions → trillions
  { indicator_id: "gdp_absolute", region: "us", source: "fred", fred_series: "GDP", transform: divideBy(1000), source_label: "FRED/BEA" },
  // Global / Europe / Spain: IMF WEO NGDPD (current USD billions) → trillions
  { indicator_id: "gdp_absolute", region: "global", source: "imf", imf_indicator: "NGDPD", imf_country: "WEOWORLD", transform: divideBy(1000), source_label: "IMF WEO" },
  { indicator_id: "gdp_absolute", region: "europe", source: "imf", imf_indicator: "NGDPD", imf_country: "EURO", transform: divideBy(1000), source_label: "IMF WEO (Euro Area)" },
  { indicator_id: "gdp_absolute", region: "spain", source: "imf", imf_indicator: "NGDPD", imf_country: "ESP", transform: divideBy(1000), source_label: "IMF WEO" },

  // ===== GOVERNMENT DEBT ABSOLUTE (USD trillions) =====
  // US: FRED federal debt (millions of $) → trillions = ÷ 1,000,000
  { indicator_id: "debt_absolute", region: "us", source: "fred", fred_series: "GFDEBTNQ", transform: divideBy(1_000_000), source_label: "FRED" },
  // Others: derived from IMF WEO debt%GDP * GDP — handled via computed jobs
  {
    indicator_id: "debt_absolute", region: "global", source: "computed", source_label: "IMF WEO (derived)",
    compute: async (fetcher) => {
      const gdp = await fetcher({ indicator_id: "_gdp", region: "global", source: "imf", imf_indicator: "NGDPD", imf_country: "WEOWORLD" });
      const ratio = await fetcher({ indicator_id: "_dbt", region: "global", source: "imf", imf_indicator: "GGXWDG_NGDP", imf_country: "WEOWORLD" });
      const rMap = new Map(ratio.map((o) => [o.date, o.value]));
      const out: Obs[] = [];
      for (const g of gdp) {
        const r = rMap.get(g.date);
        if (r != null) out.push({ date: g.date, value: (g.value * r / 100) / 1000 }); // billions → trillions
      }
      return out;
    },
  },
  {
    indicator_id: "debt_absolute", region: "europe", source: "computed", source_label: "IMF WEO (derived)",
    compute: async (fetcher) => {
      const gdp = await fetcher({ indicator_id: "_gdp", region: "europe", source: "imf", imf_indicator: "NGDPD", imf_country: "EURO" });
      const ratio = await fetcher({ indicator_id: "_dbt", region: "europe", source: "imf", imf_indicator: "GGXWDG_NGDP", imf_country: "EURO" });
      const rMap = new Map(ratio.map((o) => [o.date, o.value]));
      const out: Obs[] = [];
      for (const g of gdp) {
        const r = rMap.get(g.date);
        if (r != null) out.push({ date: g.date, value: (g.value * r / 100) / 1000 });
      }
      return out;
    },
  },
  {
    indicator_id: "debt_absolute", region: "spain", source: "computed", source_label: "IMF WEO (derived)",
    compute: async (fetcher) => {
      const gdp = await fetcher({ indicator_id: "_gdp", region: "spain", source: "imf", imf_indicator: "NGDPD", imf_country: "ESP" });
      const ratio = await fetcher({ indicator_id: "_dbt", region: "spain", source: "imf", imf_indicator: "GGXWDG_NGDP", imf_country: "ESP" });
      const rMap = new Map(ratio.map((o) => [o.date, o.value]));
      const out: Obs[] = [];
      for (const g of gdp) {
        const r = rMap.get(g.date);
        if (r != null) out.push({ date: g.date, value: (g.value * r / 100) / 1000 });
      }
      return out;
    },
  },

  // ===== DEBT % OF GDP =====
  { indicator_id: "debt_pct_gdp", region: "us", source: "fred", fred_series: "GFDEGDQ188S", source_label: "FRED" },
  { indicator_id: "debt_pct_gdp", region: "global", source: "imf", imf_indicator: "GGXWDG_NGDP", imf_country: "WEOWORLD", source_label: "IMF WEO" },
  { indicator_id: "debt_pct_gdp", region: "europe", source: "imf", imf_indicator: "GGXWDG_NGDP", imf_country: "EURO", source_label: "IMF WEO (Euro Area)" },
  { indicator_id: "debt_pct_gdp", region: "spain", source: "imf", imf_indicator: "GGXWDG_NGDP", imf_country: "ESP", source_label: "IMF WEO" },

  // ===== GDP PER CAPITA (current USD, store raw) =====
  { indicator_id: "gdp_per_capita", region: "us", source: "fred", fred_series: "A939RX0Q048SBEA", source_label: "FRED/BEA" },
  { indicator_id: "gdp_per_capita", region: "global", source: "imf", imf_indicator: "NGDPDPC", imf_country: "WEOWORLD", source_label: "IMF WEO" },
  { indicator_id: "gdp_per_capita", region: "europe", source: "imf", imf_indicator: "NGDPDPC", imf_country: "EURO", source_label: "IMF WEO (Euro Area)" },
  { indicator_id: "gdp_per_capita", region: "spain", source: "imf", imf_indicator: "NGDPDPC", imf_country: "ESP", source_label: "IMF WEO" },

  // ===== POPULATION BY AGE GROUP — World Bank (3 buckets: 0-14, 15-64, 65+) =====
  ...(["global", "us", "europe", "spain"].map((region) => {
    const wbCountry = { global: "1W", us: "US", europe: "Z4", spain: "ES" }[region as "global"|"us"|"europe"|"spain"]!;
    return {
      indicator_id: "population_age",
      region,
      source: "wb" as JobSource,
      wb_country: wbCountry,
      source_label: "World Bank",
      multi: async (_apiKey: string) => fetchWorldBankPopulationAge(wbCountry),
    } satisfies Job;
  })),

  // ===== YOUTH UNEMPLOYMENT (15-24) =====
  { indicator_id: "unemployment_youth", region: "us", source: "fred", fred_series: "LNU04024887", source_label: "FRED/BLS" },
  { indicator_id: "unemployment_youth", region: "global", source: "wb", wb_country: "1W", wb_indicator: "SL.UEM.1524.ZS", source_label: "World Bank" },
  { indicator_id: "unemployment_youth", region: "europe", source: "wb", wb_country: "Z4", wb_indicator: "SL.UEM.1524.ZS", source_label: "World Bank (Euro Area)" },
  { indicator_id: "unemployment_youth", region: "spain", source: "wb", wb_country: "ES", wb_indicator: "SL.UEM.1524.ZS", source_label: "World Bank" },

  // ===== UNEMPLOYMENT TOTAL =====
  { indicator_id: "unemployment_total", region: "us", source: "fred", fred_series: "UNRATE", source_label: "FRED/BLS" },
  // ECB Euro Area unemployment — fixed I8 → I9
  { indicator_id: "unemployment_total", region: "europe", source: "ecb", ecb_path: "LFSI/M.I9.S.UNEHRT.TOTAL0.15_74.T", source_label: "ECB SDW (Euro Area)" },
  { indicator_id: "unemployment_total", region: "spain", source: "fred", fred_series: "LRHUTTTTESM156S", source_label: "OECD via FRED" },
  // Global unemployment from World Bank (annual)
  { indicator_id: "unemployment_total", region: "global", source: "wb", wb_country: "1W", wb_indicator: "SL.UEM.TOTL.ZS", source_label: "World Bank/ILO" },

  // ===== CPI YoY =====
  { indicator_id: "cpi_yoy", region: "us", source: "fred", fred_series: "CPIAUCSL", transform: yoyPct, source_label: "FRED/BLS" },
  { indicator_id: "cpi_yoy", region: "europe", source: "ecb", ecb_path: "ICP/M.U2.N.000000.4.ANR", source_label: "ECB SDW (Euro Area)" },
  { indicator_id: "cpi_yoy", region: "global", source: "imf", imf_indicator: "PCPIPCH", imf_country: "WEOWORLD", source_label: "IMF WEO" },
  { indicator_id: "cpi_yoy", region: "spain", source: "imf", imf_indicator: "PCPIPCH", imf_country: "ESP", source_label: "IMF WEO/INE" },

  // ===== POLICY RATE =====
  { indicator_id: "policy_rate", region: "us", source: "fred", fred_series: "DFF", source_label: "FRED/Fed" },
  { indicator_id: "policy_rate", region: "europe", source: "ecb", ecb_path: "FM/B.U2.EUR.4F.KR.MRR_FR.LEV", source_label: "ECB" },
  // Spain alias → reuses Europe data (no extra API call)
  { indicator_id: "policy_rate", region: "spain", source: "alias", alias_region: "europe", source_label: "ECB (Spain uses ECB rate)" },

  // ===== M2 MONEY SUPPLY =====
  { indicator_id: "m2_absolute", region: "us", source: "fred", fred_series: "WM2NS", transform: divideBy(1000), source_label: "FRED/Fed (USD trillions)" },
  { indicator_id: "m2_absolute", region: "europe", source: "ecb", ecb_path: "BSI/M.U2.Y.V.M20.X.1.U2.2300.Z01.E", transform: divideBy(1000), source_label: "ECB SDW (EUR trillions)" },
  // Spain M2 from FRED (millions EUR → billions EUR ÷1000)
  { indicator_id: "m2_absolute", region: "spain", source: "fred", fred_series: "MYAGM2ESM189N", transform: divideBy(1_000_000), source_label: "FRED (EUR trillions)" },

  // ===== 10Y BOND YIELD =====
  { indicator_id: "bond_yield_10y", region: "us", source: "fred", fred_series: "DGS10", source_label: "FRED" },
  { indicator_id: "bond_yield_10y", region: "europe", source: "fred", fred_series: "IRLTLT01DEM156N", source_label: "FRED (German Bund)" },
  { indicator_id: "bond_yield_10y", region: "spain", source: "fred", fred_series: "IRLTLT01ESM156N", source_label: "FRED (Spanish Bono)" },

  // ===== YIELD CURVE =====
  { indicator_id: "yield_curve", region: "us", source: "fred", fred_series: "T10Y2Y", source_label: "FRED (10Y-2Y)" },
  {
    indicator_id: "yield_curve", region: "europe", source: "computed", source_label: "FRED (Bund 10Y - 3M)",
    compute: async (fetcher) => {
      const long = await fetcher({ indicator_id: "_eu_10y", region: "europe", source: "fred", fred_series: "IRLTLT01DEM156N" });
      const short = await fetcher({ indicator_id: "_eu_3m", region: "europe", source: "fred", fred_series: "IRSTCI01DEM156N" });
      return subtractByMonth(long, short);
    },
  },
  // Spain: 10Y Bono - 10Y Bund (sovereign spread, in percentage points)
  {
    indicator_id: "yield_curve", region: "spain", source: "computed", source_label: "FRED (Bono - Bund spread)",
    compute: async (fetcher) => {
      const bono = await fetcher({ indicator_id: "_es", region: "spain", source: "fred", fred_series: "IRLTLT01ESM156N" });
      const bund = await fetcher({ indicator_id: "_de", region: "spain", source: "fred", fred_series: "IRLTLT01DEM156N" });
      return subtractByMonth(bono, bund);
    },
  },
];

// ---------- Fetchers ----------
async function fetchFred(seriesId: string, apiKey: string): Promise<Obs[]> {
  const url = `https://api.stlouisfed.org/fred/series/observations?series_id=${seriesId}&api_key=${apiKey}&file_type=json&observation_start=2000-01-01`;
  const r = await fetch(url);
  if (!r.ok) throw new Error(`FRED ${seriesId} HTTP ${r.status}`);
  const j = await r.json();
  if (!j.observations) throw new Error(`FRED ${seriesId} no observations`);
  return j.observations
    .filter((o: any) => o.value !== "." && !isNaN(parseFloat(o.value)))
    .map((o: any) => ({ date: o.date, value: parseFloat(o.value) }));
}

async function fetchEcb(path: string): Promise<Obs[]> {
  const url = `https://data-api.ecb.europa.eu/service/data/${path}?format=jsondata&startPeriod=2000-01-01`;
  const r = await fetch(url, { headers: { Accept: "application/json" } });
  if (!r.ok) throw new Error(`ECB ${path} HTTP ${r.status}`);
  const j = await r.json();
  const ds = j?.dataSets?.[0];
  const timeDim = j?.structure?.dimensions?.observation?.find((d: any) => d.id === "TIME_PERIOD")
    || j?.structure?.dimensions?.observation?.[0];
  const periods: string[] = (timeDim?.values || []).map((v: any) => v.id);
  const seriesObj = ds?.series ? Object.values(ds.series)[0] as any : null;
  const obsMap = seriesObj?.observations || {};
  const out: Obs[] = [];
  for (const [idx, arr] of Object.entries(obsMap)) {
    const i = parseInt(idx, 10);
    const period = periods[i];
    const val = (arr as any[])?.[0];
    if (!period || val === null || val === undefined || isNaN(Number(val))) continue;
    let date = period;
    if (/^\d{4}-\d{2}$/.test(period)) date = `${period}-01`;
    else if (/^\d{4}-Q[1-4]$/.test(period)) {
      const [y, q] = period.split("-Q");
      const month = String((parseInt(q) - 1) * 3 + 1).padStart(2, "0");
      date = `${y}-${month}-01`;
    } else if (/^\d{4}$/.test(period)) date = `${period}-12-31`;
    out.push({ date, value: Number(val) });
  }
  return out.sort((a, b) => a.date.localeCompare(b.date));
}

async function fetchImf(indicator: string, country: string): Promise<{ actuals: Obs[]; forecasts: Obs[] }> {
  const url = `https://www.imf.org/external/datamapper/api/v1/${indicator}/${country}`;
  const r = await fetch(url);
  if (!r.ok) throw new Error(`IMF ${indicator}/${country} HTTP ${r.status}`);
  const j = await r.json();
  const obj = j?.values?.[indicator]?.[country];
  if (!obj || typeof obj !== "object") {
    throw new Error(`IMF ${indicator}/${country} returned no series for that country code`);
  }
  const currentYear = new Date().getUTCFullYear();
  const actuals: Obs[] = [];
  const forecasts: Obs[] = [];
  for (const [year, val] of Object.entries(obj)) {
    if (val === null || val === undefined || isNaN(Number(val))) continue;
    const y = parseInt(year, 10);
    const entry = { date: `${y}-12-31`, value: Number(val) };
    if (y < currentYear) actuals.push(entry);
    else if (y <= currentYear + 5) forecasts.push(entry);
  }
  actuals.sort((a, b) => a.date.localeCompare(b.date));
  forecasts.sort((a, b) => a.date.localeCompare(b.date));
  return { actuals, forecasts };
}

async function fetchWorldBank(country: string, indicator: string): Promise<Obs[]> {
  const url = `https://api.worldbank.org/v2/country/${country}/indicator/${indicator}?format=json&per_page=200&mrv=60`;
  const r = await fetch(url);
  if (!r.ok) throw new Error(`WorldBank ${indicator}/${country} HTTP ${r.status}`);
  const j = await r.json();
  if (!Array.isArray(j) || j.length < 2) throw new Error(`WorldBank ${indicator}/${country} unexpected shape`);
  const rows: any[] = j[1] || [];
  const out: Obs[] = [];
  for (const row of rows) {
    if (row?.value == null) continue;
    const year = parseInt(row.date, 10);
    if (Number.isNaN(year)) continue;
    out.push({ date: `${year}-12-31`, value: Number(row.value) });
  }
  return out.sort((a, b) => a.date.localeCompare(b.date));
}

async function fetchWorldBankPopulationAge(country: string): Promise<{ subCat: string; obs: Obs[] }[]> {
  const [pct014, pct1564, pct65, total] = await Promise.all([
    fetchWorldBank(country, "SP.POP.0014.TO.ZS"),
    fetchWorldBank(country, "SP.POP.1564.TO.ZS"),
    fetchWorldBank(country, "SP.POP.65UP.TO.ZS"),
    fetchWorldBank(country, "SP.POP.TOTL"),
  ]);
  const totalMap = new Map(total.map((o) => [o.date, o.value]));
  const buildAbs = (pct: Obs[]) => {
    const out: Obs[] = [];
    for (const p of pct) {
      const t = totalMap.get(p.date);
      if (t != null) out.push({ date: p.date, value: (p.value / 100) * t });
    }
    return out;
  };
  return [
    { subCat: "0-14", obs: buildAbs(pct014) },
    { subCat: "15-64", obs: buildAbs(pct1564) },
    { subCat: "65+", obs: buildAbs(pct65) },
  ];
}

// ---------- Main handler ----------
serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  const startedAt = Date.now();

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );
  const fredKey = Deno.env.get("FRED_API_KEY")?.trim() || "";

  let body: { indicator_id?: string; region?: string; force_refresh?: boolean } = {};
  try { body = await req.json(); } catch (_) { /* allow empty */ }

  if (!body.indicator_id || !body.region) {
    return new Response(
      JSON.stringify({
        error: "indicator_id and region are required",
        hint: "Call this function once per indicator+region combination.",
      }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  const jobs = JOBS.filter(
    (j) => j.indicator_id === body.indicator_id && j.region === body.region,
  );

  if (jobs.length === 0) {
    return new Response(
      JSON.stringify({
        fetched: 0,
        errors: [],
        skipped: `No job defined for ${body.indicator_id}/${body.region} (intentionally not applicable)`,
        duration_ms: Date.now() - startedAt,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  // Cache TTL check
  const { data: cacheRows } = await supabase
    .from("economy_cache_meta")
    .select("indicator_id, region, last_fetched, fetch_status")
    .eq("indicator_id", body.indicator_id)
    .eq("region", body.region);
  const cached = cacheRows?.[0];

  const fetchedSeries: string[] = [];
  const errors: string[] = [];

  // Quick cache short-circuit: if all jobs are fresh, return immediately without doing work.
  const allFresh = !body.force_refresh && cached?.last_fetched && cached.fetch_status === "ok"
    && (Date.now() - new Date(cached.last_fetched).getTime() < CACHE_TTL_MS);
  if (allFresh) {
    return new Response(
      JSON.stringify({ fetched: 0, cached: true, errors: [], duration_ms: Date.now() - startedAt }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  const rawFetch = async (j: Job): Promise<Obs[]> => {
    if (j.source === "fred") return fetchFred(j.fred_series!, fredKey);
    if (j.source === "ecb") return fetchEcb(j.ecb_path!);
    if (j.source === "imf") {
      const { actuals } = await fetchImf(j.imf_indicator!, j.imf_country!);
      return actuals;
    }
    throw new Error(`raw fetch unsupported for ${j.source}`);
  };

  for (const job of jobs) {
    const key = `${job.indicator_id}|${job.region}`;
    if (!body.force_refresh && cached?.last_fetched && cached.fetch_status === "ok") {
      const age = Date.now() - new Date(cached.last_fetched).getTime();
      if (age < CACHE_TTL_MS) continue;
    }

    try {
      let observations: Obs[] = [];
      let forecasts: Obs[] = [];
      let isMulti = false;
      let multiGroups: { subCat: string; obs: Obs[] }[] = [];

      if (job.source === "alias") {
        // Copy observations from another region (no API call)
        const { data, error } = await supabase
          .from("economy_observations")
          .select("observation_date,value")
          .eq("indicator_id", job.indicator_id)
          .eq("region", job.alias_region!);
        if (error) throw error;
        observations = (data || []).map((r: any) => ({
          date: r.observation_date,
          value: Number(r.value),
        }));
        if (observations.length === 0) {
          throw new Error(`alias source ${job.alias_region} has no data yet — fetch it first`);
        }
      } else if (job.multi) {
        multiGroups = await job.multi(fredKey);
        isMulti = true;
      } else if (job.source === "fred") {
        if (!fredKey) throw new Error("FRED_API_KEY not configured");
        observations = await fetchFred(job.fred_series!, fredKey);
      } else if (job.source === "ecb") {
        observations = await fetchEcb(job.ecb_path!);
      } else if (job.source === "imf") {
        const { actuals, forecasts: fc } = await fetchImf(job.imf_indicator!, job.imf_country!);
        observations = actuals;
        forecasts = fc;
      } else if (job.source === "wb") {
        observations = await fetchWorldBank(job.wb_country!, job.wb_indicator!);
      } else if (job.source === "computed") {
        observations = await job.compute!(rawFetch);
      }

      if (job.transform) {
        observations = job.transform(observations);
        // Apply the same unit transform to forecasts so units stay consistent
        // between the actual series and IMF projections.
        if (forecasts.length) forecasts = job.transform(forecasts);
      }

      const sourceTag = (job.source_label || job.source).toUpperCase();

      if (isMulti) {
        for (const g of multiGroups) {
          const rows = g.obs.map((o) => ({
            indicator_id: job.indicator_id,
            region: job.region,
            observation_date: o.date,
            value: o.value,
            sub_category: g.subCat,
            source: sourceTag,
            source_series_id: job.wb_country || null,
            updated_at: new Date().toISOString(),
          }));
          if (rows.length) {
            const { error } = await supabase
              .from("economy_observations")
              .upsert(rows, { onConflict: "indicator_id,region,observation_date,sub_category" });
            if (error) throw error;
          }
        }
      } else if (observations.length) {
        const rows = observations.map((o) => ({
          indicator_id: job.indicator_id,
          region: job.region,
          observation_date: o.date,
          value: o.value,
          sub_category: '',
          source: sourceTag,
          source_series_id: job.fred_series || job.ecb_path || job.imf_indicator || job.wb_indicator || null,
          updated_at: new Date().toISOString(),
        }));
        const { error } = await supabase
          .from("economy_observations")
          .upsert(rows, { onConflict: "indicator_id,region,observation_date,sub_category" });
        if (error) throw error;
      }

      if (forecasts.length) {
        const rows = forecasts.map((o) => ({
          indicator_id: job.indicator_id,
          region: job.region,
          forecast_date: o.date,
          value: o.value,
          source: "IMF WEO",
          publication_round: `${new Date().getUTCFullYear()}`,
          updated_at: new Date().toISOString(),
        }));
        const { error } = await supabase
          .from("economy_forecasts")
          .upsert(rows, { onConflict: "indicator_id,region,forecast_date,source" });
        if (error) throw error;
      }

      const lastObs = isMulti
        ? multiGroups.flatMap((g) => g.obs).map((o) => o.date).sort().pop() || null
        : observations.map((o) => o.date).sort().pop() || null;

      await supabase.from("economy_cache_meta").upsert({
        indicator_id: job.indicator_id,
        region: job.region,
        last_fetched: new Date().toISOString(),
        last_observation_date: lastObs,
        fetch_status: "ok",
        error_message: null,
        notes: job.notes || null,
      }, { onConflict: "indicator_id,region" });

      fetchedSeries.push(key);
    } catch (e) {
      const msg = (e as Error).message || String(e);
      console.error(`Job failed ${key}:`, msg);
      errors.push(`${key}: ${msg}`);
      await supabase.from("economy_cache_meta").upsert({
        indicator_id: job.indicator_id,
        region: job.region,
        last_fetched: new Date().toISOString(),
        fetch_status: "error",
        error_message: msg.slice(0, 500),
        notes: job.notes || null,
      }, { onConflict: "indicator_id,region" });
    }
  }

  return new Response(
    JSON.stringify({
      fetched: fetchedSeries.length,
      series: fetchedSeries,
      errors,
      duration_ms: Date.now() - startedAt,
    }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } },
  );
});
