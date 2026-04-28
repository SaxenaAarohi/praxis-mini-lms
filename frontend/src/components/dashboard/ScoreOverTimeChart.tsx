import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import type { DashboardData } from '@/types/api';
import { shortDate } from '@/lib/format';
import { EmptyState } from '@/components/ui/EmptyState';
import { LineChart as LineIcon } from 'lucide-react';

export function ScoreOverTimeChart({ data }: { data: DashboardData['scoreOverTime'] }): JSX.Element {
  if (!data.length) {
    return (
      <EmptyState
        icon={<LineIcon className="w-6 h-6" />}
        title="No activity yet"
        description="Submit an assignment to start tracking your progress."
      />
    );
  }
  const chartData = data.map((d) => ({ ...d, label: shortDate(d.date) }));
  return (
    <div className="card p-4">
      <h3 className="text-sm font-semibold mb-3">Score over time (30 days)</h3>
      <div className="w-full h-64">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 8, right: 16, bottom: 0, left: -10 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis dataKey="label" stroke="#94a3b8" fontSize={12} tickMargin={6} />
            <YAxis domain={[0, 100]} stroke="#94a3b8" fontSize={12} tickFormatter={(v) => `${v}%`} />
            <Tooltip
              cursor={{ stroke: '#cbd5e1' }}
              contentStyle={{ borderRadius: 12, borderColor: '#e2e8f0', fontSize: 12 }}
              formatter={(v: number) => `${v.toFixed(1)}%`}
            />
            <Line
              type="monotone"
              dataKey="avgPercentage"
              name="Avg %"
              stroke="#2843d6"
              strokeWidth={2.5}
              dot={{ r: 3 }}
              activeDot={{ r: 5 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
