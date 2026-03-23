import { supabase } from '@/integrations/supabase/client';
import type { ScenarioConfig } from './scenarioEngine';

export async function fetchScenarioTargets(): Promise<ScenarioConfig | null> {
  const { data, error } = await supabase
    .from('scenario_targets')
    .select('config_json')
    .order('id', { ascending: true })
    .limit(1)
    .maybeSingle();

  if (error || !data) return null;
  return data.config_json as unknown as ScenarioConfig;
}
