import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { format, formatDistanceToNow, parseISO } from 'date-fns'

// Re-export bucket data so screens can import from a single location
export { DEFAULT_BUCKETS } from '@/types'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDate(iso: string): string {
  return format(parseISO(iso), 'MMM d')
}

export function formatRelative(iso: string): string {
  return formatDistanceToNow(parseISO(iso), { addSuffix: true })
}

export function currentQuarter(): string {
  const month = new Date().getMonth() + 1
  if (month <= 3)  return 'Q1'
  if (month <= 6)  return 'Q2'
  if (month <= 9)  return 'Q3'
  return 'Q4'
}

export const BUCKET_COLORS: Record<string, string> = {
  'technical-scope':   '#c9924a', // amber
  'people-impact':     '#7a6ab0', // purple
  'leadership-org':    '#4a8fa8', // teal
  'innovation-bets':   '#5a9a6a', // green
  'external-presence': '#a85a4a', // rust
  'execution':         '#1a2d5a', // navy
}

export const ENTRY_TYPE_LABELS: Record<string, string> = {
  win:      'Win',
  blocker:  'Blocker Resolved',
  shoutout: 'Shoutout',
  learning: 'Learning',
  delivery: 'Delivery',
}
