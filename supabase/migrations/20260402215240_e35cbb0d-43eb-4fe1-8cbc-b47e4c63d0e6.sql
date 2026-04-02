
CREATE POLICY "Allow public insert"
ON public.analysis_snapshots FOR INSERT
TO anon
WITH CHECK (true);

CREATE POLICY "Allow public update"
ON public.analysis_snapshots FOR UPDATE
TO anon
USING (true);
