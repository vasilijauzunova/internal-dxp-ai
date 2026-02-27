/**
 * dashboard-hero block
 *
 * Authored table structure:
 * | dashboard-hero          |
 * | Title text              |
 * | Subtitle / description  |
 *
 * Renders a hero banner with title, subtitle and a live "last updated" timestamp.
 * Listens for 'dashboard:dataReady' events to update the timestamp.
 */

export default function decorate(block) {
  const rows = [...block.querySelectorAll(':scope > div')];

  const title = rows[0]?.querySelector('div')?.textContent?.trim()
    || 'Service Status Dashboard';
  const subtitle = rows[1]?.querySelector('div')?.textContent?.trim()
    || 'Real-time global earthquake, natural events & wildfire monitoring';

  block.innerHTML = '';

  const hero = document.createElement('div');
  hero.className = 'hero-inner';

  const heading = document.createElement('h1');
  heading.className = 'hero-title';
  heading.textContent = title;

  const desc = document.createElement('p');
  desc.className = 'hero-subtitle';
  desc.textContent = subtitle;

  const meta = document.createElement('div');
  meta.className = 'hero-meta';

  const statusDot = document.createElement('span');
  statusDot.className = 'hero-status-dot loading';
  statusDot.setAttribute('aria-hidden', 'true');

  const lastUpdated = document.createElement('span');
  lastUpdated.className = 'hero-last-updated';
  lastUpdated.textContent = 'Loading data…';

  const refreshBtn = document.createElement('button');
  refreshBtn.className = 'hero-refresh-btn';
  refreshBtn.setAttribute('aria-label', 'Refresh dashboard data');
  refreshBtn.innerHTML = '↻ Refresh';
  refreshBtn.addEventListener('click', () => {
    document.dispatchEvent(new CustomEvent('dashboard:refresh'));
  });

  meta.append(statusDot, lastUpdated, refreshBtn);
  hero.append(heading, desc, meta);
  block.appendChild(hero);

  // Track how many data sources have reported in
  let readyCount = 0;
  const TOTAL_SOURCES = 3;

  function onDataReady() {
    readyCount += 1;
    const now = new Date();
    lastUpdated.textContent = `Last updated: ${now.toUTCString()}`;
    if (readyCount >= TOTAL_SOURCES) {
      statusDot.classList.remove('loading');
      statusDot.classList.add('ok');
    }
  }

  function onRefresh() {
    readyCount = 0;
    statusDot.className = 'hero-status-dot loading';
    lastUpdated.textContent = 'Refreshing…';
  }

  document.addEventListener('dashboard:dataReady', onDataReady);
  document.addEventListener('dashboard:refresh', onRefresh);
}
