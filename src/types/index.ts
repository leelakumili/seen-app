// ── Entry ──────────────────────────────────────────────────────────────────

export type EntryType = 'win' | 'blocker' | 'shoutout' | 'learning' | 'delivery'

export type ImpactLevel = 'team' | 'org' | 'cross-org'

export type BucketId =
  | 'technical-scope'
  | 'people-impact'
  | 'leadership-org'
  | 'innovation-bets'
  | 'external-presence'
  | 'execution'

export interface Entry {
  id:               string
  content:          string
  entry_type:       EntryType
  bucket:           BucketId
  impact_level:     ImpactLevel
  created_at:       string
  archived_at:      string | null
  deleted_at:       string | null
  shoutout_person?: string | null
}

// ── Bucket ─────────────────────────────────────────────────────────────────

export interface Bucket {
  id:                  string
  name:                string
  promo_criteria_hint: string
  sort_order:          number
}

export const DEFAULT_BUCKETS: Bucket[] = [
  { id: 'technical-scope',   name: 'Technical Scope & Influence', promo_criteria_hint: 'Breadth, architectural decisions, cross-team technical impact', sort_order: 1 },
  { id: 'people-impact',     name: 'People Impact',               promo_criteria_hint: 'Mentorship, unblocking, career development of others, hiring panel participation', sort_order: 2 },
  { id: 'leadership-org',    name: 'Leadership & Org Health',     promo_criteria_hint: 'Process improvements, culture, team health, hiring, cross-team facilitation',        sort_order: 3 },
  { id: 'innovation-bets',   name: 'Innovation & Bets',           promo_criteria_hint: 'Risk-taking, new approaches, forward-looking work',             sort_order: 4 },
  { id: 'external-presence', name: 'External Presence',           promo_criteria_hint: 'Talks, writing, community, recruiting signal',                  sort_order: 5 },
  { id: 'execution',         name: 'Execution & Delivery',        promo_criteria_hint: 'Shipping, reliability, concrete outcomes',                      sort_order: 6 },
]

// ── Generation ─────────────────────────────────────────────────────────────

export type GenerationType = 'brag_doc' | 'quarterly' | 'brag_month'

export interface Generation {
  id:               string
  type:             GenerationType
  date_range_start: string | null
  date_range_end:   string | null
  quarter:          string | null
  year:             number | null
  month:            number | null
  output:           string
  created_at:       string
}

// ── Settings ───────────────────────────────────────────────────────────────

export interface AppSettings {
  user_name:    string
  user_role:    string
  manager_name: string
  ai_provider:  'ollama' | 'anthropic'
  ai_model:     string
  ollama_host:  string
  anthropic_api_key: string
  archive_days: string
  onboarded:    string
  target_role:          string
  target_date:          string
  notifications_enabled: string
  notification_time:     string
}

// ── Window bridge type ─────────────────────────────────────────────────────

export interface SeenBridge {
  generations: {
    get:  (params: { type: GenerationType; quarter?: string; year?: number; month?: number }) => Promise<Generation | null>
    save: (id: string, output: string) => Promise<{ saved: boolean }>
  }
  entries: {
    list:   (filters?: { bucket?: string; limit?: number }) => Promise<Entry[]>
    create: (payload: Omit<Entry, 'id' | 'created_at' | 'archived_at' | 'deleted_at'>) => Promise<Entry>
    update: (id: string, payload: Partial<Entry>) => Promise<Entry>
    delete: (id: string) => Promise<{ deleted: boolean }>
  }
  settings: {
    get:    (key: string) => Promise<string | null>
    set:    (key: string, value: string) => Promise<{ key: string; value: string }>
    getAll: () => Promise<Partial<AppSettings>>
  }
  buckets: {
    list:   () => Promise<Bucket[]>
    create: (payload: { name: string; promo_criteria_hint?: string }) => Promise<Bucket>
    update: (id: string, payload: { name?: string; promo_criteria_hint?: string; sort_order?: number }) => Promise<Bucket>
    delete: (id: string) => Promise<{ deleted: boolean; reason?: string }>
  }
  ai: {
    suggestBucket:     (content: string) => Promise<{ bucket: string; entry_type: string; impact_level: string }>
    generateBragMonth: (params: { quarter: string; year: number; month: number }) => Promise<void>
    generateBragDoc:   (params: { quarter: string; year: number }) => Promise<{ id: string; output: string }>
    generateQuarterly: (params: { quarter: string; year: number }) => Promise<{ id: string; output: string }>
    correctSpelling:   (content: string) => Promise<string>
    ask:               (messages: { role: 'user' | 'assistant'; content: string }[], style?: string) => Promise<void>
    onStream: (cb: (chunk: string) => void) => void
    offStream: () => void
  }
  file: {
    save: (content: string, defaultName: string) => Promise<{ saved: boolean }>
  }
  platform: NodeJS.Platform
}

declare global {
  interface Window { seen: SeenBridge }
}
