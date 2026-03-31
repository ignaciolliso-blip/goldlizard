
ALTER TABLE public.miner_valuations ADD COLUMN IF NOT EXISTS commodity text NOT NULL DEFAULT 'uranium';
ALTER TABLE public.miner_valuations ADD COLUMN IF NOT EXISTS aisc_per_oz numeric DEFAULT 0;

ALTER TABLE public.sector_pnav_history ADD COLUMN IF NOT EXISTS commodity text NOT NULL DEFAULT 'uranium';
ALTER TABLE public.sector_pnav_history ADD COLUMN IF NOT EXISTS commodity_price numeric DEFAULT 0;
