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

// ─── helpers ───────────────────────────────────────────────
function parseRows(data) {
  if (!data || !data.rows) return [];
  return data.rows.map(row => {
    const obj = { _dim: row.dimensionValues?.[0]?.value || '—' };
    row.metricValues?.forEach((mv, i) => {
      const key = data.metricHeaders?.[i]?.name || `m${i}`;
      obj[key] = parseFloat(mv.value);
    });
    return obj;
  });
}

function parseGscRows(data) {
  if (!data || !data.rows) return [];
  return data.rows.map(row => ({
    _dim: row.keys?.[0] || row.keys?.join(', ') || '—',
    clicks: row.clicks,
    impressions: row.impressions,
    ctr: row.ctr,
    position: row.position,
  }));
}

// ─── table components per dimension ─────────────────────────
function DataTable({ title, headers, rows, totals }) {
  if (!rows || rows.length === 0) return null;
  return (
    <div className="dashboard-grid mb-6">
      <div className="col-span-full card">
        <div className="card-header"><span className="card-title">{title}</span></div>
        <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
          <table className="w-full text-xs md:text-sm">
            <thead className="sticky top-0 bg-[#1e293b]">
              <tr className="text-slate-400 border-b border-slate-700">
                {headers.map((h, i) => (
                  <th key={i} className={`py-2 ${i === 0 ? 'text-left pr-4' : 'text-right px-3'}`}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.slice(0, 200).map((row, i) => (
                <tr key={i} className="border-b border-slate-800 hover:bg-slate-800/50">
                  {row.cells.map((cell, j) => (
                    <td key={j} className={`py-1.5 ${j === 0 ? 'text-left pr-4 text-brand-300 truncate max-w-xs' : 'text-right px-3'} ${cell.class || ''}`}>{cell.val}</td>
                  ))}
                </tr>
              ))}
              {totals && (
                <tr className="border-t border-slate-600 font-semibold text-slate-200 bg-slate-800/50">
                  {totals.map((cell, j) => (
                    <td key={j} className={`py-2 ${j === 0 ? 'text-left pr-4' : 'text-right px-3'} ${cell.class || ''}`}>{cell.val}</td>
                  ))}
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ─── main dashboard ─────────────────────────────────────────
export default function Dashboard() {
  const [periodIdx, setPeriodIdx] = useState(0);
  const [dimension, setDimension] = useState('date');
  const [organicOnly, setOrganicOnly] = useState(true);    // ON by default
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

  const gscRows = parseGscRows(gscData);
  const ga4Rows = parseRows(ga4Data);
  const ecomRows = parseRows(ecomData).map(r => ({ ...r, _dim: r._dim || '—' }));

  // ── Build merged daily data ──
  function normalizeDate(d) {
    // GA4 returns "20260312", GSC returns "2026-03-12"
    if (!d) return '';
    return d.replace(/-/g, '');
  }

  // Build a lookup map from GA4 rows by normalized date
  const ga4ByDate = {};
  ga4Rows.forEach(r => { ga4ByDate[normalizeDate(r._dim)] = r; });

  // Merge GSC daily rows with GA4 daily data
  function mergeByDate(gscRow) {
    const key = normalizeDate(gscRow._dim);
    const ga = ga4ByDate[key] || {};
    return {
      ...gscRow,
      sessions: ga.sessions || 0,
      totalUsers: ga.totalUsers || 0,
      totalRevenue: ga.totalRevenue || 0,
      transactions: ga.transactions || 0,
      conversions: ga.conversions || 0,
      screenPageViews: ga.screenPageViews || 0,
      eventCount: ga.eventCount || 0,
    };
  }

  const mergedDaily = gscRows.map(mergeByDate);

  const gscTotals = gscRows.reduce((acc, r) => ({
    clicks: (acc.clicks || 0) + (r.clicks || 0),
    impressions: (acc.impressions || 0) + (r.impressions || 0),
  }), {});
  gscTotals.ctr = gscTotals.clicks && gscTotals.impressions
    ? (gscTotals.clicks / gscTotals.impressions) * 100 : 0;
  gscTotals.position = gscRows.length
    ? gscRows.reduce((s, r) => s + (r.position || 0), 0) / gscRows.length : 0;

  const totalUsers = ga4Rows.reduce((s, r) => s + (r.totalUsers || 0), 0);
  const totalRevenue = ga4Rows.reduce((s, r) => s + (r.totalRevenue || 0), 0);
  const transactions = ga4Rows.reduce((s, r) => s + (r.transactions || 0), 0);
  const itemRevenue = ecomRows.reduce((s, r) => s + (r.itemRevenue || 0), 0);
  const itemsPurchased = ecomRows.reduce((s, r) => s + (r.itemsPurchased || 0), 0);
  const sessions = ga4Rows.reduce((s, r) => s + (r.sessions || 0), 0);
  const clicks = gscTotals.clicks || 0;
  const impressions = gscTotals.impressions || 0;

  // ── Build table data ──
  function fmt(v) { return v?.toLocaleString?.() ?? v ?? 0; }
  function fmtPct(v) { return v != null ? `${(v * 100).toFixed(1)}%` : '—'; }
  function fmtCurr(v) { return `$${fmt(v)}`; }

  let tableTitle = '';
  let tableHeaders = [];
  let tableRows = [];
  let tableTotals = null;
  let totalSessionsCalc = sessions;
  let totalRevenueCalc = totalRevenue;

  if (dimension === 'date') {
    tableTitle = 'Daily Breakdown';
    tableHeaders = ['Date', 'Clicks', 'Impressions', 'CTR', 'Position', 'Sessions', 'Revenue'];
    const dailySum = mergedDaily.reduce((s, r) => ({ sessions: s.sessions + (r.sessions || 0), revenue: s.revenue + (r.totalRevenue || 0) }), { sessions: 0, revenue: 0 });
    totalSessionsCalc = dailySum.sessions;
    totalRevenueCalc = dailySum.revenue;
    tableRows = mergedDaily.map(r => ({
      cells: [
        { val: r._dim },
        { val: fmt(r.clicks) },
        { val: fmt(r.impressions) },
        { val: fmtPct(r.ctr) },
        { val: r.position?.toFixed(1) || '—' },
        { val: fmt(r.sessions) },
        { val: fmtCurr(r.totalRevenue), class: 'text-green-400' },
      ],
    }));
    tableTotals = [
      { val: 'Total' },
      { val: fmt(clicks) },
      { val: fmt(impressions) },
      { val: fmtPct(gscTotals.ctr / 100) },
      { val: gscTotals.position?.toFixed(1) || '—' },
      { val: fmt(totalSessionsCalc) },
      { val: fmtCurr(totalRevenueCalc), class: 'text-green-400 font-bold' },
    ];
  }

  if (dimension === 'query') {
    tableTitle = 'Top Queries by Clicks';
    tableHeaders = ['Query', 'Clicks', 'Impressions', 'CTR', 'Position'];
    tableRows = gscRows.map(r => ({
      cells: [
        { val: r._dim },
        { val: fmt(r.clicks) },
        { val: fmt(r.impressions) },
        { val: fmtPct(r.ctr) },
        { val: r.position?.toFixed(1) || '—' },
      ],
    }));
    tableTotals = [
      { val: 'Total' },
      { val: fmt(clicks) },
      { val: fmt(impressions) },
      { val: fmtPct(gscTotals.ctr / 100) },
      { val: gscTotals.position?.toFixed(1) || '—' },
    ];
  }

  if (dimension === 'page') {
    // GSC table
    tableTitle = 'Top Pages by Clicks (GSC)';
    tableHeaders = ['Page URL', 'Clicks', 'Impressions', 'CTR', 'Position'];
    tableRows = gscRows.map(r => ({
      cells: [
        { val: r._dim },
        { val: fmt(r.clicks) },
        { val: fmt(r.impressions) },
        { val: fmtPct(r.ctr) },
        { val: r.position?.toFixed(1) || '—' },
      ],
    }));
    tableTotals = [
      { val: 'Total' },
      { val: fmt(clicks) },
      { val: fmt(impressions) },
      { val: fmtPct(gscTotals.ctr / 100) },
      { val: gscTotals.position?.toFixed(1) || '—' },
    ];
  }

  if (dimension === 'country') {
    tableTitle = 'By Country';
    tableHeaders = ['Country', 'Clicks', 'Impressions', 'CTR', 'Position', 'Sessions', 'Revenue'];
    tableRows = gscRows.map(r => ({
      cells: [
        { val: r._dim },
        { val: fmt(r.clicks) },
        { val: fmt(r.impressions) },
        { val: fmtPct(r.ctr) },
        { val: r.position?.toFixed(1) || '—' },
        { val: fmt(sessions) },
        { val: fmtCurr(totalRevenue) },
      ],
    }));
  }

  if (dimension === 'device') {
    tableTitle = 'By Device';
    tableHeaders = ['Device', 'Clicks', 'Impressions', 'CTR', 'Position', 'Sessions', 'Revenue'];
    tableRows = gscRows.map(r => ({
      cells: [
        { val: r._dim },
        { val: fmt(r.clicks) },
        { val: fmt(r.impressions) },
        { val: fmtPct(r.ctr) },
        { val: r.position?.toFixed(1) || '—' },
        { val: fmt(sessions) },
        { val: fmtCurr(totalRevenue) },
      ],
    }));
  }

  // ── Build GA4 revenue table (always shown when page selected) ──
  let revTable = null;
  if (dimension === 'page' && ecomRows.length > 0) {
    const revTotal = ecomRows.reduce((s, r) => s + (r.itemRevenue || 0), 0);
    const purTotal = ecomRows.reduce((s, r) => s + (r.itemsPurchased || 0), 0);
    revTable = (
      <DataTable
        title={`Revenue by Page (GA4 Organic) — Total: $${revTotal.toLocaleString()}`}
        headers={['Page Path', 'Item Revenue', 'Items Purchased']}
        rows={ecomRows.map(r => ({
          cells: [
            { val: r._dim },
            { val: fmtCurr(r.itemRevenue || 0), class: 'text-green-400' },
            { val: fmt(r.itemsPurchased || 0) },
          ],
        }))}
        totals={[
          { val: `Total (${ecomRows.length} pages)` },
          { val: fmtCurr(revTotal), class: 'text-green-400 font-bold' },
          { val: fmt(purTotal), class: 'font-bold' },
        ]}
      />
    );
  }

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
              <button key={i} onClick={() => setPeriodIdx(i)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                  periodIdx === i ? 'bg-brand-600 text-white' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                }`}>{p.label}</button>
            ))}
            <select value={periodIdx} onChange={e => setPeriodIdx(Number(e.target.value))}
              className="bg-slate-800 text-slate-300 border border-slate-700 rounded-lg px-2 py-1.5 text-xs">
              {PERIODS.map((p, i) => <option key={i} value={i}>{p.label}</option>)}
            </select>
            <select value={dimension} onChange={e => setDimension(e.target.value)}
              className="bg-slate-800 text-slate-300 border border-slate-700 rounded-lg px-2 py-1.5 text-xs">
              {DIMENSIONS.map(d => <option key={d.value} value={d.value}>{d.label}</option>)}
            </select>
            <button onClick={() => setOrganicOnly(!organicOnly)}
              className={`px-2 py-1.5 rounded-lg text-xs font-medium transition ${
                organicOnly ? 'bg-green-600 text-white' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
              }`} title="Filter GA4 data to organic traffic only">
              🌿{organicOnly ? ' Organic' : ' All Traffic'}
            </button>
            <select value={brandedFilter} onChange={e => setBrandedFilter(e.target.value)}
              className="bg-slate-800 text-slate-300 border border-slate-700 rounded-lg px-2 py-1.5 text-xs">
              <option value="total">🔍 All Queries</option>
              <option value="branded">🏷️ Branded</option>
              <option value="nonbranded">📝 Non-branded</option>
            </select>
            <button onClick={loadAll}
              className="bg-brand-600 hover:bg-brand-500 text-white px-3 py-1.5 rounded-lg text-xs font-medium transition">↻ Refresh</button>
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
            <div className="col-span-4 md:col-span-2"><MetricCard title="Organic Clicks" value={clicks} icon="🖱" /></div>
            <div className="col-span-4 md:col-span-2"><MetricCard title="Impressions" value={impressions} icon="👁" /></div>
            <div className="col-span-4 md:col-span-2"><MetricCard title="Avg CTR" value={gscTotals.ctr} format="percent" icon="📊" /></div>
            <div className="col-span-4 md:col-span-2"><MetricCard title="Avg Position" value={gscTotals.position?.toFixed(1)} icon="🎯" /></div>
            <div className="col-span-4 md:col-span-2"><MetricCard title="Sessions" value={sessions} icon="👤" /></div>
            <div className="col-span-4 md:col-span-2"><MetricCard title="Users" value={totalUsers} icon="👥" /></div>
          </div>

          {/* Revenue row */}
          <div className="dashboard-grid mb-6">
            <div className="col-span-6 md:col-span-3"><MetricCard title="Total Revenue" value={totalRevenue} format="currency" icon="💰" /></div>
            <div className="col-span-6 md:col-span-3"><MetricCard title="Item Revenue" value={itemRevenue} format="currency" icon="🛍️" /></div>
            <div className="col-span-6 md:col-span-3"><MetricCard title="Items Purchased" value={itemsPurchased} icon="📦" /></div>
            <div className="col-span-6 md:col-span-3"><MetricCard title="Transactions" value={transactions} icon="🛒" /></div>
          </div>

          {/* ── MAIN DATA TABLE ── */}
          {tableRows.length > 0 && (
            <DataTable title={tableTitle} headers={tableHeaders} rows={tableRows} totals={tableTotals} />
          )}

          {/* ── REVENUE TABLE (GA4, page dimension) ── */}
          {revTable}

          {/* Funnel */}
          <div className="dashboard-grid mb-6">
            <FunnelChart data={[
              { name: 'Sessions', key: 'sessions', value: sessions },
              { name: 'Users', key: 'totalUsers', value: totalUsers },
              { name: 'Key Events', key: 'conversions', value: ga4Rows.reduce((s, r) => s + (r.conversions || 0), 0) },
              { name: 'Revenue', key: 'totalRevenue', value: totalRevenue },
            ]} title="Organic → Revenue Funnel" />
          </div>

          {/* Time series — only for date dimension */}
          {dimension === 'date' && (
            <>
              <div className="dashboard-grid mb-6">
                <div className="col-span-full md:col-span-6">
                  <TimeSeriesChart data={gscRows} lines={[{ key: 'clicks', label: 'Clicks' }, { key: 'impressions', label: 'Impressions' }]} title="GSC: Clicks & Impressions" type="area" />
                </div>
                <div className="col-span-full md:col-span-6">
                  <TimeSeriesChart data={ga4Rows} lines={[{ key: 'sessions', label: 'Sessions' }, { key: 'totalRevenue', label: 'Revenue ($)' }]} title="Sessions & Revenue" type="area" />
                </div>
              </div>
              <div className="dashboard-grid mb-6">
                <div className="col-span-full md:col-span-6">
                  <TimeSeriesChart data={ecomRows} lines={[{ key: 'itemRevenue', label: 'Item Revenue ($)' }, { key: 'itemsPurchased', label: 'Items Purchased' }]} title="Ecommerce Revenue & Purchases" type="area" />
                </div>
              </div>
            </>
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
