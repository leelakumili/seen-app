export function buildSuggestPrompt(content: string): string {
  return `You are a career coach helping an engineer classify their work log entry.

Classify the entry into three fields:

1. bucket — one of:
   - Technical Scope & Influence: Architectural decisions, technical breadth, cross-team technical impact, design docs, code reviews
   - People Impact: Mentorship, unblocking teammates, sponsoring peers, career development of others
   - Leadership & Org Health: Process improvements, on-call/runbook improvements, culture, team health, hiring, retros
   - Innovation & Bets: Prototypes, new approaches, experiments, risk-taking, forward-looking technical bets
   - External Presence: Conference talks, blog posts, open-source, recruiting events, community engagement
   - Execution & Delivery: Shipping features, fixing incidents, reliability, meeting deadlines, concrete outcomes

2. entry_type — one of:
   - win: A positive outcome, accomplishment, or shipped result
   - blocker: Something that slowed or stopped progress
   - learning: A skill, insight, or lesson gained
   - delivery: A concrete deliverable completed (doc, feature, fix, PR)
   - shoutout: Recognising someone else's contribution

3. impact_level — one of:
   - team: Affected your immediate team only
   - org: Affected your broader org or multiple teams
   - cross-org: Affected multiple orgs, the whole company, or external parties

EXAMPLES:
Entry: "Wrote design doc for new payments retry architecture, reviewed by 3 teams"
{"bucket":"Technical Scope & Influence","entry_type":"delivery","impact_level":"org"}

Entry: "Mentored a junior engineer through their first production deploy"
{"bucket":"People Impact","entry_type":"win","impact_level":"team"}

Entry: "Led our quarterly retro and introduced a structured action-item tracking process"
{"bucket":"Leadership & Org Health","entry_type":"delivery","impact_level":"team"}

Entry: "Spiked on using WebAssembly for client-side PDF generation — proved 10x faster"
{"bucket":"Innovation & Bets","entry_type":"learning","impact_level":"team"}

Entry: "Gave a talk at the local Go meetup about our observability stack"
{"bucket":"External Presence","entry_type":"win","impact_level":"cross-org"}

Entry: "Shipped the new checkout flow and resolved 3 P1 bugs before launch"
{"bucket":"Execution & Delivery","entry_type":"win","impact_level":"org"}

Entry: "Identified N+1 query causing payment timeouts, deployed hotfix in 47 minutes"
{"bucket":"Execution & Delivery","entry_type":"delivery","impact_level":"org"}

Entry: "Blocked on infra access — can't deploy until platform team approves our service account"
{"bucket":"Execution & Delivery","entry_type":"blocker","impact_level":"team"}

Entry: "Sarah stepped up and led the incident review completely on her own"
{"bucket":"People Impact","entry_type":"shoutout","impact_level":"team"}

Entry: "Ran a multi-week experiment evaluating three AI code review tools, wrote up findings"
{"bucket":"Innovation & Bets","entry_type":"delivery","impact_level":"org"}

Now classify this entry:
Entry: "${content}"

Reply with only a JSON object — no explanation, no markdown, no extra text.`
}
