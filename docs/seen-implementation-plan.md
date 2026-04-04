# Seen — Complete Implementation Plan

> *Hard work gets you results. Visibility gets you promoted.*

---

## Product Identity

| | |
|---|---|
| **Name** | Seen |
| **Tagline** | visibility engine |
| **Thesis** | Hard work alone does not get you promoted. Being seen for the right work, at the right level, does. |
| **Target user** | Engineers and EMs on a staff or management track |
| **Install model** | Local desktop app, zero cloud dependency, one-click installer |
| **OSS model** | MIT license, contributor-friendly, SaaS-ready architecture |

---

## Decisions Locked

| Decision | Choice | Rationale |
|---|---|---|
| Framework | Electron + React + TypeScript | Non-technical install = .dmg/.exe, not a URL |
| Previous tool | Streamlit retired | Variety across portfolio, Streamlit not OSS-friendly |
| Theme | Warm Ivory + Deep Navy + Amber Gold | Leadership-coded, premium, not a dev tool |
| Nav label (prepare) | **Amplify** | Matches visibility thesis — making work louder |
| Product name | **Seen** | One word, cold-audience clear, thesis-preserving |
| AI default | Ollama (local) | Privacy-first, Anthropic via env flag |
| Review cadence | Quarterly | Maps to real promo cycles |
| SaaS path | Deferred, architecture supports it | Start local, unlock if community asks |

---

## What Changed from Visibility Engine

| Feature | Decision | Reason |
|---|---|---|
| Quick Log | Keep | Core daily loop |
| Goal buckets | Reimagined | Hardcoded labels replaced with promo-criteria language |
| 1:1 Prep | Removed | Covered by Ask tab in Amplify |
| Brag doc | Keep | Core differentiator |
| Annual review | Replaced with Quarterly Review | Maps to real org cycles, useful with less data |
| Shoutouts page | Removed | Becomes an entry type, not a separate screen |
| Archive page | Removed | Automatic (90-day threshold), surfaced in Settings |
| Export page | Removed | Moved to Settings panel |
| Dashboard | Reimagined | Metrics-first, not a list |
| Streamlit | Removed | Entire reason for rebuild |
| Fraunces + Plus Jakarta Sans | Keep | Port to Tailwind CSS variables |
| Slate/sage/ivory palette | Replaced | New: Warm Ivory + Deep Navy + Amber Gold |

---

## Goal Buckets (Promo-Criteria Language)

These replace the old generic labels. Each maps directly to how staff and EM reviews are written.

| New Bucket | Old Label | Promo Document Equivalent |
|---|---|---|
| Technical Scope & Influence | Technical Leadership | Breadth, architectural decisions, cross-team technical impact |
| People Impact | Team Multiplier | Mentorship, unblocking, career development of others |
| Leadership & Org Health | EM Track | Process improvements, culture, team health |
| Innovation & Bets | AI & Innovation | Risk-taking, new approaches, forward-looking work |
| External Presence | Personal Brand | Talks, writing, community, recruiting signal |
| Execution & Delivery | Reliability & Scale | Shipping, reliability, concrete outcomes |

---

## Information Architecture

Five screens. No more, no less.

```
Home
├── Personalized greeting + date
├── Two metric cards: this week, Q total
├── Recent entries feed
└── Floating Quick Log button (bottom right)

Log
├── Entry type selector: Win / Blocker Resolved / Shoutout / Learning / Delivery
├── Free-text entry field
├── AI bucket suggestion (inline, overrideable)
├── Goal bucket selector (six buckets)
├── Impact level: Team / Org / Cross-org
└── Save button

Amplify
├── Brag Doc (quarter + month picker → generate monthly brag statements)
├── Quarterly Review (Q1–Q4 + year → narrative self-assessment)
└── Ask (chat with AI using full entry context)

Insights [v2 only]
├── Entry volume by bucket over time
├── Impact level distribution
└── Nudges: "No Technical Scope entries in 3 weeks"

Settings
├── Profile: name, role, manager name
├── AI provider toggle: Ollama / Anthropic + model name
├── Data location display
├── Archive threshold (default 90 days)
├── Export: JSON + Markdown
└── First-run onboarding trigger (reset)
```

---

## Complete Technical Stack

### Application shell

```
Electron (latest)
├── Main process (Node.js)
│   ├── better-sqlite3          Database, runs in main process only
│   ├── electron-builder        Packages .dmg / .exe / .deb
│   └── electron-updater        Auto-update on new releases
└── Renderer process (React)
    ├── React 18 + TypeScript
    ├── Vite                    Build tooling + HMR in dev
    ├── React Router v6         Screen navigation
    ├── shadcn/ui + Tailwind    Components + design system
    ├── Zustand                 Lightweight global state
    ├── TanStack Query          Async data fetching via IPC
    └── date-fns                Date formatting, no heavy libs
```

### AI layer (main process only)

```
ai/
├── provider.ts         Switches Ollama vs Anthropic (SDK-based)
└── prompts/
    ├── brag-doc.ts     Monthly brag statements + quarterly brag doc
    ├── quarterly.ts    Quarterly review narrative prompt
    ├── ask.ts          Chat system prompt (normal + brag mode)
    ├── suggest.ts      Auto-suggest goal bucket on new entry
    └── correct.ts      Spell / grammar correction
```

### Database schema (SQLite via IPC)

```sql
-- Core entries
CREATE TABLE entries (
  id           TEXT PRIMARY KEY,
  content      TEXT NOT NULL,
  entry_type   TEXT NOT NULL,   -- win | blocker | shoutout | learning | delivery
  bucket       TEXT NOT NULL,
  impact_level TEXT NOT NULL,   -- team | org | cross-org
  created_at   TEXT NOT NULL,
  archived_at  TEXT,
  deleted_at   TEXT
);

-- User-editable buckets
CREATE TABLE buckets (
  id                  TEXT PRIMARY KEY,
  name                TEXT NOT NULL,
  promo_criteria_hint TEXT,
  sort_order          INTEGER
);

-- AI-generated outputs
CREATE TABLE generations (
  id               TEXT PRIMARY KEY,
  type             TEXT NOT NULL,  -- brag_doc | quarterly | brag_month
  date_range_start TEXT,
  date_range_end   TEXT,
  quarter          TEXT,
  year             INTEGER,
  output           TEXT NOT NULL,
  created_at       TEXT NOT NULL
);

-- App configuration
CREATE TABLE settings (
  key   TEXT PRIMARY KEY,
  value TEXT
);
```

### IPC architecture (security boundary)

React renderer cannot touch SQLite directly. Every database call crosses the IPC bridge.

```
renderer  →  ipcRenderer.invoke('entries:create', payload)
main      →  validates input → queries SQLite → returns result
renderer  →  TanStack Query invalidates cache → UI updates
```

One pattern, applied consistently. No exceptions. Keeps renderer sandboxed.

### Design system tokens (Tailwind config)

```javascript
colors: {
  ivory:  { DEFAULT: '#f5f0e6', dark: '#ede8dc' },
  navy:   { DEFAULT: '#1a2d5a', light: '#243d73', dark: '#111e3d' },
  amber:  { DEFAULT: '#c9924a', light: '#dba968', muted: '#e8d5b0' },
  ink:    '#2a2318',
  muted:  '#8a7e6a',
  border: '#ddd5c3',
  white:  '#ffffff',
}
fonts: {
  display: ['Fraunces', 'Georgia', 'serif'],
  body:    ['Plus Jakarta Sans', 'system-ui', 'sans-serif'],
}
```

### Dev tooling

```
v0.dev          Generate React + shadcn/ui components from prompts
                design/v0-prompts.md documents all prompts used
                design/screenshots/ captures approved screen states
electron-builder Cross-platform packaging
vitest          Unit tests for AI prompts and IPC handlers
```

---

## Implementation Phases

### Phase 0 — Scaffold (3 days)

- Electron + Vite + React + TypeScript boilerplate
- Tailwind configured with Seen design tokens
- Fraunces + Plus Jakarta Sans loaded
- shadcn/ui installed and themed
- SQLite connected via IPC, migration runner on app launch
- Dev workflow: `npm run dev` opens Electron with HMR
- Folder structure committed to repo

### Phase 1 — Core loop (1 week)

- Log screen: entry form, type pills, bucket selector, impact level
- AI bucket suggestion inline on entry
- SQLite write and read end to end
- Home screen: metric cards, entry feed, Quick Log FAB
- Settings: name, role, AI provider, data path display

### Phase 2 — Amplify outputs (1 week)

- Brag Doc: quarter + month picker, streaming generation, persisted to DB
- Quarterly Review: Q + year picker, narrative generation, edit-in-place
- Ask tab: conversational AI with full entry context, brag mode
- Export: JSON and Markdown from Settings
- Auto-archive entries beyond threshold on launch

### Phase 3 — OSS readiness (1 week)

- First-run onboarding: 3 screens (name, role, AI provider)
- electron-builder configured for .dmg + .exe + .deb
- README written to spec (see below)
- GitHub repo: issue labels, CONTRIBUTING.md, MIT license
- design/ folder: screenshots + v0-prompts.md
- Insights screen stub with "coming soon" empty state

### Phase 4 — v2 hooks (plant now, build later)

- Feature flag table in SQLite, no UI yet
- Insights data model ready (no rendering)
- Annual summary prompt written, flagged off
- Docker Compose stub for future self-host path

---

## README Structure (non-negotiable order)

```
1. Hook line
2. Screenshot (full app, above the fold)
3. Why this exists (3 sentences, personal story)
4. What it does (4 bullets)
5. Tech stack badge row
6. Download (link to latest release)
7. Self-host / contribute
```

**Hook line (use this):**
> Do great work. Make sure it's Seen.

**Why section:**
> I built Seen because I kept watching talented engineers get passed over for promotion
> while doing exceptional work. The gap was never output. It was visibility.
> Seen turns your daily work notes into the evidence that gets you recognized.

---

## Year 2 Data Hygiene

| Concern | Solution |
|---|---|
| Schema changes | Migration files in `db/migrations/`, run on launch automatically |
| Old data | Soft delete from day one: `archived_at`, `deleted_at` columns |
| Data bloat | Auto-archive entries older than threshold (default 90 days, user-configurable) |
| Export before delete | JSON + Markdown export in Settings, always available |
| Feature additions | Feature flag table in SQLite, no third-party service needed |
| Contributor safety | IPC validation layer rejects malformed payloads before they reach SQLite |

---

## SaaS Migration Path (when/if)

The extraction is clean and deliberate:

| Layer | Local (now) | SaaS (future) |
|---|---|---|
| Shell | Electron | Remove, keep React |
| Frontend | React renderer | Move to Next.js App Router |
| Database | SQLite via IPC | Swap to Supabase Postgres |
| Auth | None (single user) | Supabase Auth |
| Deploy | electron-builder | Vercel |
| AI | Ollama default | Anthropic API default |

Component library, data model, and AI prompts are unchanged. Migration is a shell swap, not a rewrite.

---

## Portfolio Positioning

**For hiring managers at AI companies:**
Seen is not a journaling app. It is a personal performance intelligence system built on domain knowledge of how engineering orgs actually measure growth. The goal bucket schema maps directly to promo criteria language used at staff and EM levels. The quarterly review output is formatted for submission, not for personal notes.

**For recruiters (15-second read):**
Screenshot above the fold. One-line hook. Download link. Tech stack badges. Last commit recent. That is the entire ask.

**Interview talking point:**
"I built this tool and used it to drive my own EM track progression. Every brag doc and every piece of promo evidence in my packet came through Seen."
