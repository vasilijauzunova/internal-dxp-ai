/**
 * firms-fires block
 *
 * Fetches NASA FIRMS fire hotspot data via our secure proxy endpoint.
 * The proxy injects the API key server-side; the browser only calls /api/firms.
 *
 * Proxy URL: /api/firms   (Cloudflare Pages Function at functions/api/firms.js)
 * Original:  https://firms.modaps.eosdis.nasa.gov/api/area/csv/KEY/VIIRS_SNPP_NRT/world/1
 *
 * Renders a data table of hotspots sorted by FRP (fire radiative power) desc.
 */

import { apiFetch, emitDashboardEvent } from '../../scripts/api-client.js';

const PROXY_URL = '/api/firms';

/** Map FRP to severity */
function frpSeverity(frp) {
  const val = parseFloat(frp);
  if (Number.isNaN(val)) return 'unknown';
  if (val >= 100) return 'critical';
  if (val >= 25) return 'warn';
  return 'ok';
}

function buildFireTable(rows) {
  const sorted = [...rows]
    .filter((r) => r.frp)
    .sort((a, b) => parseFloat(b.frp) - parseFloat(a.frp))
    .slice(0, 100);

  const table = document.createElement('table');
  table.className = 'fire-table';

  const thead = document.createElement('thead');
  const hr = document.createElement('tr');
  ['Latitude', 'Longitude', 'Brightness (K)', 'FRP (MW)', 'Confidence', 'Date/Time', 'Country'].forEach((label) => {
    const th = document.createElement('th');
    th.scope = 'col';
    th.textContent = label;
    hr.appendChild(th);
  });
  thead.appendChild(hr);
  table.appendChild(thead);

  const tbody = document.createElement('tbody');
  sorted.forEach((row) => {
    const severity = frpSeverity(row.frp);
    const tr = document.createElement('tr');
    tr.className = `fire-row fire-row--${severity}`;

    const cells = [
      row.latitude ?? row.lat ?? '—',
      row.longitude ?? row.lon ?? '—',
      row.bright_ti4 ?? row.brightness ?? '—',
      (() => {
        const frpPill = document.createElement('span');
        frpPill.className = `pill pill--${severity}`;
        frpPill.textContent = row.frp ?? '—';
        const td = document.createElement('td');
        td.appendChild(frpPill);
        return td;
      })(),
      row.confidence ?? '—',
      row.acq_date && row.acq_time
        ? `${row.acq_date} ${row.acq_time}`
        : (row.acq_date ?? '—'),
      row.country_id ?? '—',
    ];

    cells.forEach((cell) => {
      if (cell instanceof HTMLElement) {
        tr.appendChild(cell);
      } else {
        const td = document.createElement('td');
        td.textContent = cell;
        tr.appendChild(td);
      }
    });

    tbody.appendChild(tr);
  });

  table.appendChild(tbody);
  return table;
}

export default async function decorate(block) {
  block.innerHTML = '';

  const header = document.createElement('div');
  header.className = 'fire-header';
  header.innerHTML = `
    <h2 class="fire-title"><span aria-hidden="true">🔥</span> NASA FIRMS — Active Fire Hotspots (24h)</h2>
    <span class="fire-count"></span>
  `;
  block.appendChild(header);

  // Skeleton
  const skeleton = document.createElement('div');
  skeleton.className = 'fire-skeleton';
  for (let i = 0; i < 5; i += 1) {
    const s = document.createElement('div');
    s.className = 'skeleton';
    s.style.height = '36px';
    s.style.marginBottom = '8px';
    skeleton.appendChild(s);
  }
  block.appendChild(skeleton);

  async function fetchAndRender() {
    const { data, error, stale } = await apiFetch(PROXY_URL, {
      ttlMs: 30 * 60 * 1000, // 30 min — FIRMS updates ~every 30 min
      parse: 'json',
    });

    block.querySelector('.fire-skeleton')?.remove();
    block.querySelector('.fire-table-wrapper')?.remove();
    block.querySelector('.block-error')?.remove();
    block.querySelector('.fire-unconfigured')?.remove();

    // Detect "API key not configured" response (proxy returns { error: '...' })
    if (data && !Array.isArray(data) && data.error) {
      const notice = document.createElement('div');
      notice.className = 'fire-unconfigured';
      notice.innerHTML = `
        <p>🔑 <strong>FIRMS API key not configured.</strong></p>
        <p>Set the <code>FIRMS_API_KEY</code> environment variable in your Cloudflare Pages project
           to enable live fire hotspot data.</p>
        <p><a href="https://firms.modaps.eosdis.nasa.gov/api/area/" target="_blank" rel="noopener noreferrer">
          Get a free FIRMS API key →</a></p>
      `;
      block.appendChild(notice);
      emitDashboardEvent('dashboard:dataReady', { source: 'firms', counts: null, error: 'Not configured' });
      return;
    }

    if (error && !data) {
      const errEl = document.createElement('div');
      errEl.className = 'block-error';
      errEl.textContent = `Failed to load FIRMS fire data: ${error}`;
      block.appendChild(errEl);
      emitDashboardEvent('dashboard:dataReady', { source: 'firms', counts: null, error });
      return;
    }

    // Proxy returns a JSON array directly
    const rows = Array.isArray(data) ? data : [];
    const countEl = block.querySelector('.fire-count');
    if (countEl) countEl.textContent = `${rows.length} hotspots`;

    const counts = { critical: 0, warn: 0, ok: 0 };
    rows.forEach((r) => {
      const sev = frpSeverity(r.frp);
      if (sev !== 'unknown') counts[sev] += 1;
    });

    emitDashboardEvent('dashboard:dataReady', { source: 'firms', counts, error: null });

    const wrapper = document.createElement('div');
    wrapper.className = 'fire-table-wrapper';

    if (stale) {
      const warn = document.createElement('div');
      warn.className = 'stale-warning';
      warn.textContent = '⚠ Showing cached data — live fetch failed.';
      wrapper.appendChild(warn);
    }

    if (rows.length === 0) {
      const empty = document.createElement('p');
      empty.className = 'fire-empty';
      empty.textContent = 'No fire hotspot data available for the past 24 hours.';
      wrapper.appendChild(empty);
    } else {
      wrapper.appendChild(buildFireTable(rows));
    }

    block.appendChild(wrapper);
  }

  await fetchAndRender();
  document.addEventListener('dashboard:refresh', fetchAndRender);
}
