import type { VariableDetail } from '@/lib/gdiEngine';
import { FRED_SERIES, VARIABLE_CONFIG } from '@/lib/constants';

interface VariableTableProps {
  variables: VariableDetail[];
  errors: string[];
}

const VariableTable = ({ variables, errors }: VariableTableProps) => {
  return (
    <div className="rounded-lg border border-card-border bg-card overflow-hidden">
      <div className="px-4 py-3 border-b border-card-border">
        <h2 className="font-display text-lg text-foreground">
          Variable Decomposition
        </h2>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-card-border text-muted-foreground">
              <th className="text-left px-4 py-3 font-medium">Variable</th>
              <th className="text-right px-4 py-3 font-medium">Current</th>
              <th className="text-right px-4 py-3 font-medium">Z-Score</th>
              <th className="text-right px-4 py-3 font-medium">Adj. Z-Score</th>
              <th className="text-right px-4 py-3 font-medium">Weight</th>
              <th className="text-right px-4 py-3 font-medium">Contribution</th>
            </tr>
          </thead>
          <tbody>
            {variables.map((v) => {
              const contribColor = v.contribution > 0.02
                ? 'text-bullish'
                : v.contribution < -0.02
                  ? 'text-bearish'
                  : 'text-muted-foreground';

              return (
                <tr key={v.id} className="border-b border-card-border/50 hover:bg-secondary/30 transition-colors">
                  <td className="px-4 py-3 font-medium">{v.name}</td>
                  <td className="px-4 py-3 text-right font-mono">{v.currentValue.toFixed(2)}</td>
                  <td className="px-4 py-3 text-right font-mono">{v.zScore.toFixed(3)}</td>
                  <td className="px-4 py-3 text-right font-mono">{v.adjustedZScore.toFixed(3)}</td>
                  <td className="px-4 py-3 text-right font-mono">{(v.weight * 100).toFixed(1)}%</td>
                  <td className={`px-4 py-3 text-right font-mono font-semibold ${contribColor}`}>
                    {v.contribution > 0 ? '+' : ''}{v.contribution.toFixed(3)}
                  </td>
                </tr>
              );
            })}
            {errors.map((errId) => {
              const info = FRED_SERIES.find(s => s.id === errId);
              return (
                <tr key={errId} className="border-b border-card-border/50 opacity-50">
                  <td className="px-4 py-3 font-medium">{info?.name || errId}</td>
                  <td colSpan={5} className="px-4 py-3 text-center text-bearish italic">
                    Unavailable
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default VariableTable;
