# Lessons Learned: Building Seen

> A living log of AI-specific problems encountered while building a local-first
> AI desktop app with Electron, React, and a local Mistral LLM via Ollama.
>
> **End goal:** Turn this into a published article —
> *"What I learned building a personal AI copilot on a local LLM"*

---

## How to use this document

Each entry captures an AI/LLM-specific problem worth sharing with other builders:

| Field | Purpose |
|---|---|
| **Problem** | One sentence: what went wrong |
| **Context** | Why it happened — the deeper reason |
| **Tried** | What was attempted before the final fix |
| **Solution** | What actually worked |
| **Lesson** | The generalizable rule for anyone building similar apps |
| **Article angle** | How to frame this for a reader who wasn't in the room |

> **Scope:** This log covers AI application design decisions — grounding,
> hallucination, token strategy, prompt engineering, model behaviour.
> Standard coding bugs are tracked in git history, not here.

---

## Issue 1 — LLM generating fabricated content when entries are empty

| | |
|---|---|
| **Date** | 2026-04-02 |
| **Status** | Resolved |

**Problem**
Generating a Q1 brag doc (with zero entries logged before Apr 1) produced a
confident, detailed document with invented metrics, fake team names, and
departments that don't exist in the org — e.g. "35% reduction in manual testing
time", "predictive maintenance algorithm", "finance and marketing departments."
None of this appeared in any entry.

**Context**
Three compounding failures:

1. **No empty-entries guard.** The IPC handler called the LLM even when
   `entries.length === 0`. The LLM received an empty context block and, following
   the prompt's formatting instructions, filled every section with
   plausible-sounding fabrications.

2. **No grounding constraint.** The prompt said *"here are their work entries"*
   but never said *"only use these entries — do not invent anything not in this
   data."* Without an explicit prohibition, LLMs treat the provided data as a
   suggestion, not a hard boundary.

3. **No user context.** The prompts didn't include the engineer's name, role,
   manager, or org. The LLM had no anchor, so it invented a generic-sounding
   "our organization" with fictional departments.

**Tried**
- Investigated whether the wrong quarter's entries were being fetched (they
  weren't — the list was genuinely empty)
- Considered fine-tuning Mistral to restrict unknown org information

**Why fine-tuning was the wrong answer**
Fine-tuning teaches *how* a model responds (tone, format, domain vocabulary).
It does not reliably prevent hallucination of specific facts — you'd need
thousands of labeled examples and the model would still drift on unseen org
structures. Prompt-level constraints solve this class of problem cleanly and are
far cheaper to maintain.

**Solution**
Three-layer fix applied simultaneously:

1. **Empty guard at the application layer** — check `entries.length === 0`
   before calling the LLM. Return a plain message explaining why, including
   which date range each quarter covers. Never reach the LLM with no data.

2. **Explicit grounding rules in every prompt:**
   ```
   GROUNDING RULES — follow strictly:
   - Use ONLY the work entries listed below as your source of facts.
   - Do NOT invent metrics, team names, departments, or outcomes not in the entries.
   - Do NOT reference any org, team, or person not mentioned in the entries or context.
   - If a section has no relevant entries, say so rather than fabricating content.
   ```

3. **User context injection** — `getUserContext()` fetches `user_name`,
   `user_role`, `manager_name` from the settings DB and prepends them to every
   generation prompt as a grounding anchor.

**Lesson**
> Never call an LLM with empty or thin context and expect it to say "I don't
> know." LLMs are trained to be helpful and will fill silence with
> confident-sounding fabrications. The fix is always two-part: (1) a
> code-level guard that refuses to call the LLM when data is insufficient,
> and (2) explicit "do not invent" rules in the prompt itself. User context
> (name, role, org) must be injected into every prompt that produces
> personalized output — it gives the model a real anchor instead of a blank
> canvas to hallucinate on.

**Article angle**
*"Why your AI assistant is lying to you (and how to stop it)"* — The
hallucination problem is well-known in theory but still catches most developers
the first time they ship a real app. The solution isn't a better model — it's
a better application layer.

---

---

## Issue 2 — Every interaction was an LLM call (generation caching)

| | |
|---|---|
| **Date** | 2026-04-02 |
| **Status** | Resolved |

**Problem**
Every time the user opened the Amplify screen or changed the quarter selector, a full
LLM generation was triggered — even if the same output had been generated an hour ago.
Token cost accumulated silently, and there was no way to preserve edits to the output.

**Context**
The initial design treated generation as stateless: call LLM → stream output → done.
The `generations` table existed in the DB schema but was write-only — nothing ever
read from it. Three consequences:

1. **Unnecessary token spend.** A brag doc with 50 entries costs ~12k tokens per
   generation. Opening Amplify five times a day = five full LLM calls for identical input.
2. **No human-in-the-loop editing.** Promotion documents need personal voice and
   specific context the LLM can't know. Users had no way to tune the output — every
   regeneration would overwrite any changes.
3. **Single version accumulation.** Each generation inserted a new DB row. The table
   grew indefinitely with no way to retrieve past versions or know which was current.

**Tried**
- Considered keeping a full version history (rejected: adds UI complexity, encourages
  re-generating instead of editing)
- Considered a separate "saved drafts" table (rejected: over-engineered for v1)

**Solution**
Three-part fix:

1. **Cache-first loading.** On tab open and on period change (quarter/year selector),
   the app queries the DB for an existing generation before touching the LLM. If one
   exists, it's shown immediately — zero tokens, instant display.

2. **Upsert instead of insert.** Generate handlers now check for an existing record
   for the same `(type, quarter, year)` before writing. If one exists, it's updated.
   One record per period, always current. No accumulation.

3. **Edit + save.** An Edit button opens the output in a textarea. Save writes the
   user's changes back to SQLite. The edited version persists across app restarts and
   is shown on the next open — no regeneration needed unless the user explicitly asks.

**UX flow after the fix:**
```
Open tab / change period
  → DB read (zero tokens, instant)
  → Show saved output with [Edit] [Copy] [Regenerate] buttons

[Edit] → textarea opens → user tunes the output
[Save] → writes to SQLite → persists

[Regenerate] → explicit LLM call → overwrites DB record
```

**Lesson**
> In AI applications, treat LLM generation as an expensive write operation —
> not a read. Cache aggressively. Show the last good output by default.
> Make regeneration an explicit user action, not the default on every open.
> Human editing of AI output is not an edge case — it's the expected workflow
> for any document that represents the user's own voice.

**Article angle**
*"Every interaction shouldn't be an LLM call"* — Generation caching, upsert
semantics, and human-in-the-loop editing are the difference between a demo and
a tool people actually use. The pattern applies to any AI app that produces
documents: emails, summaries, reports, cover letters.

---

## Upcoming issues to document

*(Add here as new AI/LLM-specific problems are encountered)*

- [x] **Generation caching** — resolved, see Issue 2.
- [ ] **Token budget with large entry sets** — 200 entries × ~50 tokens = ~10k
      tokens per generation call. Need a strategy for summarising or
      prioritising entries when approaching model context limits.
- [ ] **Streaming UX** — what happens when the user navigates away mid-stream?
      Stream orphans, state gets stuck in "generating". Need cancellation.
- [ ] **Ollama cold-start latency** — first request after Ollama is idle takes
      3–8s before any tokens appear. Users think the app is broken. Need a
      "warming up…" state or pre-warm on app launch.
- [ ] **Local model quality variance** — Mistral 7B vs Llama3 8B vs larger
      models produce meaningfully different output quality on structured
      generation tasks. Need a benchmark methodology.
- [ ] **First-run context gap** — new users haven't set name/role/manager yet,
      so the first generation has no user context anchor. Need onboarding to
      collect this before the first Amplify use.

---

## Patterns & Principles

Recurring themes that will anchor the article:

### Hallucination is an application problem, not a model problem
The same Mistral model that hallucinated a fake org structure produced accurate,
grounded output once the application layer provided real context and explicit
constraints. The model didn't change — the prompt and guards did.

### The application layer is the last line of defense
- Guard before calling the LLM (empty data, missing context)
- Constrain inside the prompt (explicit "do not invent" rules)
- Anchor with real user data (name, role, org from settings)

### Prompt engineering before fine-tuning
Factual grounding is a prompt-layer problem. Fine-tuning is for style,
format, and domain vocabulary — not for preventing hallucination of facts
you haven't trained the model on. Start with prompts; only fine-tune when
prompts have a ceiling you can measure.

### Local LLMs (Mistral via Ollama) and cloud LLMs share the same failure modes
The hallucination problem, the empty-context problem, and the grounding
problem appear identically on local Mistral 7B and Anthropic's Claude. The
model architecture doesn't change the application design — your guards and
prompts do.

---

## Draft article outline

**Title options:**
- *"What I learned building a personal AI copilot on a local LLM"*
- *"Why your AI assistant lies to you — and the three-layer fix"*
- *"Building Seen: a local-first career visibility tool on Mistral + Ollama"*

**Structure:**
1. What Seen is and why I built it (2 paragraphs)
2. The stack: local-first, Electron, Ollama/Mistral, why privacy matters here
3. The hallucination incident — the main event
   - What the fabricated Q1 output looked like
   - The three compounding failures
   - Why fine-tuning was the wrong instinct
   - The three-layer fix
4. Patterns that generalize to any LLM app
5. What's next: generation caching, token budgets, model benchmarking
6. What I'd do differently from day one

**Target:** DEV.to, Medium (Towards Data Science), personal blog, HackerNews Show HN
