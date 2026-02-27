/**
 * earthquake-feed block
 *
 * Fetches USGS All-Day GeoJSON feed and renders a sortable table.
 * Rows are colour-coded by magnitude.
 *
 * API: https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_day.geojson
 */

import { apiFetch, emitDashboardEvent } from '../../scripts/api-client.js';

const USGS_URL = 'https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_day.geojson';

/** Map magnitude to a CSS severity class and label */
function severityClass(mag) {
  if (mag >= 5) return 'critical';
  if (mag >= 2.5) return 'warn';
  return 'ok';
}

function formatTime(ts) {
  return new Date(ts).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZoneName: 'short',
  });
}

/** Build a skeleton loader */
function buildSkeleton() {
  const wrapper = document.createElement('div');
  wrapper.className = 'eq-skeleton';
  for (let i = 0; i < 6; i += 1) {
    const row = document.createElement('div');
    row.className = 'skeleton';
    row.style.height = '36px';
    row.style.marginBottom = '8px';
    wrapper.appendChild(row);
  }
  return wrapper;
}

/** Render the data table */
function buildTable(features, sortKey, sortDir) {
  const sorted = [...features].sort((a, b) => {
    let va; let
      vb;
    if (sortKey === 'mag') {
      va = a.properties.mag ?? -Infinity;
      vb = b.properties.mag ?? -Infinity;
    } else if (sortKey === 'time') {
      va = a.properties.time;
      vb = b.properties.time;
    } else if (sortKey === 'place') {
      va = a.properties.place ?? '';
      vb = b.properties.place ?? '';
    } else {
      va = a.geometry?.coordinates?.[2] ?? 0;
      vb = b.geometry?.coordinates?.[2] ?? 0;
    }
    if (va < vb) return sortDir === 'asc' ? -1 : 1;
    if (va > vb) return sortDir === 'asc' ? 1 : -1;
    return 0;
  });

  const table = document.createElement('table');
  table.className = 'eq-table';

  const thead = document.createElement('thead');
  const headerRow = document.createElement('tr');

  const cols = [
    { key: 'mag', label: 'Magnitude' },
    { key: 'place', label: 'Location' },
    { key: 'depth', label: 'Depth (km)' },
    { key: 'time', label: 'Time' },
    { key: 'link', label: 'Details' },
  ];

  cols.forEach(({ key, label }) => {
    const th = document.createElement('th');
    th.scope = 'col';
    if (key !== 'link') {
      th.dataset.sortKey = key;
      th.className = 'sortable';
      if (sortKey === key) {
        th.classList.add('sorted');
        th.setAttribute('aria-sort', sortDir === 'asc' ? 'ascending' : 'descending');
        th.textContent = `${label} ${sortDir === 'asc' ? '▲' : '▼'}`;
      } else {
        th.textContent = label;
        th.setAttribute('aria-sort', 'none');
      }
    } else {
      th.textContent = label;
    }
    headerRow.appendChild(th);
  });

  thead.appendChild(headerRow);
  table.appendChild(thead);

  const tbody = document.createElement('tbody');

  sorted.slice(0, 100).forEach((feature) => {
    const {
      mag, place, time, url,
    } = feature.properties;
    const depth = feature.geometry?.coordinates?.[2] ?? 'N/A';
    const cls = severityClass(mag ?? 0);

    const tr = document.createElement('tr');
    tr.className = `eq-row eq-row--${cls}`;

    const magCell = document.createElement('td');
    magCell.className = 'eq-mag';
    const magPill = document.createElement('span');
    magPill.className = `pill pill--${cls}`;
    magPill.textContent = mag != null ? mag.toFixed(1) : '?';
    magCell.appendChild(magPill);

    const placeCell = document.createElement('td');
    placeCell.textContent = place ?? 'Unknown';

    const depthCell = document.createElement('td');
    depthCell.textContent = typeof depth === 'number' ? depth.toFixed(1) : depth;

    const timeCell = document.createElement('td');
    timeCell.textContent = time ? formatTime(time) : '—';

    const linkCell = document.createElement('td');
    if (url) {
      const a = document.createElement('a');
      a.href = url;
      a.target = '_blank';
      a.rel = 'noopener noreferrer';
      a.textContent = 'View →';
      a.className = 'eq-link';
      linkCell.appendChild(a);
    } else {
      linkCell.textContent = '—';
    }

    tr.append(magCell, placeCell, depthCell, timeCell, linkCell);
    tbody.appendChild(tr);
  });

  table.appendChild(tbody);
  return table;
}

export default async function decorate(block) {
  // Read optional config from authored table rows
  const configRow = block.querySelector(':scope > div:first-child > div');
  const apiUrl = configRow?.textContent?.startsWith('http')
    ? configRow.textContent.trim()
    : USGS_URL;

  block.innerHTML = '';

  // Section header
  const header = document.createElement('div');
  header.className = 'eq-header';
  header.innerHTML = `
    <h2 class="eq-title"><span aria-hidden="true">🌍</span> Earthquakes — Last 24 Hours</h2>
    <span class="eq-count"></span>
  `;
  block.appendChild(header);

  // Skeleton while loading
  const skeleton = buildSkeleton();
  block.appendChild(skeleton);

  let currentSort = { key: 'mag', dir: 'desc' };

  async function fetchAndRender() {
    const { data, error, stale } = await apiFetch(apiUrl, {
      ttlMs: 5 * 60 * 1000, // 5 min
    });

    // Remove skeleton / previous table
    block.querySelector('.eq-skeleton')?.remove();
    block.querySelector('.eq-table-wrapper')?.remove();
    block.querySelector('.block-error')?.remove();

    if (error && !data) {
      const errEl = document.createElement('div');
      errEl.className = 'block-error';
      errEl.textContent = `Failed to load earthquake data: ${error}`;
      block.appendChild(errEl);

      emitDashboardEvent('dashboard:dataReady', {
        source: 'earthquakes', counts: null, error,
      });
      return;
    }

    if (stale) {
      const warn = document.createElement('div');
      warn.className = 'stale-warning';
      warn.textContent = '⚠ Showing cached data — live fetch failed.';
      block.appendChild(warn);
    }

    const features = data?.features ?? [];

    // Update count badge
    const countEl = block.querySelector('.eq-count');
    if (countEl) countEl.textContent = `${features.length} events`;

    // Compute severity counts for summary block
    const counts = features.reduce(
      (acc, f) => {
        const cls = severityClass(f.properties.mag ?? 0);
        acc[cls] = (acc[cls] || 0) + 1;
        return acc;
      },
      { critical: 0, warn: 0, ok: 0 },
    );

    emitDashboardEvent('dashboard:dataReady', { source: 'earthquakes', counts, error: null });
    emitDashboardEvent('dashboard:refresh:complete', { source: 'earthquakes' });

    // Render sortable table
    const wrapper = document.createElement('div');
    wrapper.className = 'eq-table-wrapper';

    const table = buildTable(features, currentSort.key, currentSort.dir);

    // Sort click handler
    table.querySelector('thead').addEventListener('click', (e) => {
      const th = e.target.closest('th[data-sort-key]');
      if (!th) return;
      const key = th.dataset.sortKey;
      if (currentSort.key === key) {
        currentSort.dir = currentSort.dir === 'asc' ? 'desc' : 'asc';
      } else {
        currentSort = { key, dir: 'desc' };
      }
      const newTable = buildTable(features, currentSort.key, currentSort.dir);
      newTable.querySelector('thead').addEventListener('click', table.querySelector('thead').onclick);
      wrapper.replaceChild(newTable, wrapper.querySelector('table'));
    });

    wrapper.appendChild(table);
    block.appendChild(wrapper);
  }

  await fetchAndRender();

  document.addEventListener('dashboard:refresh', fetchAndRender);
}
