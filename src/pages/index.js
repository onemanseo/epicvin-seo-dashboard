import { useState, useEffect } from 'react';
import MetricCard from '../components/MetricCard';
import FunnelChart from '../components/FunnelChart';
import TimeSeriesChart from '../components/TimeSeriesChart';
import { fetchGSC, fetchGA4, fetchFunnel } from '../lib/api';

const PERIODS = [
  { label: '7d', value: '7' },
  { label: '30d', value: '30' },
  { label: '90d', value: '90' },
  { label: '12m', value: '365' },
];

const DIMENSIONS = [
  { label: 'By Day', value: 'date' },
  { label: 'By Country', value: 'country' },
  { label: 'By Device', value: 'device' },
  { label: 'By Page', value: 'page' },
  { label: 'By Query', value: 'query' },
];

export default function Dashboard() {
  const [period, setPeriod] = useState('30');
  const [dimension, setDimension] = useState('date');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Data stores
  const [gscData, setGscData] = useState(null);
  const [ga4Data, setGa4Data] = useState(null);
  const [funnelData, setFunnelData] = useState(null);

  // Config from env
  const siteUrl = process.env.NEXT_PUBLIC_GSC_SITE_URL || 'sc:epicvin.com';
  const propertyId = process.env.NEXT_PUBLIC_GA4_PROPERTY_ID || '';

  useEffect(() => {
    if (!propertyId) return;
    loadAll();
  }, [period, dimension]);

  async function loadAll() {
    setLoading(true);
    setError(null);
    const end = new Date().toISOString().split('T')[0];
    const start = new Date(Date.now() - parseInt(period) * 86400000).toISOString().split('T')[0];

    try {
      const [gsc, ga4, funnel] = await Promise.all([
        fetchGSC({ siteUrl, startDate: start, endDate: end, dimensions: dimension }),
        fetchGA4({ propertyId, startDate: start, endDate: end, dimensions: dimension }),
        fetchFunnel({ propertyId, startDate: start, endDate: end, dimension }),
      ]);
      setGscData(gsc);
      setGa4Data(ga4);
      setFunnelData(funnel);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  function parseRows(data) {
    if (!data || !data.rows) return [];
    return data.rows.map(row => {
      const obj = { date: row.dimensionValues?.[0]?.value || row.dimensionValues?.[0] || '—' };
      row.metricValues?.forEach((mv, i) => {
        const key = data.metricHeaders?.[i]?.name || `m${i}`;
        obj[key] = parseFloat(mv.value);
      });
      return obj;
    });
  }

  const gscRows = parseRows(gscData);
  const ga4Rows = parseRows(ga4Data);

  // Aggregate summaries
  const gscTotals = gscRows.reduce((acc, r) => ({
    clicks: (acc.clicks || 0) + (r.clicks || 0),
    impressions: (acc.impressions || 0) + (r.impressions || 0),
    ctr: (acc.ctr || 0) + (r.ctr || 0),
    position: (acc.position || 0) + (r.position || 0),
  }), {});
  if (gscRows.length > 0) {
    gscTotals.ctr = (gscTotals.ctr / gscRows.length) * 100;
    gscTotals.position = gscTotals.position / gscRows.length;
  }

  // Funnel construction
  const funnelSteps = [
    { name: 'Organic Sessions', key: 'sessions', value: ga4Rows.reduce((s, r) => s + (r.sessions || 0), 0) },
    { name: 'Items Viewed', key: 'itemsViewed', value: ga4Rows.reduce((s, r) => s + (r.itemsViewed || 0), 0) },
    { name: 'Added to Cart', key: 'itemsAddedToCart', value: ga4Rows.reduce((s, r) => s + (r.itemsAddedToCart || 0), 0) },
    { name: 'Checkouts Started', key: 'itemsCheckedOut', value: ga4Rows.reduce((s, r) => s + (r.itemsCheckedOut || 0), 0) },
    { name: 'Purchases', key: 'itemsPurchased', value: ga4Rows.reduce((s, r) => s + (r.itemsPurchased || 0), 0) },
    { name: 'Revenue', key: 'purchaseRevenue', value: ga4Rows.reduce((s, r) => s + (r.purchaseRevenue || 0), 0) },
  ];

  // Revenue metrics
  const totalRevenue = ga4Rows.reduce((s, r) => s + (r.totalRevenue || r.purchaseRevenue || 0), 0);
  const transactions = ga4Rows.reduce((s, r) => s + (r.transactions || 0), 0);
  const sessions = ga4Rows.reduce((s, r) => s + (r.sessions || 0), 0);
  const totalUsers = ga4Rows.reduce((s, r) => s + (r.totalUsers || 0), 0);
  const clicks = gscTotals.clicks || 0;
  const impressions = gscTotals.impressions || 0;

  if (!propertyId) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0f172a]">
        <div className="card max-w-lg text-center space-y-4">
          <div className="text-4xl">⚙️</div>
          <h1 className="text-xl font-semibold">EpicVIN SEO Dashboard</h1>
          <p className="text-slate-400">Set <code className="text-brand-400">NEXT_PUBLIC_GA4_PROPERTY_ID</code> and <code className="text-brand-400">NEXT_PUBLIC_GSC_SITE_URL</code> in Vercel env vars to connect live data.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0f172a] p-4 md:p-6">
      {/* Header */}
      <div className="dashboard-grid mb-6">
        <div className="col-span-full flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">EpicVIN SEO Dashboard</h1>
            <p className="text-slate-400 text-sm mt-1">Organic Performance & Revenue Analytics</p>
          </div>
          <div className="flex gap-2 flex-wrap">
            {PERIODS.map(p => (
              <button
                key={p.value}
                onClick={() => setPeriod(p.value)}
                className={`px-4 py-1.5 rounded-lg text-sm font-medium transition ${
                  period === p.value
                    ? 'bg-brand-600 text-white'
                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                }`}
              >
                {p.label}
              </button>
            ))}
            <select
              value={dimension}
              onChange={e => setDimension(e.target.value)}
              className="ml-2 bg-slate-800 text-slate-300 border border-slate-700 rounded-lg px-3 py-1.5 text-sm"
            >
              {DIMENSIONS.map(d => (
                <option key={d.value} value={d.value}>{d.label}</option>
              ))}
            </select>
            <button
              onClick={loadAll}
              className="bg-brand-600 hover:bg-brand-500 text-white px-4 py-1.5 rounded-lg text-sm font-medium transition"
            >
              ↻ Refresh
            </button>
          </div>
        </div>
      </div>

      {error && (
        <div className="dashboard-grid mb-6">
          <div className="col-span-full card border-red-500/30 bg-red-500/5">
            <p className="text-red-400 text-sm">⚠ {error}</p>
          </div>
        </div>
      )}

      {loading ? (
        <div className="col-span-full flex justify-center py-20">
          <div className="animate-spin h-8 w-8 border-2 border-brand-500 border-t-transparent rounded-full" />
        </div>
      ) : (
        <>
          {/* Top-level KPI cards */}
          <div className="dashboard-grid mb-6">
            <div className="col-span-6 md:col-span-3 lg:col-span-2">
              <MetricCard title="Organic Clicks" value={clicks} icon="🖱" />
            </div>
            <div className="col-span-6 md:col-span-3 lg:col-span-2">
              <MetricCard title="Impressions" value={impressions} icon="👁" />
            </div>
            <div className="col-span-6 md:col-span-3 lg:col-span-2">
              <MetricCard title="Avg CTR" value={gscTotals.ctr} format="percent" icon="📊" />
            </div>
            <div className="col-span-6 md:col-span-3 lg:col-span-2">
              <MetricCard title="Avg Position" value={gscTotals.position?.toFixed(1)} icon="🎯" />
            </div>
            <div className="col-span-6 md:col-span-3 lg:col-span-2">
              <MetricCard title="Organic Sessions" value={sessions} icon="👤" />
            </div>
            <div className="col-span-6 md:col-span-3 lg:col-span-2">
              <MetricCard title="Total Users" value={totalUsers} icon="👥" />
            </div>
          </div>

          {/* Revenue row */}
          <div className="dashboard-grid mb-6">
            <div className="col-span-6 md:col-span-3">
              <MetricCard title="Total Revenue" value={totalRevenue} format="currency" icon="💰" />
            </div>
            <div className="col-span-6 md:col-span-3">
              <MetricCard title="Transactions" value={transactions} icon="🛒" />
            </div>
            <div className="col-span-6 md:col-span-3">
              <MetricCard title="Revenue / Session" value={sessions > 0 ? totalRevenue / sessions : 0} format="currency" icon="📈" />
            </div>
            <div className="col-span-6 md:col-span-3">
              <MetricCard title="Conv. Rate" value={sessions > 0 ? (transactions / sessions) * 100 : 0} format="percent" icon="⚡" />
            </div>
          </div>

          {/* Funnel */}
          <div className="dashboard-grid mb-6">
            <FunnelChart data={funnelSteps} title="Organic → Revenue Funnel" />
          </div>

          {/* Time series charts */}
          <div className="dashboard-grid mb-6">
            <div className="col-span-full md:col-span-6">
              <TimeSeriesChart
                data={gscRows}
                lines={[{ key: 'clicks', label: 'Clicks' }, { key: 'impressions', label: 'Impressions' }]}
                title="GSC: Clicks & Impressions"
                type="area"
              />
            </div>
            <div className="col-span-full md:col-span-6">
              <TimeSeriesChart
                data={ga4Rows}
                lines={[
                  { key: 'sessions', label: 'Sessions' },
                  { key: 'totalRevenue', label: 'Revenue ($)' },
                ]}
                title="GA4: Sessions & Revenue"
                type="area"
              />
            </div>
          </div>

          {/* Conversion rate over time */}
          <div className="dashboard-grid mb-6">
            <div className="col-span-full md:col-span-6">
              <TimeSeriesChart
                data={gscRows}
                lines={[{ key: 'ctr', label: 'CTR (%)' }]}
                title="GSC CTR Over Time"
              />
            </div>
            <div className="col-span-full md:col-span-6">
              <TimeSeriesChart
                data={ga4Rows}
                lines={[{ key: 'sessionConversionRate', label: 'Key Event Rate (%)' }]}
                title="Session Key Event Rate"
              />
            </div>
          </div>

          {/* Funnel time series */}
          <div className="dashboard-grid mb-6">
            <div className="col-span-full">
              <TimeSeriesChart
                data={ga4Rows}
                lines={[
                  { key: 'itemsAddedToCart', label: 'Add to Cart' },
                  { key: 'itemsCheckedOut', label: 'Checkouts' },
                  { key: 'itemsPurchased', label: 'Purchases' },
                ]}
                title="E-commerce Events Over Time"
                type="area"
              />
            </div>
          </div>

          {/* Page-level table */}
          {dimension === 'page' && gscRows.length > 0 && (
            <div className="dashboard-grid mb-6">
              <div className="col-span-full card">
                <div className="card-header">
                  <span className="card-title">Top Pages by Clicks</span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-slate-400 border-b border-slate-700">
                        <th className="text-left py-2 pr-4">Page</th>
                        <th className="text-right py-2 px-4">Clicks</th>
                        <th className="text-right py-2 px-4">Impressions</th>
                        <th className="text-right py-2 px-4">CTR</th>
                        <th className="text-right py-2 pl-4">Position</th>
                      </tr>
                    </thead>
                    <tbody>
                      {gscRows.slice(0, 50).map((row, i) => (
                        <tr key={i} className="border-b border-slate-800 hover:bg-slate-800/50">
                          <td className="py-2 pr-4 text-brand-300 truncate max-w-xs">
                            {row.date}
                          </td>
                          <td className="text-right py-2 px-4">{row.clicks?.toLocaleString() || 0}</td>
                          <td className="text-right py-2 px-4">{row.impressions?.toLocaleString() || 0}</td>
                          <td className="text-right py-2 px-4">
                            {row.ctr ? `${(row.ctr * 100).toFixed(1)}%` : '0.0%'}
                          </td>
                          <td className="text-right py-2 pl-4">{row.position?.toFixed(1) || '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* Footer */}
          <div className="dashboard-grid">
            <div className="col-span-full text-center text-xs text-slate-600 py-4">
              EpicVIN SEO Dashboard · Data from GSC + GA4 · Next.js + Vercel
            </div>
          </div>
        </>
      )}
    </div>
  );
}
