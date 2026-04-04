import type { EntryType, ImpactLevel } from '@/types'

export const ENTRY_TYPES: EntryType[] = ['win', 'blocker', 'shoutout', 'learning', 'delivery']

export const IMPACT_LEVELS: { id: ImpactLevel; label: string }[] = [
  { id: 'team',      label: 'Team'      },
  { id: 'org',       label: 'Org'       },
  { id: 'cross-org', label: 'Cross-org' },
]
