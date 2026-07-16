const API_BASE = '/api';

export async function fetchGSC(params = {}) {
  const qs = new URLSearchParams(params).toString();
  const res = await fetch(`${API_BASE}/gsc?${qs}`);
  if (!res.ok) throw new Error(`GSC API: ${res.status} ${res.statusText}`);
  return res.json();
}

export async function fetchGA4(params = {}) {
  const qs = new URLSearchParams(params).toString();
  const res = await fetch(`${API_BASE}/ga4?${qs}`);
  if (!res.ok) throw new Error(`GA4 API: ${res.status} ${res.statusText}`);
  return res.json();
}

export async function fetchFunnel(params = {}) {
  const qs = new URLSearchParams(params).toString();
  const res = await fetch(`${API_BASE}/ga4-funnel?${qs}`);
  if (!res.ok) throw new Error(`Funnel API: ${res.status} ${res.statusText}`);
  return res.json();
}
