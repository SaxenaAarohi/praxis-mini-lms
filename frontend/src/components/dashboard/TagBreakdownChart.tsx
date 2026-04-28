import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import type { DashboardData } from '@/types/api';
import { EmptyState } from '@/components/ui/EmptyState';
import { PieChart as PieIcon } from 'lucide-react';

const COLORS = ['#2843d6', '#5e85fb', '#3a5ff0', '#92b1ff', '#1f3088', '#bdd1ff'];

export function TagBreakdownChart({ data }: { data: DashboardData['tagBreakdown'] }): JSX.Element {
  if (!data.length) {
    return (
      <EmptyState
        icon={<PieIcon className="w-6 h-6" />}
        title="No tag data yet"
        description="Tag-by-tag breakdown will appear after your first submission."
      />
    );
  }

  return (
    <div className="card p-4">
      <h3 className="text-sm font-semibold mb-3">Average score by tag</h3>
      <div className="w-full h-64">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -10 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis dataKey="tag" stroke="#94a3b8" fontSize={12} />
            <YAxis domain={[0, 100]} stroke="#94a3b8" fontSize={12} tickFormatter={(v) => `${v}%`} />
            <Tooltip
              cursor={{ fill: '#f1f5f9' }}
              contentStyle={{ borderRadius: 12, borderColor: '#e2e8f0', fontSize: 12 }}
              formatter={(v: number) => `${v.toFixed(1)}%`}
            />
            <Bar dataKey="avgPercentage" name="Avg %" radius={[6, 6, 0, 0]}>
              {data.map((_, i) => (
                <Cell key={i} fill={COLORS[i % COLORS.length]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
