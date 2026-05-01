// fetch-economy-data: pulls macro indicators from FRED, ECB, IMF and UN
// and stores them in economy_observations / economy_forecasts.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24h

type Obs = { date: string; value: number };

// ---------- Job catalogue ----------
type JobSource = "fred" | "ecb" | "imf" | "un_pop" | "computed";
interface Job {
  indicator_id: string;
  region: string; // global | us | europe | spain
  source: JobSource;
  // source-specific:
  fred_series?: string;
  ecb_path?: string; // e.g. FM/B.U2.EUR.4F.KR.MRR_FR.LEV
  imf_indicator?: string;
  imf_country?: string;
  un_location?: number;
  transform?: (obs: Obs[]) => Obs[];
  notes?: string;
  // computed:
  compute?: (
    fetcher: (j: Job) => Promise<Obs[]>,
  ) => Promise<Obs[]>;
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

const subtractSeries = (a: Obs[], b: Obs[]): Obs[] => {
  const bMap = new Map(b.map((o) => [o.date.slice(0, 7), o.value]));
  const out: Obs[] = [];
  for (const o of a) {
    const k = o.date.slice(0, 7);
    if (bMap.has(k)) out.push({ date: o.date, value: o.value - (bMap.get(k) as number) });
  }
  return out;
};

const JOBS: Job[] = [
  // ---- FRED: US ----
  { indicator_id: "gdp_absolute", region: "us", source: "fred", fred_series: "GDP", transform: divideBy(1000) },
  { indicator_id: "debt_pct_gdp", region: "us", source: "fred", fred_series: "GFDEGDQ188S" },
  { indicator_id: "gdp_per_capita", region: "us", source: "fred", fred_series: "A939RX0Q048SBEA" },
  { indicator_id: "unemployment_youth", region: "us", source: "fred", fred_series: "LNU04024887" },
  { indicator_id: "unemployment_total", region: "us", source: "fred", fred_series: "UNRATE" },
  { indicator_id: "cpi_yoy", region: "us", source: "fred", fred_series: "CPIAUCSL", transform: yoyPct },
  { indicator_id: "policy_rate", region: "us", source: "fred", fred_series: "DFF" },
  { indicator_id: "m2_absolute", region: "us", source: "fred", fred_series: "WM2NS", transform: divideBy(1000) },
  { indicator_id: "bond_yield_10y", region: "us", source: "fred", fred_series: "DGS10" },
  { indicator_id: "yield_curve", region: "us", source: "fred", fred_series: "T10Y2Y" },

  // ---- FRED: Europe / Spain bonds ----
  { indicator_id: "bond_yield_10y", region: "europe", source: "fred", fred_series: "IRLTLT01DEM156N" },
  { indicator_id: "bond_yield_10y", region: "spain", source: "fred", fred_series: "IRLTLT01ESM156N" },

  // ---- FRED: Spain proxy via OECD ----
  { indicator_id: "unemployment_total", region: "spain", source: "fred", fred_series: "LRHUTTTTESM156S",
    notes: "Source: IMF/OECD proxy for INE data" },
  { indicator_id: "unemployment_youth", region: "spain", source: "fred", fred_series: "LRUN24TTESM156S",
    notes: "Source: IMF/OECD proxy for INE data" },

  // ---- Yield curve EUROPE (computed) ----
  {
    indicator_id: "yield_curve", region: "europe", source: "computed",
    compute: async (fetcher) => {
      const long = await fetcher({ indicator_id: "_eu_10y", region: "europe", source: "fred", fred_series: "IRLTLT01DEM156N" });
      const short = await fetcher({ indicator_id: "_eu_3m", region: "europe", source: "fred", fred_series: "IRSTCI01DEM156N" });
      return subtractSeries(long, short);
    },
  },

  // ---- ECB ----
  { indicator_id: "policy_rate", region: "europe", source: "ecb", ecb_path: "FM/B.U2.EUR.4F.KR.MRR_FR.LEV" },
  { indicator_id: "m2_absolute", region: "europe", source: "ecb", ecb_path: "BSI/M.U2.Y.V.M20.X.1.U2.2300.Z01.E", transform: divideBy(1000) },
  { indicator_id: "unemployment_total", region: "europe", source: "ecb", ecb_path: "LFSI/M.I8.S.UNEHRT.TOTAL0.15_74.T" },
  { indicator_id: "unemployment_youth", region: "europe", source: "ecb", ecb_path: "LFSI/M.I8.S.UNEHRT.AGE_Y15_24.PCT_ACT_T" },
  { indicator_id: "cpi_yoy", region: "europe", source: "ecb", ecb_path: "ICP/M.U2.N.000000.4.ANR" },

  // ---- IMF WEO (actuals + forecasts) ----
  { indicator_id: "gdp_absolute", region: "global", source: "imf", imf_indicator: "NGDPD", imf_country: "WEOWORLD", transform: divideBy(1000) },
  { indicator_id: "gdp_absolute", region: "spain", source: "imf", imf_indicator: "NGDPD", imf_country: "ESP", transform: divideBy(1000) },
  { indicator_id: "debt_pct_gdp", region: "global", source: "imf", imf_indicator: "GGXWDG_NGDP", imf_country: "WEOWORLD" },
  { indicator_id: "debt_pct_gdp", region: "europe", source: "imf", imf_indicator: "GGXWDG_NGDP", imf_country: "EUR" },
  { indicator_id: "debt_pct_gdp", region: "spain", source: "imf", imf_indicator: "GGXWDG_NGDP", imf_country: "ESP" },
  { indicator_id: "gdp_per_capita", region: "global", source: "imf", imf_indicator: "NGDPDPC", imf_country: "WEOWORLD" },
  { indicator_id: "gdp_per_capita", region: "europe", source: "imf", imf_indicator: "NGDPDPC", imf_country: "EUR" },
  { indicator_id: "gdp_per_capita", region: "spain", source: "imf", imf_indicator: "NGDPDPC", imf_country: "ESP" },
  { indicator_id: "cpi_yoy", region: "global", source: "imf", imf_indicator: "PCPIPCH", imf_country: "WEOWORLD" },
  { indicator_id: "cpi_yoy", region: "spain", source: "imf", imf_indicator: "PCPIPCH", imf_country: "ESP",
    notes: "Source: IMF/OECD proxy for INE data" },

  // ---- UN Population by age (annual, multi sub_category) ----
  { indicator_id: "population_age", region: "global", source: "un_pop", un_location: 900 },
  { indicator_id: "population_age", region: "us", source: "un_pop", un_location: 840 },
  { indicator_id: "population_age", region: "europe", source: "un_pop", un_location: 908 },
  { indicator_id: "population_age", region: "spain", source: "un_pop", un_location: 724 },
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
  // ECB JSON: dataSets[0].series[<key>].observations -> { "0": [value], "1": [value] }
  // structure.dimensions.observation[0].values[i].id provides time period
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
    // Normalise period (e.g. "2024-03" or "2024-Q1") to YYYY-MM-01
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
  const obj = j?.values?.[indicator]?.[country] || {};
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

async function fetchUnPop(location: number): Promise<{ subCat: string; obs: Obs[] }[]> {
  // Indicator 47: population by broad age groups
  const url = `https://population.un.org/dataportalapi/api/v1/data/indicators/47/locations/${location}/start/2000/end/2030?format=json`;
  const r = await fetch(url);
  if (!r.ok) throw new Error(`UN pop ${location} HTTP ${r.status}`);
  const j = await r.json();
  const rows: any[] = j?.data || [];
  const groups: Record<string, Obs[]> = {};
  for (const row of rows) {
    if (row.variant && row.variant !== "Median") continue;
    if (row.sex && row.sex !== "Both sexes") continue;
    const ageLabel: string = row.ageLabel || row.ageStart + "-" + row.ageEnd;
    const date = `${row.timeLabel || row.year}-12-31`;
    const value = Number(row.value);
    if (isNaN(value)) continue;
    (groups[ageLabel] ||= []).push({ date, value });
  }
  return Object.entries(groups).map(([subCat, obs]) => ({
    subCat,
    obs: obs.sort((a, b) => a.date.localeCompare(b.date)),
  }));
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

  // Determine job set
  let jobs = JOBS;
  if (body.indicator_id && body.region) {
    jobs = JOBS.filter((j) => j.indicator_id === body.indicator_id && j.region === body.region);
  }

  // Load cache meta for TTL filtering
  const { data: cacheRows } = await supabase
    .from("economy_cache_meta")
    .select("indicator_id, region, last_fetched, fetch_status");
  const cacheMap = new Map<string, { last_fetched: string | null; fetch_status: string | null }>();
  for (const r of cacheRows || []) {
    cacheMap.set(`${r.indicator_id}|${r.region}`, {
      last_fetched: r.last_fetched,
      fetch_status: r.fetch_status,
    });
  }

  const fetchedSeries: string[] = [];
  const errors: string[] = [];

  // Reusable raw fetcher used by computed jobs
  const rawFetch = async (j: Job): Promise<Obs[]> => {
    if (j.source === "fred") return fetchFred(j.fred_series!, fredKey);
    if (j.source === "ecb") return fetchEcb(j.ecb_path!);
    throw new Error(`raw fetch unsupported for ${j.source}`);
  };

  for (const job of jobs) {
    const key = `${job.indicator_id}|${job.region}`;
    const cached = cacheMap.get(key);
    if (!body.force_refresh && cached?.last_fetched && cached.fetch_status === "ok") {
      const age = Date.now() - new Date(cached.last_fetched).getTime();
      if (age < CACHE_TTL_MS) continue;
    }

    try {
      let observations: Obs[] = [];
      let forecasts: Obs[] = [];
      let isAgeGrouped = false;
      let ageGroups: { subCat: string; obs: Obs[] }[] = [];

      if (job.source === "fred") {
        if (!fredKey) throw new Error("FRED_API_KEY not configured");
        observations = await fetchFred(job.fred_series!, fredKey);
      } else if (job.source === "ecb") {
        observations = await fetchEcb(job.ecb_path!);
      } else if (job.source === "imf") {
        const { actuals, forecasts: fc } = await fetchImf(job.imf_indicator!, job.imf_country!);
        observations = actuals;
        forecasts = fc;
      } else if (job.source === "un_pop") {
        ageGroups = await fetchUnPop(job.un_location!);
        isAgeGrouped = true;
      } else if (job.source === "computed") {
        observations = await job.compute!(rawFetch);
      }

      if (job.transform) observations = job.transform(observations);

      // Upsert observations
      if (isAgeGrouped) {
        for (const g of ageGroups) {
          const rows = g.obs.map((o) => ({
            indicator_id: job.indicator_id,
            region: job.region,
            observation_date: o.date,
            value: o.value,
            sub_category: g.subCat,
            source: "UN WPP",
            source_series_id: `47/${job.un_location}`,
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
          sub_category: null,
          source: job.source.toUpperCase(),
          source_series_id: job.fred_series || job.ecb_path || job.imf_indicator || null,
          updated_at: new Date().toISOString(),
        }));
        const { error } = await supabase
          .from("economy_observations")
          .upsert(rows, { onConflict: "indicator_id,region,observation_date,sub_category" });
        if (error) throw error;
      }

      // Forecasts
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

      // Cache meta success
      const lastObs = isAgeGrouped
        ? ageGroups.flatMap((g) => g.obs).map((o) => o.date).sort().pop() || null
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
