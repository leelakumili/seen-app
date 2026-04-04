<p align="center">
  <img src="src/assets/logo.svg" alt="Seen" width="56">
</p>

# Contributing to Seen

Seen is MIT licensed and open to contributions. This document covers what to work on, how to set up, and what to keep in mind before opening a PR.

---

## Good first contributions

- Bug fixes with a clear reproduction case
- Improvements to existing prompt modules (better output quality, edge cases)
- Troubleshooting entries for [INSTALL.md](INSTALL.md)
- Additional test coverage
- Typos and documentation clarity

For significant new features, open an issue first to align on scope before building.

---

## Dev setup

See [INSTALL.md](INSTALL.md) for prerequisites and platform-specific notes. Short version:

```bash
git clone https://github.com/leelakumili/seen
cd seen
npm install
npm run dev
```

Requires Node 20+ and npm 10+. For AI, either run Ollama (`ollama serve`) or set `AI_PROVIDER=anthropic` with an API key in `.env`.

---

## Codebase overview

```
electron/     Main process: IPC handlers, SQLite, AI calls
db/           Schema and migrations (applied automatically on launch)
ai/           AI provider interface and prompt modules
src/          React renderer: screens, components, state
tests/        Vitest unit tests
```

For architecture, data flow, and how to add new IPC handlers or prompt modules, see [docs/technical-doc.md](docs/technical-doc.md).

---

## Invariants — don't break these

**IPC boundary**
The renderer never touches SQLite or Node.js APIs directly. All data access goes through `window.seen.*` → IPC bridge → main process. This is enforced by Electron's context isolation. Every new data operation needs a handler in `electron/ipc/` and a corresponding entry in `electron/preload.ts`.

**Soft deletes only**
Seen never issues `DELETE` against entries. Use `deleted_at` and `archived_at` timestamp columns. User data must remain recoverable.

**Prompt grounding rules**
All AI generation prompts must include an explicit instruction prohibiting the model from inventing names, metrics, or outcomes not present in the user's entries. See `ai/prompts/brag-doc.ts` for the reference implementation. If you add or modify a prompt, preserve this rule.

---

## Code style

- TypeScript strict mode. No `any`. Prefer explicit types over inference for function signatures.
- Keep IPC handler files single-concern — one feature domain per file.
- If you improve a prompt module, include before/after output examples in your PR description.

---

## Tests

```bash
npm test               # watch mode
npm run test:coverage  # single run with coverage report
```

Coverage thresholds are enforced: 90% lines, functions, and statements; 80% branches. New IPC handlers and prompt modules should have corresponding tests in `tests/`.

---

## Opening a PR

- One thing per PR — fixes, features, and refactors in separate PRs
- Link the issue your PR addresses
- For prompt changes, include example output in the description
- Keep the PR description short and factual — what changed and why
