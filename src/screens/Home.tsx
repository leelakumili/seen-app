import { useQuery } from '@tanstack/react-query'
import { format } from 'date-fns'
import { useStore } from '@/store/useStore'
import { Badge } from '@/components/ui/badge'
import { DEFAULT_BUCKETS, formatRelative, BUCKET_COLORS, currentQuarter } from '@/lib/utils'
import type { Entry } from '@/types'

const QUARTER_START_MONTH: Record<string, number> = { Q1: 0, Q2: 3, Q3: 6, Q4: 9 }

function MetricCard({ label, value, hint }: {
  label: string; value: number | string; hint: string
}) {
  return (
    <div className="bg-white border border-border rounded-lg p-3">
      <div className="text-[10px] text-muted uppercase tracking-wide font-medium mb-1">{label}</div>
      <div className="text-2xl font-medium text-navy">{value}</div>
      <div className="text-[10px] text-muted/70 mt-0.5">{hint}</div>
    </div>
  )
}

function EntryRow({ entry }: { entry: Entry }) {
  const bucket = DEFAULT_BUCKETS.find(b => b.id === entry.bucket)
  const color  = BUCKET_COLORS[entry.bucket] ?? '#8a7e6a'
  return (
    <div className="bg-white border border-border rounded-lg p-3 flex gap-3">
      <div className="w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0" style={{ background: color }} />
      <div className="flex-1 min-w-0">
        <p className="text-xs text-ink leading-relaxed">{entry.content}</p>
        <div className="flex items-center gap-2 mt-1.5">
          <Badge bucket={entry.bucket} className="text-[10px]">{bucket?.name ?? entry.bucket}</Badge>
          <span className="text-[10px] text-muted/60">{formatRelative(entry.created_at)}</span>
        </div>
      </div>
    </div>
  )
}

export function Home() {
  const { settings } = useStore()
  const now      = new Date()
  const today    = format(now, 'EEEE, MMM d')
  const greeting = now.getHours() < 12 ? 'Good morning' : now.getHours() < 17 ? 'Good afternoon' : 'Good evening'
  const name     = settings.user_name?.split(' ')[0] ?? 'there'
  const quarter  = currentQuarter()

  // Recent entries for the feed (display only)
  const { data: entries = [] } = useQuery<Entry[]>({
    queryKey: ['entries', 'recent'],
    queryFn:  () => window.seen.entries.list({ limit: 5 }),
  })

  // Full entry set for accurate stats — not capped at 20
  const { data: allEntries = [] } = useQuery<Entry[]>({
    queryKey: ['entries', 'all-for-stats'],
    queryFn:  () => window.seen.entries.list(),
    staleTime: 60_000,
  })

  const weekStart    = new Date(now); weekStart.setDate(now.getDate() - now.getDay())
  const qStartMonth  = QUARTER_START_MONTH[quarter] ?? 0
  const quarterStart = new Date(now.getFullYear(), qStartMonth, 1)

  const thisWeek     = allEntries.filter(e => new Date(e.created_at) >= weekStart).length
  const quarterTotal = allEntries.filter(e => new Date(e.created_at) >= quarterStart).length

  const QUARTER_MONTH_LABELS: Record<string, string> = { Q1: 'Jan 1', Q2: 'Apr 1', Q3: 'Jul 1', Q4: 'Oct 1' }

  return (
    <div className="p-6 max-w-2xl">
      <h1 className="text-base font-medium text-navy mb-0.5">{greeting}, {name}</h1>
      <p className="text-xs text-muted mb-5">{today}</p>

      <div className="grid grid-cols-2 gap-2 mb-6">
        <MetricCard label="This week"          value={thisWeek}      hint="entries"                                      />
        <MetricCard label={`${quarter} total`} value={quarterTotal}  hint={`since ${QUARTER_MONTH_LABELS[quarter]}`}    />
      </div>

      <div className="text-[10px] text-muted uppercase tracking-wide font-medium mb-2">Recent entries</div>
      {entries.length === 0 ? (
        <div className="text-xs text-muted/60 py-6 text-center">
          No entries yet. Hit <span className="text-amber font-medium">Quick log</span> to add your first.
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {entries.map(e => <EntryRow key={e.id} entry={e} />)}
        </div>
      )}
    </div>
  )
}
