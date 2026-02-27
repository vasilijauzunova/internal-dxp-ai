# Vision Statement — Service Status Dashboard

**Project:** Service Status Dashboard
**Team:** Skopje — DXP AI Hackathon 2026
**Date:** February 2026
**Platform:** Adobe AEM Edge Delivery Services

---

## Executive Summary

The **Service Status Dashboard** is a configurable, real-time incident notification and service health monitoring platform built on Adobe AEM Edge Delivery Services. It gives any organisation a single, fast, authoritative page where stakeholders can see the live status of any collection of services — internal APIs, third-party SaaS platforms, infrastructure endpoints, or public data feeds — and be immediately informed of ongoing incidents, degraded performance, or outages.

The platform ships with three bundled example data sources (USGS Earthquakes, NASA EONET Natural Events, and NASA FIRMS Fire Hotspots) to demonstrate the pattern. In production these are replaced — or extended — with the organisation's own service endpoints.

---

## Problem Statement

When services degrade or incidents occur, stakeholders across an organisation lose time and trust in three predictable ways:

1. **No single source of truth.** Status information is scattered across monitoring tools, Slack channels, email threads, and status pages maintained by different teams on different schedules.
2. **Delayed awareness.** By the time an incident is communicated through manual channels, users have already noticed and support queues have grown.
3. **Opaque recovery signals.** Even when an incident is acknowledged, there is no clear, live signal that systems are recovering — users keep refreshing or keep filing tickets.

At the same time, organisations adopting AEM EDS need proof that the platform is not limited to marketing pages — that its edge-cached, document-driven architecture can power live operational tooling with the same performance, authoring simplicity, and governance controls that marketing teams already rely on.

---

## Vision

> **"One page. Any service. Every incident — surfaced the moment it happens, resolved the moment it ends."**

The Service Status Dashboard is a **platform-agnostic, author-configurable status layer** that any team can deploy on top of AEM EDS to expose the live health of any set of services. It decouples the *presentation and notification layer* from the *underlying monitoring infrastructure*, so engineering teams own the data sources and content authors own the communication — without either group depending on the other for routine updates.

---

## Core Concept: Services as Blocks

The fundamental design principle is **one block per service or service group**. Each block:

- Fetches live status data from a configurable endpoint (REST API, JSON feed, CSV, webhook payload)
- Normalises the response into a shared severity model: **Operational · Degraded · Partial Outage · Major Outage · Unknown**
- Emits a `dashboard:dataReady` event so the sticky **Status Summary** bar at the top of the page always reflects the aggregate health of all services
- Renders its own incident list, last-checked timestamp, and resolution state
- Degrades gracefully — showing stale data with a clear warning rather than a blank panel

New services are added by creating a new block folder. No changes to the core runtime, styles, or existing blocks are required.

---

## Goals

### 1. Universal Service Coverage
Support any service that exposes a machine-readable status signal — REST JSON, GeoJSON, CSV, XML, or a standard status-page API (Statuspage.io, Atlassian, PagerDuty, etc.). The three bundled example sources (USGS, EONET, FIRMS) demonstrate the range: structured JSON, event-stream JSON, and CSV, each with different authentication and CORS requirements.

### 2. Incident Notification at a Glance
The sticky **Status Summary** bar at the top of every page provides an immediate, always-visible aggregate view:
- A severity pill per service group (🟢 Operational / 🟡 Degraded / 🔴 Outage)
- A count of active incidents
- A last-refreshed timestamp
- A manual refresh button

Stakeholders can assess overall system health in under three seconds without scrolling.

### 3. Author-Controlled Configuration
Content authors configure which services appear, in what order, with what labels and refresh intervals — through the standard EDS authoring interface (Google Drive / SharePoint document or AEM Universal Editor). Engineers own the block code; authors own the dashboard layout and messaging. No deployment required to add, reorder, or remove a service panel.

### 4. Edge-Native Performance
Achieve a Lighthouse performance score ≥ 90 on mobile — ensuring the status page loads fast even when the services it monitors are themselves degraded:
- Vanilla ES modules, no framework, no bundler
- Lazy-loaded data blocks via `IntersectionObserver`
- Multi-layer caching: browser `sessionStorage`, Cloudflare edge, upstream `Cache-Control`
- Immutable-cached JS and CSS assets via the EDS CDN

### 5. Security by Design
Any data source that requires a private API key is accessed exclusively through a server-side Cloudflare Pages Function proxy. Keys live in platform environment secrets and never appear in client-side code, network requests, or source control. The pattern is demonstrated with the NASA FIRMS MAP key and applies to any authenticated endpoint.

### 6. Resilience and Graceful Degradation
A status page that goes blank during an incident is worse than no status page. Every block:
- Retries failed fetches with exponential back-off (up to 2 retries, 10 s timeout)
- Falls back to stale cached data with a clear "⚠ Showing cached data" banner
- Renders a friendly, actionable error state only when no data is available at all

---

## Target Audience

| Audience | Need |
|---|---|
| **Engineering & SRE teams** | A low-maintenance, high-visibility status layer that sits in front of their existing monitoring tools |
| **Content / comms authors** | The ability to update incident messaging, add services, and control the page layout without raising a ticket to engineering |
| **Internal stakeholders** | A trustworthy, always-current single page to check before escalating a support request |
| **External users / customers** | A public-facing status page that reduces inbound support volume during incidents |
| **AEM EDS practitioners** | A reference implementation of live-data, event-driven blocks on EDS without a build step |
| **Hackathon judges** | A compelling demo that proves AEM EDS can power operational tooling, not just marketing pages |

---

## Guiding Principles

### Service-agnostic by default
The dashboard has no opinion about which services matter. The core runtime, shared styles, status severity model, and cross-block event system are all generic. Every service-specific assumption lives in its own block.

### Performance over features
No framework. No bundler. No unnecessary dependencies. The page must load and show meaningful content within 2 seconds on a mid-range mobile device on a degraded connection — because that is precisely when it will be needed most.

### Authors own communication; engineers own data
The separation between block code (how data is fetched and rendered) and authored content (which services appear, with what labels, in what order) is a first-class design constraint — not an afterthought.

### Transparency of status
The dashboard never infers or interpolates service health. Every status value is derived directly from the source endpoint, with the raw source data linked. Severity thresholds are explicit and documented in each block.

### Progressive enhancement
The page renders a meaningful, readable status table in plain HTML. JavaScript layers live updates, auto-refresh, severity colouring, and the sticky summary bar on top.

### Least-privilege security
Private API keys are the only secrets in the system. They live exclusively in server-side environment variables and are never reachable by the browser, git history, or application logs.

---

## Example Data Sources (Bundled Demo)

The following three endpoints are included as a demonstration of the platform's range. They are **not** required in production deployments and can be replaced with any organisation-specific service endpoints:

| Block | Source | Endpoint type | Auth |
|---|---|---|---|
| `earthquake-feed` | USGS Earthquake Hazards Program | GeoJSON (public CORS) | None |
| `eonet-events` | NASA EONET Natural Event Tracker | JSON (public CORS) | None |
| `firms-fires` | NASA FIRMS Fire Information System | CSV (no CORS) | MAP key via CF proxy |

These three sources were chosen because they collectively demonstrate every integration pattern the platform supports: unauthenticated JSON, unauthenticated event-stream JSON, and authenticated CSV behind a server-side proxy.

---

## Success Metrics

| Metric | Target |
|---|---|
| Lighthouse Performance (mobile) | ≥ 90 |
| Lighthouse Accessibility | ≥ 95 |
| Time to First Contentful Paint | < 1.5 s |
| Time to Interactive | < 3 s |
| Status Summary visible without scroll | 100% of viewports |
| Zero API keys exposed in browser | 100% |
| Graceful degradation on fetch failure | 100% of blocks show stale or error state |
| Time to add a new service block | < 30 min for an engineer familiar with EDS |

---

## Roadmap

### v1 — Hackathon (current)
- Core EDS block runtime and shared `api-client.js` utility
- Sticky `status-summary` aggregate bar
- Three example service blocks (USGS, EONET, FIRMS)
- Cloudflare Pages Function proxy for authenticated endpoints
- Universal Editor model registration (`component-models.json`)
- `placeholders.json` infrastructure for i18n

### v2 — Production hardening
- Author-configurable service endpoint URLs (no code change needed to swap data sources)
- Webhook receiver block (ingest PagerDuty / Opsgenie / Alertmanager payloads)
- Statuspage.io / Atlassian Statuspage API adapter block
- Incident history timeline block (last N resolved incidents)
- Interactive map block (Leaflet / MapML) for geo-located service regions
- RSS/Atom feed adapter for services with no structured API

### v3 — Notifications & subscriptions
- Configurable auto-refresh interval per block (authored, not hardcoded)
- Push notification opt-in via Service Worker
- Email digest integration (AEM Campaign / Adobe Journey Optimizer)
- Multi-language support via `placeholders.json` (infrastructure already in place)

---

## Technical Architecture Summary

```
Browser
  │
  ├── EDS CDN (Fastly) ─────── HTML, JS, CSS           immutable cache
  │
  ├── Service Endpoint A ────── JSON / GeoJSON          direct CORS
  ├── Service Endpoint B ────── JSON                    direct CORS
  │
  └── Cloudflare Pages Function (/api/<service>)
          │  API_KEY (env secret, never client-side)
          └── Authenticated Endpoint ── any format → JSON   CF edge cache
```

**Stack:** Vanilla ES Modules · AEM EDS (Fastly CDN) · Cloudflare Pages Functions · No build step · No framework

---

## Relationship to AEM EDS Platform

This project is deliberately designed as a **reference implementation** for the AEM EDS community. Every pattern used — block auto-loading, document-based authoring, `helix-query.yaml` indexing, fragment composition, Universal Editor model registration via `component-models.json`, server-side proxy functions — follows published EDS conventions and is documented inline. The project can be forked as a starter template by any organisation that needs a live-data, incident-aware status dashboard on AEM EDS.

---

*Prepared by Team Skopje · DXP AI Hackathon 2026 · Valtech*


