import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useStore } from '@/store/useStore'
import { Button } from '@/components/ui/button'
import { DEFAULT_BUCKETS, ENTRY_TYPE_LABELS } from '@/lib/utils'
import { ENTRY_TYPES, IMPACT_LEVELS } from '@/lib/constants'
import type { EntryType, ImpactLevel, BucketId, Bucket } from '@/types'
import { X, Sparkles } from 'lucide-react'

export function QuickLogModal() {
  const qc                           = useQueryClient()
  const { quickLogOpen, setQuickLogOpen } = useStore()

  const [content,        setContent]        = useState('')
  const [entryType,      setEntryType]      = useState<EntryType>('win')
  const [bucket,         setBucket]         = useState<BucketId>('execution')
  const [impactLevel,    setImpactLevel]    = useState<ImpactLevel>('team')
  const [shoutoutPerson, setShoutoutPerson] = useState('')
  const [suggesting,     setSuggesting]     = useState(false)
  const [saving,         setSaving]         = useState(false)

  const { data: buckets = DEFAULT_BUCKETS } = useQuery<Bucket[]>({
    queryKey: ['buckets'],
    queryFn:  () => window.seen.buckets.list(),
    enabled:  quickLogOpen,
  })

  if (!quickLogOpen) return null

  function reset() {
    setContent('')
    setEntryType('win')
    setBucket('execution')
    setImpactLevel('team')
    setShoutoutPerson('')
  }

  async function suggestBucket() {
    if (!content.trim()) return
    setSuggesting(true)
    try {
      const suggested = await window.seen.ai.suggestBucket(content)
      const match = buckets.find(b => b.name.toLowerCase() === suggested.bucket.trim().toLowerCase())
      if (match) setBucket(match.id as BucketId)
      if (suggested.entry_type && ENTRY_TYPES.includes(suggested.entry_type as EntryType)) {
        setEntryType(suggested.entry_type as EntryType)
      }
      if (suggested.impact_level && ['team', 'org', 'cross-org'].includes(suggested.impact_level)) {
        setImpactLevel(suggested.impact_level as ImpactLevel)
      }
    } finally {
      setSuggesting(false)
    }
  }

  async function handleSave() {
    if (!content.trim()) return
    setSaving(true)
    try {
      await window.seen.entries.create({
        content,
        entry_type:     entryType,
        bucket,
        impact_level:   impactLevel,
        shoutout_person: entryType === 'shoutout' ? shoutoutPerson : null,
      })
      qc.invalidateQueries({ queryKey: ['entries'] })
      reset()
      setQuickLogOpen(false)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-ink/30">
      <div className="bg-white rounded-lg border border-border w-full max-w-lg shadow-xl animate-slide-up">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <span className="text-sm font-medium text-navy">Quick log</span>
          <button onClick={() => setQuickLogOpen(false)} className="text-muted hover:text-ink transition-colors">
            <X size={16} />
          </button>
        </div>

        <div className="p-5 flex flex-col gap-4">
          {/* Entry type */}
          <div className="flex flex-wrap gap-1.5">
            {ENTRY_TYPES.map(t => (
              <button key={t} onClick={() => setEntryType(t)}
                className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
                  entryType === t
                    ? 'bg-navy text-ivory border-navy'
                    : 'bg-white text-muted border-border hover:border-navy/40'
                }`}>
                {ENTRY_TYPE_LABELS[t]}
              </button>
            ))}
          </div>

          {/* Shoutout person */}
          {entryType === 'shoutout' && (
            <input
              type="text"
              className="w-full text-sm text-ink placeholder-muted/60 border border-border rounded-md p-3 focus:outline-none focus:border-amber"
              placeholder="Who are you recognising? (name or handle)"
              value={shoutoutPerson}
              onChange={e => setShoutoutPerson(e.target.value)}
              autoFocus
            />
          )}

          {/* Content */}
          <textarea
            className="w-full text-sm text-ink placeholder-muted/60 border border-border rounded-md p-3 resize-none focus:outline-none focus:border-amber min-h-[90px]"
            placeholder={entryType === 'shoutout' ? 'What did they do?' : 'What did you do, decide, unblock, or ship?'}
            value={content}
            onChange={e => setContent(e.target.value)}
            autoFocus={entryType !== 'shoutout'}
          />

          {/* Bucket + suggest */}
          <div className="flex gap-2 items-center">
            <select value={bucket} onChange={e => setBucket(e.target.value as BucketId)}
              className="flex-1 text-xs text-ink border border-border rounded-md px-3 py-2 focus:outline-none focus:border-amber bg-white">
              {buckets.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
            <button onClick={suggestBucket} disabled={suggesting || !content.trim()}
              className="flex items-center gap-1.5 px-3 py-2 text-xs text-amber border border-amber/40 rounded-md hover:bg-amber/5 transition-colors disabled:opacity-40">
              <Sparkles size={12} />
              {suggesting ? 'Thinking…' : 'Suggest'}
            </button>
          </div>

          {/* Impact level */}
          <div className="flex gap-1.5">
            {IMPACT_LEVELS.map(l => (
              <button key={l.id} onClick={() => setImpactLevel(l.id)}
                className={`flex-1 py-1.5 rounded text-xs font-medium border capitalize transition-colors ${
                  impactLevel === l.id
                    ? 'bg-amber/15 text-amber border-amber/40'
                    : 'bg-white text-muted border-border hover:border-amber/30'
                }`}>
                {l.label}
              </button>
            ))}
          </div>

          <Button onClick={handleSave} disabled={saving || !content.trim()} className="w-full">
            {saving ? 'Saving…' : 'Save entry'}
          </Button>
        </div>
      </div>
    </div>
  )
}
