/**
 * status-summary block  (EAGER — loads before viewport blocks)
 *
 * Listens for dashboard:dataReady events and aggregates counts into
 * a sticky summary pill row at the top of the page.
 *
 * Event detail payload expected:
 *   { source: 'earthquakes'|'eonet'|'firms', counts: { critical, warn, ok }, error: null|string }
 */

export default function decorate(block) {
  block.innerHTML = '';

  const banner = document.createElement('div');
  banner.className = 'summary-banner';
  banner.setAttribute('role', 'status');
  banner.setAttribute('aria-live', 'polite');
  banner.setAttribute('aria-label', 'Dashboard status summary');

  const heading = document.createElement('span');
  heading.className = 'summary-heading';
  heading.textContent = 'Status Overview';

  const pillsRow = document.createElement('div');
  pillsRow.className = 'summary-pills';

  // Initial placeholder pills
  const sources = [
    { id: 'earthquakes', label: 'Earthquakes', icon: '🌍' },
    { id: 'eonet', label: 'EONET Events', icon: '🌀' },
    { id: 'firms', label: 'Fire Hotspots', icon: '🔥' },
  ];

  const pillMap = {};

  sources.forEach(({ id, label, icon }) => {
    const pill = document.createElement('div');
    pill.className = 'summary-pill summary-pill--loading';
    pill.dataset.source = id;

    const iconEl = document.createElement('span');
    iconEl.className = 'pill-icon';
    iconEl.textContent = icon;
    iconEl.setAttribute('aria-hidden', 'true');

    const textEl = document.createElement('span');
    textEl.className = 'pill-text';
    textEl.textContent = `${label}: loading…`;

    pill.append(iconEl, textEl);
    pillsRow.appendChild(pill);
    pillMap[id] = { pill, textEl };
  });

  banner.append(heading, pillsRow);
  block.appendChild(banner);

  // Listen for data-ready events from each block
  document.addEventListener('dashboard:dataReady', (e) => {
    const { source, counts, error } = e.detail || {};
    if (!source || !pillMap[source]) return;

    const { pill, textEl } = pillMap[source];
    const sourceLabel = sources.find((s) => s.id === source)?.label ?? source;

    pill.classList.remove(
      'summary-pill--loading',
      'summary-pill--ok',
      'summary-pill--warn',
      'summary-pill--critical',
      'summary-pill--error',
    );

    if (error && !counts) {
      pill.classList.add('summary-pill--error');
      textEl.textContent = `${sourceLabel}: error`;
      return;
    }

    const { critical = 0, warn = 0, ok = 0 } = counts || {};
    const total = critical + warn + ok;

    if (critical > 0) {
      pill.classList.add('summary-pill--critical');
      textEl.textContent = `${sourceLabel}: ${critical} critical`;
    } else if (warn > 0) {
      pill.classList.add('summary-pill--warn');
      textEl.textContent = `${sourceLabel}: ${warn} events`;
    } else {
      pill.classList.add('summary-pill--ok');
      textEl.textContent = `${sourceLabel}: ${total} events`;
    }
  });

  // Reset on refresh
  document.addEventListener('dashboard:refresh', () => {
    Object.values(pillMap).forEach(({ pill, textEl }) => {
      pill.className = 'summary-pill summary-pill--loading';
      const label = pill.dataset.source;
      const src = sources.find((s) => s.id === label);
      textEl.textContent = `${src?.label ?? label}: loading…`;
    });
  });
}
