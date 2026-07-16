import { useState, useEffect } from 'react';
import MetricCard from '../components/MetricCard';
import FunnelChart from '../components/FunnelChart';
import TimeSeriesChart from '../components/TimeSeriesChart';
import { fetchGSC, fetchGA4, fetchFunnel, fetchEcommerce } from '../lib/api';

const START_DATE = '2026-03-12';
const TODAY = new Date().toISOString().split('T')[0];

const PERIODS = [
  { label: 'All Time', start: START_DATE, end: TODAY },
  { label: 'Mar 12–Apr 11', start: '2026-03-12', end: '2026-04-11' },
  { label: 'Apr 12–May 11', start: '2026-04-12', end: '2026-05-11' },
  { label: 'May 12–Jun 11', start: '2026-05-12', end: '2026-06-11' },
  { label: 'Jun 12–Jul 11', start: '2026-06-12', end: '2026-07-11' },
  { label: 'Jul 12–Now', start: '2026-07-12', end: TODAY },
  { label: '7d', start: new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0], end: TODAY },
  { label: '30d', start: new Date(Date.now() - 30 * 86400000).toISOString().split('T')[0], end: TODAY },
];

const DIMENSIONS = [
  { label: 'By Day', value: 'date' },
  { label: 'By Country', value: 'country' },
  { label: 'By Device', value: 'device' },
  { label: 'By Page', value: 'page' },
  { label: 'By Query', value: 'query' },
];

export default function Dashboard() {
  const [periodIdx, setPeriodIdx] = useState(0);
  const [dimension, setDimension] = useState('date');
  const [organicOnly, setOrganicOnly] = useState(false);
  const [brandedFilter, setBrandedFilter] = useState('total');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [gscData, setGscData] = useState(null);
  const [ga4Data, setGa4Data] = useState(null);
  const [funnelData, setFunnelData] = useState(null);
  const [ecomData, setEcomData] = useState(null);

  const siteUrl = process.env.NEXT_PUBLIC_GSC_SITE_URL || 'https://epicvin.com/';
  const propertyId = process.env.NEXT_PUBLIC_GA4_PROPERTY_ID || '';

  useEffect(() => {
    if (!propertyId) return;
    loadAll();
  }, [periodIdx, dimension, organicOnly, brandedFilter]);

  async function loadAll() {
    setLoading(true);
    setError(null);
    const period = PERIODS[periodIdx];
    const channel = organicOnly ? 'organic' : '';
    const branded = brandedFilter !== 'total' ? brandedFilter : '';

    try {
      const [gsc, ga4, funnel, ecom] = await Promise.all([
        fetchGSC({ siteUrl, startDate: period.start, endDate: period.end, dimensions: dimension, branded }),
        fetchGA4({ propertyId, startDate: period.start, endDate: period.end, dimensions: dimension, channel }),
        fetchFunnel({ propertyId, startDate: period.start, endDate: period.end, dimension, channel }),
        fetchEcommerce({ propertyId, startDate: period.start, endDate: period.end, dimension, channel }),
      ]);
      setGscData(gsc);
      setGa4Data(ga4);
      setFunnelData(funnel);
      setEcomData(ecom);
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

  // GSC has flat keys (no dimensionValues/metricValues array format)
  function parseGscRows(data) {
    if (!data || !data.rows) return [];
    return data.rows.map(row => {
      const obj = {
        date: row.keys?.[0] || row.keys?.join(', ') || '—',
        keys: row.keys || [],
      };
      if (row.clicks !== undefined) obj.clicks = row.clicks;
      if (row.impressions !== undefined) obj.impressions = row.impressions;
      if (row.ctr !== undefined) obj.ctr = row.ctr;
      if (row.position !== undefined) obj.position = row.position;
      return obj;
    });
  }

  const gscRows = parseGscRows(gscData);
  const ga4Rows = parseRows(ga4Data);
  const ecomRows = parseRows(ecomData);

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

  const funnelSteps = [
    { name: 'Sessions', key: 'sessions', value: ga4Rows.reduce((s, r) => s + (r.sessions || 0), 0) },
    { name: 'Users', key: 'totalUsers', value: ga4Rows.reduce((s, r) => s + (r.totalUsers || 0), 0) },
    { name: 'Page Views', key: 'screenPageViews', value: ga4Rows.reduce((s, r) => s + (r.screenPageViews || 0), 0) },
    { name: 'Key Events', key: 'conversions', value: ga4Rows.reduce((s, r) => s + (r.conversions || 0), 0) },
    { name: 'Revenue', key: 'totalRevenue', value: ga4Rows.reduce((s, r) => s + (r.totalRevenue || 0), 0) },
  ];

  const totalRevenue = ga4Rows.reduce((s, r) => s + (r.totalRevenue || 0), 0);
  const transactions = ga4Rows.reduce((s, r) => s + (r.transactions || 0), 0);
  const itemRevenue = ecomRows.reduce((s, r) => s + (r.itemRevenue || 0), 0);
  const itemsPurchased = ecomRows.reduce((s, r) => s + (r.itemsPurchased || 0), 0);
  const sessions = ga4Rows.reduce((s, r) => s + (r.sessions || 0), 0);
  const totalUsers = ga4Rows.reduce((s, r) => s + (r.totalUsers || 0), 0);
  const clicks = gscTotals.clicks || 0;
  const impressions = gscTotals.impressions || 0;

  if (!propertyId) {
    return (
      <div className="min-h-screen bg-[#0f172a] flex items-center justify-center p-4">
        <div className="card max-w-lg text-center space-y-4">
          <div className="text-4xl">⚙️</div>
          <h1 className="text-xl font-semibold">EpicVIN SEO Dashboard</h1>
          <p className="text-slate-400">Set <code className="text-brand-400">NEXT_PUBLIC_GA4_PROPERTY_ID</code> in Vercel env.</p>
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
            <p className="text-slate-400 text-sm mt-1">
              Period: {PERIODS[periodIdx].start} → {PERIODS[periodIdx].end}
              {organicOnly && <span className="ml-2 text-green-400">| 🌿 Organic Only</span>}
              {brandedFilter !== 'total' && <span className="ml-2 text-amber-400">| {brandedFilter === 'branded' ? '🏷️ Branded' : '📝 Non-branded'}</span>}
              <span className="ml-2 text-slate-500">| Items purchased: {itemsPurchased.toLocaleString()}</span>
              <span className="ml-2 text-green-400">| Item revenue: ${itemRevenue.toLocaleString()}</span>
            </p>
          </div>
          <div className="flex gap-2 flex-wrap">
            {PERIODS.slice(0, 6).map((p, i) => (
              <button
                key={i}
                onClick={() => setPeriodIdx(i)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                  periodIdx === i
                    ? 'bg-brand-600 text-white'
                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                }`}
              >
                {p.label}
              </button>
            ))}
            <select
              value={periodIdx}
              onChange={e => setPeriodIdx(Number(e.target.value))}
              className="bg-slate-800 text-slate-300 border border-slate-700 rounded-lg px-2 py-1.5 text-xs"
            >
              {PERIODS.map((p, i) => (
                <option key={i} value={i}>{p.label}</option>
              ))}
            </select>
            <select
              value={dimension}
              onChange={e => setDimension(e.target.value)}
              className="bg-slate-800 text-slate-300 border border-slate-700 rounded-lg px-2 py-1.5 text-xs"
            >
              {DIMENSIONS.map(d => (
                <option key={d.value} value={d.value}>{d.label}</option>
              ))}
            </select>
            {/* Organic-only toggle */}
            <button
              onClick={() => setOrganicOnly(!organicOnly)}
              className={`px-2 py-1.5 rounded-lg text-xs font-medium transition ${
                organicOnly
                  ? 'bg-green-600 text-white'
                  : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
              }`}
              title="Filter GA4 data to organic traffic only"
            >
              🌿{organicOnly ? ' Organic' : ' All Traffic'}
            </button>
            {/* Branded / non-branded selector */}
            <select
              value={brandedFilter}
              onChange={e => setBrandedFilter(e.target.value)}
              className="bg-slate-800 text-slate-300 border border-slate-700 rounded-lg px-2 py-1.5 text-xs"
            >
              <option value="total">🔍 All Queries</option>
              <option value="branded">🏷️ Branded</option>
              <option value="nonbranded">📝 Non-branded</option>
            </select>
            <button
              onClick={loadAll}
              className="bg-brand-600 hover:bg-brand-500 text-white px-3 py-1.5 rounded-lg text-xs font-medium transition"
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
          {/* KPI cards */}
          <div className="dashboard-grid mb-6">
            <div className="col-span-4 md:col-span-2">
              <MetricCard title="Organic Clicks" value={clicks} icon="🖱" />
            </div>
            <div className="col-span-4 md:col-span-2">
              <MetricCard title="Impressions" value={impressions} icon="👁" />
            </div>
            <div className="col-span-4 md:col-span-2">
              <MetricCard title="Avg CTR" value={gscTotals.ctr} format="percent" icon="📊" />
            </div>
            <div className="col-span-4 md:col-span-2">
              <MetricCard title="Avg Position" value={gscTotals.position?.toFixed(1)} icon="🎯" />
            </div>
            <div className="col-span-4 md:col-span-2">
              <MetricCard title="Sessions" value={sessions} icon="👤" />
            </div>
            <div className="col-span-4 md:col-span-2">
              <MetricCard title="Users" value={totalUsers} icon="👥" />
            </div>
          </div>

          {/* Revenue row */}
          <div className="dashboard-grid mb-6">
            <div className="col-span-6 md:col-span-3">
              <MetricCard title="Total Revenue" value={totalRevenue} format="currency" icon="💰" />
            </div>
            <div className="col-span-6 md:col-span-3">
              <MetricCard title="Item Revenue" value={itemRevenue} format="currency" icon="🛍️" />
            </div>
            <div className="col-span-6 md:col-span-3">
              <MetricCard title="Items Purchased" value={itemsPurchased} icon="📦" />
            </div>
            <div className="col-span-6 md:col-span-3">
              <MetricCard title="Transactions" value={transactions} icon="🛒" />
            </div>
          </div>

          {/* Funnel */}
          <div className="dashboard-grid mb-6">
            <FunnelChart data={funnelSteps} title="Organic → Revenue Funnel" />
          </div>

          {/* Time series */}
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
                lines={[{ key: 'sessions', label: 'Sessions' }, { key: 'totalRevenue', label: 'Revenue ($)' }]}
                title="Sessions & Revenue"
                type="area"
              />
            </div>
          </div>

          {/* Ecommerce time series */}
          <div className="dashboard-grid mb-6">
            <div className="col-span-full md:col-span-6">
              <TimeSeriesChart
                data={gscRows}
                lines={[{ key: 'ctr', label: 'CTR (%)' }]}
                title="GSC CTR"
              />
            </div>
            <div className="col-span-full md:col-span-6">
              <TimeSeriesChart
                data={ecomRows}
                lines={[
                  { key: 'itemRevenue', label: 'Item Revenue ($)' },
                  { key: 'itemsPurchased', label: 'Items Purchased' },
                ]}
                title="Ecommerce Revenue & Purchases"
                type="area"
              />
            </div>
          </div>

          {/* Pages table with revenue */}
          {dimension === 'page' && (
            <div className="dashboard-grid mb-6">
              <div className="col-span-full card">
                <div className="card-header">
                  <span className="card-title">Top Pages by Clicks & Revenue</span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-slate-400 border-b border-slate-700">
                        <th className="text-left py-2 pr-4">Page</th>
                        <th className="text-right py-2 px-4">Clicks</th>
                        <th className="text-right py-2 px-4">Impressions</th>
                        <th className="text-right py-2 px-4">Revenue</th>
                        <th className="text-right py-2 px-4">Items Purchased</th>
                        <th className="text-right py-2 pl-4">Position</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(() => {
                        // Merge GSC page data with GA4 revenue by URL path
                        const revByPath = {};
                        ecomRows.forEach(r => {
                          const path = r.date || '—';
                          revByPath[path] = { revenue: r.itemRevenue || 0, purchased: r.itemsPurchased || 0 };
                        });

                        const merged = gscRows.map(r => {
                          // Extract path from full URL
                          let path = r.date || '—';
                          try { path = new URL(r.date).pathname; } catch(e) {}
                          const rev = revByPath[path] || {};
                          return { ...r, pagePath: r.date || '—', path, ...rev };
                        });

                        return merged.slice(0, 50).map((row, i) => (
                          <tr key={i} className="border-b border-slate-800 hover:bg-slate-800/50">
                            <td className="py-2 pr-4 text-brand-300 truncate max-w-xs">{row.pagePath}</td>
                            <td className="text-right py-2 px-4">{row.clicks?.toLocaleString() || 0}</td>
                            <td className="text-right py-2 px-4">{row.impressions?.toLocaleString() || 0}</td>
                            <td className="text-right py-2 px-4 text-green-400">${(row.revenue || 0).toLocaleString()}</td>
                            <td className="text-right py-2 px-4">{row.purchased || 0}</td>
                            <td className="text-right py-2 pl-4">{row.position?.toFixed(1) || '—'}</td>
                          </tr>
                        ));
                      })()}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          <div className="dashboard-grid">
            <div className="col-span-full text-center text-xs text-slate-600 py-4">
              EpicVIN SEO Dashboard · Data from GSC + GA4 · Since Mar 12, 2026
            </div>
          </div>
        </>
      )}
    </div>
  );
}
