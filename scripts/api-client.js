/**
 * api-client.js — Shared API fetch utility for the Service Status Dashboard
 *
 * Features:
 *  - sessionStorage cache with configurable TTL per endpoint
 *  - Graceful error handling: returns { data, error, stale } contract
 *  - AbortController timeout (default 10 s)
 *  - Exponential back-off retry (max 2 retries)
 *  - Respects Cache-Control max-age from response headers
 */

const DEFAULT_TIMEOUT_MS = 10_000;
const DEFAULT_MAX_RETRIES = 2;
const CACHE_PREFIX = 'dashboard_cache_';

/**
 * Read a cached entry from sessionStorage.
 * @param {string} key
 * @returns {{ data: any, cachedAt: number, ttl: number } | null}
 */
function readCache(key) {
  try {
    const raw = sessionStorage.getItem(CACHE_PREFIX + key);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

/**
 * Write a response to sessionStorage.
 * @param {string} key
 * @param {any} data
 * @param {number} ttlMs
 */
function writeCache(key, data, ttlMs) {
  try {
    sessionStorage.setItem(
      CACHE_PREFIX + key,
      JSON.stringify({ data, cachedAt: Date.now(), ttl: ttlMs }),
    );
  } catch {
    /* sessionStorage full — silently skip */
  }
}

/**
 * Parse Cache-Control max-age header into milliseconds.
 * @param {Response} response
 * @returns {number | null}
 */
function parseCacheControlMaxAge(response) {
  const cc = response.headers.get('cache-control') || '';
  const match = cc.match(/max-age=(\d+)/);
  return match ? parseInt(match[1], 10) * 1000 : null;
}

/**
 * Sleep helper for back-off.
 * @param {number} ms
 */
const sleep = (ms) => new Promise((r) => { setTimeout(r, ms); });

/**
 * Core fetch with timeout, retry, and cache.
 *
 * @param {string} url
 * @param {object} [options]
 * @param {number} [options.ttlMs=300_000]        Cache TTL in ms (default 5 min)
 * @param {number} [options.timeoutMs=10_000]     Fetch timeout
 * @param {number} [options.maxRetries=2]         Max retry attempts
 * @param {'json'|'text'|'csv'} [options.parse='json'] Response format
 * @param {RequestInit} [options.fetchInit]       Extra fetch options
 * @returns {Promise<{ data: any|null, error: string|null, stale: boolean }>}
 */
export async function apiFetch(url, options = {}) {
  const {
    ttlMs = 300_000,
    timeoutMs = DEFAULT_TIMEOUT_MS,
    maxRetries = DEFAULT_MAX_RETRIES,
    parse = 'json',
    fetchInit = {},
  } = options;

  const cacheKey = url;
  const cached = readCache(cacheKey);

  // Return fresh cache immediately
  if (cached && Date.now() - cached.cachedAt < cached.ttl) {
    return { data: cached.data, error: null, stale: false };
  }

  async function attempt(remaining, lastError) {
    if (remaining < 0) {
      // All retries failed — return stale data if available
      if (cached) {
        // eslint-disable-next-line no-console
        console.warn(`[api-client] Using stale cache for ${url}:`, lastError);
        return { data: cached.data, error: lastError, stale: true };
      }
      return { data: null, error: lastError, stale: false };
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(url, { ...fetchInit, signal: controller.signal });
      clearTimeout(timeoutId);

      if (!response.ok) {
        const err = `HTTP ${response.status} ${response.statusText}`;
        if (remaining > 0) {
          await sleep(500 * 2 ** (maxRetries - remaining));
        }
        return attempt(remaining - 1, err);
      }

      let data;
      if (parse === 'json') {
        data = await response.json();
      } else if (parse === 'text' || parse === 'csv') {
        data = await response.text();
      }

      // Prefer server's Cache-Control max-age over our default TTL
      const serverTtl = parseCacheControlMaxAge(response);
      writeCache(cacheKey, data, serverTtl ?? ttlMs);

      return { data, error: null, stale: false };
    } catch (err) {
      clearTimeout(timeoutId);
      const errMsg = err.name === 'AbortError' ? 'Request timed out' : err.message;

      if (remaining > 0) {
        await sleep(500 * 2 ** (maxRetries - remaining)); // 500 ms, 1 000 ms
      }
      return attempt(remaining - 1, errMsg);
    }
  }

  return attempt(maxRetries, null);
}

/**
 * Parse a FIRMS-style CSV string into an array of objects.
 * The first row is treated as the header.
 * @param {string} csv
 * @returns {object[]}
 */
export function parseCsv(csv) {
  const lines = csv.trim().split('\n');
  if (lines.length < 2) return [];
  const headers = lines[0].split(',').map((h) => h.trim());
  return lines.slice(1).map((line) => {
    const values = line.split(',');
    return Object.fromEntries(headers.map((h, i) => [h, values[i]?.trim() ?? '']));
  });
}

/**
 * Emit a custom event on document for cross-block communication.
 * @param {string} name  e.g. 'dashboard:dataReady'
 * @param {any} detail
 */
export function emitDashboardEvent(name, detail) {
  document.dispatchEvent(new CustomEvent(name, { detail, bubbles: true }));
}

/**
 * Show a brief toast notification.
 * @param {string} message
 * @param {number} [durationMs=3000]
 */
export function showToast(message, durationMs = 3000) {
  let toast = document.querySelector('.dashboard-toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.className = 'dashboard-toast';
    toast.setAttribute('role', 'status');
    toast.setAttribute('aria-live', 'polite');
    document.body.appendChild(toast);
  }
  toast.textContent = message;
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), durationMs);
}
