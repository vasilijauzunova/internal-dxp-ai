/**
 * Cloudflare Pages Function — FIRMS API secure proxy
 * Path: /functions/api/firms.js  →  available at /api/firms
 *
 * Environment secrets required (set in CF Pages dashboard):
 *   FIRMS_API_KEY  — your NASA FIRMS MAP key
 *
 * Query params forwarded from the browser:
 *   ?days=1         (default: 1)
 *   ?source=VIIRS_SNPP_NRT  (default)
 *   ?bbox=          (optional bounding box, comma-separated: west,south,east,north)
 *
 * Returns JSON array of hotspot objects parsed from the upstream CSV.
 */

const FIRMS_BASE = 'https://firms.modaps.eosdis.nasa.gov/api/area/csv';
const DEFAULT_SOURCE = 'VIIRS_SNPP_NRT';
const DEFAULT_DAYS = '1';

/** Parse CSV string → array of objects */
function parseCsv(csv) {
  const lines = csv.trim().split('\n');
  if (lines.length < 2) return [];
  const headers = lines[0].split(',').map((h) => h.trim());
  return lines.slice(1).map((line) => {
    const values = line.split(',');
    return Object.fromEntries(headers.map((h, i) => [h, values[i]?.trim() ?? '']));
  });
}

export async function onRequestGet({ request, env }) {
  const apiKey = env.FIRMS_API_KEY;

  if (!apiKey) {
    return new Response(
      JSON.stringify({ error: 'FIRMS_API_KEY environment variable is not configured.' }),
      {
        status: 503,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      },
    );
  }

  const url = new URL(request.url);
  const days = url.searchParams.get('days') || DEFAULT_DAYS;
  const source = url.searchParams.get('source') || DEFAULT_SOURCE;
  const bbox = url.searchParams.get('bbox') || 'world';

  // Validate days param (1–10 allowed by FIRMS)
  const daysInt = Math.min(10, Math.max(1, parseInt(days, 10) || 1));

  // Build upstream FIRMS URL
  // Pattern: /api/area/csv/{MAP_KEY}/{source}/{area}/{day_range}
  const firmsUrl = `${FIRMS_BASE}/${apiKey}/${source}/${bbox}/${daysInt}`;

  try {
    const upstream = await fetch(firmsUrl, {
      cf: {
        cacheTtl: 1800, // Cache at CF edge for 30 minutes
        cacheEverything: true,
      },
    });

    if (!upstream.ok) {
      return new Response(
        JSON.stringify({ error: `FIRMS upstream error: HTTP ${upstream.status}` }),
        {
          status: upstream.status,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          },
        },
      );
    }

    const csv = await upstream.text();
    const data = parseCsv(csv);

    return new Response(JSON.stringify(data), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=1800, s-maxage=1800',
        'Access-Control-Allow-Origin': '*',
        'X-Robots-Tag': 'noindex',
      },
    });
  } catch (err) {
    return new Response(
      JSON.stringify({ error: `Proxy error: ${err.message}` }),
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      },
    );
  }
}

/** Handle CORS preflight */
export async function onRequestOptions() {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Max-Age': '86400',
    },
  });
}
