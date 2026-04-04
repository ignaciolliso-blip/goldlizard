import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import type { SolanaAgentMetric } from '@/hooks/useSolanaData';

interface Props {
  data: SolanaAgentMetric[];
}

export default function SolanaAgentChart({ data }: Props) {
  if (data.length === 0) {
    return (
      <div className="bg-card border border-card-border rounded-xl p-5 sm:p-6">
        <p className="text-[11px] font-mono tracking-[0.2em] text-solana-cyan uppercase mb-2">Agent vs Human Transactions</p>
        <div className="h-64 flex items-center justify-center text-muted-foreground text-sm">
          No agent transaction data yet. Enter data in Evidence → Data Management.
        </div>
      </div>
    );
  }

  const chartData = data.map(d => ({
    date: d.date,
    agent: d.agent_pct_of_total_txns ?? 0,
    human: 100 - (d.agent_pct_of_total_txns ?? 0),
  }));

  return (
    <div className="bg-card border border-card-border rounded-xl p-5 sm:p-6">
      <p className="text-[11px] font-mono tracking-[0.2em] text-solana-cyan uppercase mb-1">Agent vs Human Transactions (% share)</p>
      <p className="text-xs text-muted-foreground mb-4">Data from x402 protocol. Dashed line: Norby projection (95-99% by 2028)</p>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData}>
            <XAxis dataKey="date" tick={{ fill: 'hsl(226,10%,60%)', fontSize: 10 }} tickLine={false} axisLine={false} />
            <YAxis domain={[0, 100]} tick={{ fill: 'hsl(226,10%,60%)', fontSize: 10 }} tickLine={false} axisLine={false} unit="%" />
            <Tooltip
              contentStyle={{ background: 'hsl(222,18%,10%)', border: '1px solid hsl(225,18%,16%)', borderRadius: 8, fontSize: 12 }}
              labelStyle={{ color: 'hsl(40,15%,90%)' }}
            />
            <Area type="monotone" dataKey="agent" stackId="1" fill="hsl(191,100%,50%)" fillOpacity={0.3} stroke="hsl(191,100%,50%)" name="Agent %" />
            <Area type="monotone" dataKey="human" stackId="1" fill="hsl(226,10%,25%)" fillOpacity={0.3} stroke="hsl(226,10%,40%)" name="Human %" />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
