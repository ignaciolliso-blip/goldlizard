CREATE TABLE public.narrator_cache (
  id integer PRIMARY KEY DEFAULT 1,
  briefing_text text NOT NULL DEFAULT '',
  data_hash text NOT NULL DEFAULT '',
  generated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.narrator_cache ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read narrator_cache" ON public.narrator_cache FOR SELECT TO public USING (true);
CREATE POLICY "Anyone can insert narrator_cache" ON public.narrator_cache FOR INSERT TO public WITH CHECK (true);
CREATE POLICY "Anyone can update narrator_cache" ON public.narrator_cache FOR UPDATE TO public USING (true) WITH CHECK (true);

INSERT INTO public.narrator_cache (id, briefing_text, data_hash, generated_at) VALUES (1, '', '', now());