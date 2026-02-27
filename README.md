# Service Status Dashboard

> A real-time service health monitoring dashboard built on **Adobe AEM Edge Delivery Services** (EDS).

**Team:** Skopje — DXP AI Hackathon 2026 · Valtech  
**Platform:** AEM EDS · Cloudflare Pages Functions · Vanilla ES Modules

---

## Overview

The Service Status Dashboard is a configurable, live status page that monitors external (and internal) service endpoints and presents their health in a clean, accessible UI. It is designed as a reference implementation proving that AEM EDS can power operational tooling — not just marketing pages.

**Key capabilities:**

- 🟢 Real-time health checks with latency tracking
- 📊 Summary stat cards (Operational / Degraded / Down)
- 🔍 Filter services by type or status
- ♻️ One-click manual refresh
- ⏱ Live "last checked" timestamps that update every 30 seconds
- 🛡 Server-side proxy for authenticated APIs (keys never reach the browser)
- 📱 Fully responsive — works on mobile, tablet, and desktop
- ⚡ No framework, no bundler — vanilla ES modules for maximum performance

---

## Getting Started

### Prerequisites

- **Node.js** ≥ 18
- **AEM CLI** — `npm install -g @adobe/aem-cli`

### Installation

```bash
# Clone the repository
git clone <repo-url>
cd internal-dxp-ai

# Install dependencies
npm install
```

### Local Development

```bash
# Start the AEM EDS local dev server
npm run dev
```

This runs `aem up` and opens the site in your browser. Blocks auto-reload on file changes.

### Build

```bash
# Merge component model JSON files
npm run build
```

### Linting

```bash
# Run all linters
npm run lint

# Auto-fix lint issues
npm run lint:fix

# JS/JSON only
npm run lint:js

# CSS only
npm run lint:css
```

---

## Content Authoring

Content is authored in **Google Drive** (see `fstab.yaml`) using the standard AEM EDS document-based authoring workflow.

To add the API Health dashboard to a page:

1. Open the linked Google Drive folder
2. Create or edit a document
3. Add a table with a single cell containing `API Health`
4. Preview and publish via AEM Sidekick

The block requires **no configuration fields** — it renders automatically with all registered APIs.

---

## License

Apache License 2.0
