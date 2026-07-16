export default function MetricCard({ title, value, change, format = 'number', icon }) {
  const fmt = (v) => {
    if (v === null || v === undefined || v === '—') return '—';
    if (format === 'currency') return `$${Number(v).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
    if (format === 'percent') return `${Number(v).toFixed(1)}%`;
    if (format === 'rate') return Number(v).toFixed(4);
    return Number(v).toLocaleString('en-US');
  };

  return (
    <div className="card">
      <div className="card-header">
        <span className="card-title">{title}</span>
        {icon && <span className="text-slate-400 text-lg">{icon}</span>}
      </div>
      <div className="metric-value">{fmt(value)}</div>
      {change !== undefined && (
        <div className={`metric-change ${change >= 0 ? 'positive' : 'danger'}`}>
          {change >= 0 ? '↑' : '↓'} {Math.abs(change).toFixed(1)}%
        </div>
      )}
    </div>
  );
}
