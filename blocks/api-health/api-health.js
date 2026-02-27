/**
 * api-health block
 *
 * Probes every external API used by the dashboard and renders a
 * Service-Status-Dashboard UI (reference design) with:
 *   - Page title + Refresh button
 *   - Summary stat cards  (Operational / Degraded / Down)
 *   - Filter pills        (All / External / Operational / Degraded / Down)
 *   - Service cards grid  (status dot, type, status label, metrics, URL)
 *
 * APIs checked
 *   1. USGS Earthquake Feed   https://earthquake.usgs.gov/…/all_day.geojson
 *   2. NASA EONET Events      https://eonet.gsfc.nasa.gov/api/v3/events?status=open&limit=1
 *   3. Open-Meteo Weather     https://api.open-meteo.com/v1/forecast
 */

/* ── API registry ─────────────────────────────────────────────────────────── */
const APIS = [
  {
    id: 'usgs',
    name: 'USGS Earthquake Feed',
    type: 'External',
    url: 'https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_day.geojson',
    parse: 'json',
    validate: (d) => Array.isArray(d?.features),
  },
  {
    id: 'eonet',
    name: 'NASA EONET Events',
    type: 'External',
    url: 'https://eonet.gsfc.nasa.gov/api/v3/events?status=open&limit=1',
    parse: 'json',
    validate: (d) => Array.isArray(d?.events),
  },
  {
    id: 'openmeteo',
    name: 'Open-Meteo Weather API',
    type: 'External',
    url: 'https://api.open-meteo.com/v1/forecast?latitude=52.52&longitude=13.41&current_weather=true',
    parse: 'json',
    validate: (d) => d?.current_weather != null,
  },
];

const TIMEOUT_MS = 10_000;

/* ── Status constants ─────────────────────────────────────────────────────── */
const S_OK = 'operational';
const S_WARN = 'degraded';
const S_DOWN = 'down';

/* ── Probe one API ────────────────────────────────────────────────────────── */
async function probeApi(api) {
  const start = Date.now();
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  const checkedAt = new Date();

  try {
    const res = await fetch(api.url, { signal: ctrl.signal, cache: 'no-store' });
    clearTimeout(timer);
    const latencyMs = Date.now() - start;

    if (!res.ok) {
      return {
        id: api.id,
        status: S_DOWN,
        statusCode: res.status,
        latencyMs,
        checkedAt,
        message: `HTTP ${res.status} ${res.statusText}`,
      };
    }

    let data = null;
    try { data = api.parse === 'json' ? await res.json() : await res.text(); } catch {
      return {
        id: api.id,
        status: S_DOWN,
        statusCode: res.status,
        latencyMs,
        checkedAt,
        message: 'Failed to parse response',
      };
    }


    if (api.validate && !api.validate(data)) {
      return {
        id: api.id,
        status: S_WARN,
        statusCode: res.status,
        latencyMs,
        checkedAt,
        message: 'Unexpected response shape',
      };
    }

    return {
      id: api.id,
      status: S_OK,
      statusCode: res.status,
      latencyMs,
      checkedAt,
      message: 'Operational',
    };
  } catch (err) {
    clearTimeout(timer);
    return {
      id: api.id,
      status: S_DOWN,
      statusCode: null,
      latencyMs: Date.now() - start,
      checkedAt,
      message: err.name === 'AbortError' ? 'Request timed out' : err.message,
    };
  }
}

/* ── Helpers ──────────────────────────────────────────────────────────────── */
function fmtLatency(ms) {
  return ms == null ? 'N/A' : `${ms}ms`;
}

function fmtRelative(date) {
  if (!date) return '—';
  const secs = Math.round((Date.now() - date.getTime()) / 1000);
  if (secs < 10) return 'just now';
  if (secs < 60) return `${secs}s ago`;
  const mins = Math.round(secs / 60);
  if (mins < 60) return `${mins} minute${mins !== 1 ? 's' : ''} ago`;
  const hrs = Math.round(mins / 60);
  return `${hrs} hour${hrs !== 1 ? 's' : ''} ago`;
}

/* ── SVG icons ────────────────────────────────────────────────────────────── */
/* eslint-disable quotes */
const SVG = {
  globe: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>',
  db: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M3 5v14c0 1.66 4.03 3 9 3s9-1.34 9-3V5"/><path d="M3 12c0 1.66 4.03 3 9 3s9-1.34 9-3"/></svg>',
  check: '<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"/><polyline points="9 12 11 14 15 10"/></svg>',
  warn: '<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>',
  xcirc: '<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>',
  pulse: '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>',
  clock: '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>',
  filter: '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/></svg>',
  refresh: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg>',
};
/* eslint-enable quotes */

/* ── Build summary stat card ──────────────────────────────────────────────── */
function buildStatCard(status) {
  const cfg = {
    [S_OK]: { label: 'Operational', icon: SVG.check, mod: 'ok' },
    [S_WARN]: { label: 'Degraded', icon: SVG.warn, mod: 'warn' },
    [S_DOWN]: { label: 'Down', icon: SVG.xcirc, mod: 'down' },
  }[status];

  const el = document.createElement('div');
  el.className = `ah-stat ah-stat--${cfg.mod}`;
  el.innerHTML = `
    <div class="ah-stat__icon">${cfg.icon}</div>
    <div class="ah-stat__body">
      <strong class="ah-stat__count" data-stat="${status}">0</strong>
      <span class="ah-stat__label">${cfg.label}</span>
    </div>
  `;
  return el;
}

/* ── Build service card ───────────────────────────────────────────────────── */
function buildServiceCard(api) {
  const icon = api.type === 'Internal' ? SVG.db : SVG.globe;
  const card = document.createElement('article');
  card.className = 'ah-card ah-card--loading';
  card.dataset.id = api.id;
  card.dataset.type = api.type.toLowerCase();

  card.innerHTML = `
    <div class="ah-card__head">
      <div class="ah-card__title-group">
        <span class="ah-card__type-icon">${icon}</span>
        <div>
          <h3 class="ah-card__name">${api.name}</h3>
          <span class="ah-card__type-badge">${api.type.toUpperCase()}</span>
        </div>
      </div>
      <span class="ah-card__dot" aria-hidden="true"></span>
    </div>
    <p class="ah-card__status-label">Checking…</p>
    <ul class="ah-card__metrics" aria-label="Metrics">
      <li class="ah-metric">
        <span class="ah-metric__key">Status Code</span>
        <strong class="ah-metric__val ah-metric__code">—</strong>
      </li>
      <li class="ah-metric">
        <span class="ah-metric__key">${SVG.pulse} Response Time</span>
        <strong class="ah-metric__val ah-metric__latency">—</strong>
      </li>
      <li class="ah-metric">
        <span class="ah-metric__key">${SVG.clock} Last Checked</span>
        <strong class="ah-metric__val ah-metric__time">—</strong>
      </li>
    </ul>
    <div class="ah-card__url">${api.url}</div>
  `;
  return card;
}

/* ── Update service card after probe ─────────────────────────────────────── */
function updateCard(card, result) {
  const map = {
    [S_OK]: { label: 'Operational', mod: 'ok' },
    [S_WARN]: { label: 'Degraded', mod: 'warn' },
    [S_DOWN]: { label: 'Down', mod: 'down' },
  };
  const cfg = map[result.status] ?? { label: result.status, mod: 'down' };

  card.classList.remove('ah-card--loading', 'ah-card--ok', 'ah-card--warn', 'ah-card--down');
  card.classList.add(`ah-card--${cfg.mod}`);
  card.dataset.status = result.status;

  card.querySelector('.ah-card__status-label').textContent = cfg.label;
  card.querySelector('.ah-metric__code').textContent = result.statusCode ?? 'N/A';
  card.querySelector('.ah-metric__latency').textContent = fmtLatency(result.latencyMs);
  card.querySelector('.ah-metric__time').textContent = fmtRelative(result.checkedAt);
  card.dataset.checkedAt = result.checkedAt?.getTime() ?? '';
}

/* ── Main decorate ────────────────────────────────────────────────────────── */
export default async function decorate(block) {
  block.innerHTML = '';

  /* ── Page header ── */
  const header = document.createElement('div');
  header.className = 'ah-header';
  header.innerHTML = `
    <div class="ah-header__left">
      <h2 class="ah-header__title">Service Status Dashboard</h2>
      <p class="ah-header__subtitle">Monitor all internal and external services in real-time</p>
    </div>
    <button class="ah-refresh-btn" aria-label="Refresh all API checks">
      ${SVG.refresh} Refresh
    </button>
  `;
  block.appendChild(header);

  /* ── Stat cards row ── */
  const statsRow = document.createElement('div');
  statsRow.className = 'ah-stats';
  statsRow.setAttribute('aria-live', 'polite');
  const statEls = {};
  [S_OK, S_WARN, S_DOWN].forEach((s) => {
    const el = buildStatCard(s);
    statsRow.appendChild(el);
    statEls[s] = el;
  });
  block.appendChild(statsRow);

  /* ── Filter bar ── */
  const filterBar = document.createElement('div');
  filterBar.className = 'ah-filters';
  filterBar.setAttribute('role', 'group');
  filterBar.setAttribute('aria-label', 'Filter services');
  filterBar.innerHTML = `<span class="ah-filters__label">${SVG.filter} Filter:</span>`;

  const FILTERS = ['All', 'External', 'Operational', 'Degraded', 'Down'];
  let activeFilter = 'All';

  FILTERS.forEach((f) => {
    const btn = document.createElement('button');
    btn.className = `ah-filter${f === 'All' ? ' ah-filter--active' : ''}`;
    btn.dataset.filter = f;
    btn.textContent = f;
    btn.setAttribute('aria-pressed', String(f === 'All'));
    filterBar.appendChild(btn);
  });
  block.appendChild(filterBar);

  /* ── Grid ── */
  const grid = document.createElement('div');
  grid.className = 'ah-grid';
  const cardMap = {};
  APIS.forEach((api) => {
    const card = buildServiceCard(api);
    grid.appendChild(card);
    cardMap[api.id] = card;
  });
  block.appendChild(grid);

  /* ── Filter logic ── */
  function applyFilter(f) {
    activeFilter = f;
    filterBar.querySelectorAll('.ah-filter').forEach((btn) => {
      const on = btn.dataset.filter === f;
      btn.classList.toggle('ah-filter--active', on);
      btn.setAttribute('aria-pressed', String(on));
    });

    const statusForFilter = { Operational: S_OK, Degraded: S_WARN, Down: S_DOWN };

    grid.querySelectorAll('.ah-card').forEach((card) => {
      let show = true;
      if (f === 'External') show = card.dataset.type === 'external';
      else if (statusForFilter[f]) show = card.dataset.status === statusForFilter[f];
      card.hidden = !show;
    });
  }

  filterBar.addEventListener('click', (e) => {
    const btn = e.target.closest('.ah-filter');
    if (btn) applyFilter(btn.dataset.filter);
  });

  /* ── Health check run ── */
  async function runChecks() {
    // Reset cards to loading
    Object.values(cardMap).forEach((c) => {
      c.classList.remove('ah-card--ok', 'ah-card--warn', 'ah-card--down');
      c.classList.add('ah-card--loading');
      c.querySelector('.ah-card__status-label').textContent = 'Checking…';
      c.querySelector('.ah-metric__code').textContent = '—';
      c.querySelector('.ah-metric__latency').textContent = '—';
      c.querySelector('.ah-metric__time').textContent = '—';
      delete c.dataset.status;
      delete c.dataset.checkedAt;
    });

    // Reset stat counts
    [S_OK, S_WARN, S_DOWN].forEach((s) => {
      statEls[s].querySelector(`[data-stat="${s}"]`).textContent = '0';
    });

    const results = await Promise.all(APIS.map(probeApi));
    const counts = { [S_OK]: 0, [S_WARN]: 0, [S_DOWN]: 0 };

    results.forEach((r) => {
      updateCard(cardMap[r.id], r);
      counts[r.status] = (counts[r.status] ?? 0) + 1;
    });

    [S_OK, S_WARN, S_DOWN].forEach((s) => {
      statEls[s].querySelector(`[data-stat="${s}"]`).textContent = counts[s] ?? 0;
    });

    applyFilter(activeFilter);
  }

  /* ── Live "Last Checked" tick every 30 s ── */
  setInterval(() => {
    grid.querySelectorAll('.ah-card[data-checked-at]').forEach((card) => {
      const ts = parseInt(card.dataset.checkedAt, 10);
      if (!ts) return;
      const el = card.querySelector('.ah-metric__time');
      if (el) el.textContent = fmtRelative(new Date(ts));
    });
  }, 30_000);

  block.querySelector('.ah-refresh-btn').addEventListener('click', runChecks);

  await runChecks();
}
