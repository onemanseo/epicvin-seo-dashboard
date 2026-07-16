import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';

export default function FunnelChart({ data, title }) {
  if (!data || data.length === 0) return null;

  const colors = ['#0ea5e9', '#6366f1', '#8b5cf6', '#ec4899', '#f43f5e', '#22c55e', '#eab308', '#f97316'];

  return (
    <div className="card col-span-full">
      <div className="card-header">
        <span className="card-title">{title || 'Conversion Funnel'}</span>
      </div>
      <div className="mt-4 space-y-3">
        {data.map((step, i) => {
          const maxVal = Math.max(...data.map(d => d.value));
          const pct = maxVal > 0 ? (step.value / maxVal) * 100 : 0;
          return (
            <div key={step.name} className="space-y-1">
              <div className="flex justify-between text-sm">
                <span className="text-slate-300">{step.name}</span>
                <span className="text-slate-400 font-mono">{step.value.toLocaleString()}</span>
              </div>
              <div className="w-full bg-slate-700/50 rounded h-6 overflow-hidden">
                <div
                  className="funnel-bar"
                  style={{
                    width: `${pct}%`,
                    background: colors[i % colors.length],
                  }}
                />
              </div>
              {i > 0 && (
                <div className="text-xs text-slate-500 text-right">
                  {data[i - 1].value > 0
                    ? `${((step.value / data[i - 1].value) * 100).toFixed(1)}% от предыдущего шага`
                    : '—'}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
