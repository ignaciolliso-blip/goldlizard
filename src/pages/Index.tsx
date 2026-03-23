import { useEffect, useState } from 'react';
import { fetchAllData, type Observation, type CentralBankEntry } from '@/lib/dataFetcher';
import { calculateGDI, type GDIResult } from '@/lib/gdiEngine';
import GDIHeader from '@/components/GDIHeader';
import LoadingProgress from '@/components/LoadingProgress';
import VariableTable from '@/components/VariableTable';

const Index = () => {
  const [loading, setLoading] = useState(true);
  const [statusMsg, setStatusMsg] = useState('Initializing...');
  const [gdiResult, setGdiResult] = useState<GDIResult | null>(null);
  const [weightMode, setWeightMode] = useState<'fixed' | 'rolling'>('fixed');
  const [error, setError] = useState<string | null>(null);
  const [rawData, setRawData] = useState<{
    fredResults: Record<string, Observation[]>;
    goldSpot: Observation[];
    centralBank: CentralBankEntry[];
    errors: string[];
  } | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const data = await fetchAllData(setStatusMsg);
        setRawData(data);
        setStatusMsg('Computing GDI...');
        const result = calculateGDI(
          data.fredResults,
          data.centralBank,
          data.errors,
          weightMode,
          data.goldSpot
        );
        setGdiResult(result);
      } catch (e: any) {
        setError(e.message || 'Failed to load data');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  // Recalculate when weight mode changes
  useEffect(() => {
    if (!rawData) return;
    const result = calculateGDI(
      rawData.fredResults,
      rawData.centralBank,
      rawData.errors,
      weightMode,
      rawData.goldSpot
    );
    setGdiResult(result);
  }, [weightMode, rawData]);

  if (loading) {
    return <LoadingProgress message={statusMsg} />;
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="font-display text-2xl text-bearish mb-2">Error</h1>
          <p className="text-muted-foreground">{error}</p>
        </div>
      </div>
    );
  }

  const currentGDI = gdiResult ? gdiResult.gdiValues[gdiResult.gdiValues.length - 1] : 0;

  return (
    <div className="min-h-screen p-6 max-w-7xl mx-auto">
      <GDIHeader
        currentGDI={currentGDI}
        weightMode={weightMode}
        onWeightModeChange={setWeightMode}
      />

      {gdiResult && (
        <VariableTable
          variables={gdiResult.variableDetails}
          errors={rawData?.errors || []}
        />
      )}
    </div>
  );
};

export default Index;
