/**
 * eonet-events block
 *
 * Fetches open events from NASA EONET v3 API and renders a card grid
 * grouped by event category.
 *
 * API: https://eonet.gsfc.nasa.gov/api/v3/events?status=open&limit=50
 */

import { apiFetch, emitDashboardEvent } from '../../scripts/api-client.js';

const EONET_URL = 'https://eonet.gsfc.nasa.gov/api/v3/events?status=open&limit=50';

/** Category icon map */
const CATEGORY_ICONS = {
  Wildfires: '🔥',
  'Severe Storms': '🌀',
  Volcanoes: '🌋',
  Floods: '🌊',
  'Sea and Lake Ice': '🧊',
  Earthquakes: '🌍',
  Landslides: '⛰',
  Drought: '☀️',
  'Dust and Haze': '🌫',
  'Snow (heavy)': '❄️',
  'Temperature Extremes': '🌡',
  'Water Color': '💧',
};

function getCategoryIcon(title) {
  const found = Object.entries(CATEGORY_ICONS)
    .find(([key]) => title.toLowerCase().includes(key.toLowerCase()));
  return found ? found[1] : '🌐';
}

/** Group events array by their first category */
function groupByCategory(events) {
  const groups = {};
  events.forEach((ev) => {
    const cat = ev.categories?.[0]?.title ?? 'Other';
    if (!groups[cat]) groups[cat] = [];
    groups[cat].push(ev);
  });
  return groups;
}

/** Format an EONET geometry date */
function formatDate(dateStr) {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString(undefined, {
    year: 'numeric', month: 'short', day: 'numeric',
  });
}

/** Build a single event card */
function buildCard(event) {
  const card = document.createElement('article');
  card.className = 'eonet-card';

  const title = document.createElement('h3');
  title.className = 'eonet-card-title';
  title.textContent = event.title;

  const meta = document.createElement('div');
  meta.className = 'eonet-card-meta';

  const latestGeom = event.geometry?.[event.geometry.length - 1];
  const dateEl = document.createElement('span');
  dateEl.className = 'eonet-card-date';
  dateEl.textContent = formatDate(latestGeom?.date);

  const sourceEl = document.createElement('span');
  sourceEl.className = 'eonet-card-source';
  const sourceLink = event.sources?.[0];
  if (sourceLink) {
    const a = document.createElement('a');
    a.href = sourceLink.url;
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
    a.textContent = sourceLink.id;
    sourceEl.appendChild(a);
  }

  meta.append(dateEl, sourceEl);

  // Coordinates detail (collapsible)
  let coordsEl = null;
  if (latestGeom?.coordinates) {
    coordsEl = document.createElement('details');
    coordsEl.className = 'eonet-card-coords';
    const summary = document.createElement('summary');
    summary.textContent = 'Coordinates';
    const coords = document.createElement('code');
    const [lon, lat] = latestGeom.coordinates;
    coords.textContent = `${lat?.toFixed(4)}, ${lon?.toFixed(4)}`;
    coordsEl.append(summary, coords);
  }

  const linkEl = document.createElement('a');
  linkEl.href = `https://eonet.gsfc.nasa.gov/api/v3/events/${event.id}`;
  linkEl.target = '_blank';
  linkEl.rel = 'noopener noreferrer';
  linkEl.className = 'eonet-card-link';
  linkEl.textContent = 'EONET details →';

  card.append(title, meta);
  if (coordsEl) card.appendChild(coordsEl);
  card.appendChild(linkEl);

  return card;
}

export default async function decorate(block) {
  block.innerHTML = '';

  // Header
  const header = document.createElement('div');
  header.className = 'eonet-header';
  header.innerHTML = `
    <h2 class="eonet-title"><span aria-hidden="true">🌀</span> NASA EONET — Active Natural Events</h2>
    <span class="eonet-count"></span>
  `;
  block.appendChild(header);

  // Skeleton
  const skeleton = document.createElement('div');
  skeleton.className = 'eonet-skeleton';
  for (let i = 0; i < 6; i += 1) {
    const s = document.createElement('div');
    s.className = 'skeleton';
    s.style.height = '120px';
    s.style.borderRadius = '8px';
    skeleton.appendChild(s);
  }
  block.appendChild(skeleton);

  async function fetchAndRender() {
    const { data, error, stale } = await apiFetch(EONET_URL, {
      ttlMs: 15 * 60 * 1000, // 15 min
    });

    block.querySelector('.eonet-skeleton')?.remove();
    block.querySelector('.eonet-content')?.remove();
    block.querySelector('.block-error')?.remove();

    if (error && !data) {
      const errEl = document.createElement('div');
      errEl.className = 'block-error';
      errEl.textContent = `Failed to load EONET events: ${error}`;
      block.appendChild(errEl);
      emitDashboardEvent('dashboard:dataReady', { source: 'eonet', counts: null, error });
      return;
    }

    const events = data?.events ?? [];
    const countEl = block.querySelector('.eonet-count');
    if (countEl) countEl.textContent = `${events.length} open events`;

    // Compute counts
    const counts = { critical: 0, warn: events.length, ok: 0 };
    const CRITICAL_CATS = ['wildfires', 'severe storms', 'volcanoes', 'floods'];
    events.forEach((ev) => {
      const cat = ev.categories?.[0]?.title?.toLowerCase() ?? '';
      if (CRITICAL_CATS.some((c) => cat.includes(c))) counts.critical += 1;
    });
    counts.warn = events.length - counts.critical;

    emitDashboardEvent('dashboard:dataReady', { source: 'eonet', counts, error: null });

    const content = document.createElement('div');
    content.className = 'eonet-content';

    if (stale) {
      const warn = document.createElement('div');
      warn.className = 'stale-warning';
      warn.textContent = '⚠ Showing cached data — live fetch failed.';
      content.appendChild(warn);
    }

    const groups = groupByCategory(events);

    Object.entries(groups).forEach(([category, catEvents]) => {
      const section = document.createElement('section');
      section.className = 'eonet-category-section';

      const catHeader = document.createElement('h3');
      catHeader.className = 'eonet-category-heading';
      const icon = getCategoryIcon(category);
      catHeader.innerHTML = `<span aria-hidden="true">${icon}</span> ${category} <span class="eonet-category-count">(${catEvents.length})</span>`;

      const grid = document.createElement('div');
      grid.className = 'eonet-grid';

      catEvents.forEach((ev) => grid.appendChild(buildCard(ev)));

      section.append(catHeader, grid);
      content.appendChild(section);
    });

    block.appendChild(content);
  }

  await fetchAndRender();
  document.addEventListener('dashboard:refresh', fetchAndRender);
}
