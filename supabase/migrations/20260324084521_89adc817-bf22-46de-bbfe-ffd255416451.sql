CREATE TABLE public.variable_explanations (
  variable_id text NOT NULL,
  explanation_text text NOT NULL DEFAULT '',
  data_hash text NOT NULL DEFAULT '',
  generated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (variable_id)
);

ALTER TABLE public.variable_explanations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read variable_explanations" ON public.variable_explanations FOR SELECT TO public USING (true);
CREATE POLICY "Anyone can insert variable_explanations" ON public.variable_explanations FOR INSERT TO public WITH CHECK (true);
CREATE POLICY "Anyone can update variable_explanations" ON public.variable_explanations FOR UPDATE TO public USING (true) WITH CHECK (true);