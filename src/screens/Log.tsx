import { useState, useEffect, useRef } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { DEFAULT_BUCKETS, ENTRY_TYPE_LABELS, formatRelative, BUCKET_COLORS } from '@/lib/utils'
import { ENTRY_TYPES, IMPACT_LEVELS } from '@/lib/constants'
import type { Entry, EntryType, ImpactLevel, BucketId, Bucket } from '@/types'
import { Sparkles, Check, Pencil, Trash2, X, SpellCheck } from 'lucide-react'

export function Log() {
  const qc = useQueryClient()

  // Form state
  const [content,         setContent]         = useState('')
  const [entryType,       setEntryType]       = useState<EntryType>('win')
  const [bucket,          setBucket]          = useState<BucketId>('execution')
  const [impactLevel,     setImpactLevel]     = useState<ImpactLevel>('team')
  const [shoutoutPerson,  setShoutoutPerson]  = useState('')
  const [suggesting,      setSuggesting]      = useState(false)
  const [correcting,      setCorrecting]      = useState(false)
  const [corrected,       setCorrected]       = useState(false)
  const [saved,           setSaved]           = useState(false)
  const [saving,          setSaving]          = useState(false)

  // Edit state
  const [editingId, setEditingId] = useState<string | null>(null)

  // Multi-select + delete state
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [deleting, setDeleting] = useState(false)

  // Highlight an entry linked from chat
  const [searchParams, setSearchParams] = useSearchParams()
  const [highlightId, setHighlightId]   = useState<string | null>(null)
  const entryRefs = useRef<Record<string, HTMLDivElement | null>>({})

  const { data: entries = [] } = useQuery<Entry[]>({
    queryKey: ['entries', 'all'],
    queryFn:  () => window.seen.entries.list(),
  })

  const { data: buckets = DEFAULT_BUCKETS } = useQuery<Bucket[]>({
    queryKey: ['buckets'],
    queryFn:  () => window.seen.buckets.list(),
  })

  const highlightParam = searchParams.get('highlight')
  useEffect(() => {
    if (!highlightParam || entries.length === 0) return
    setHighlightId(highlightParam)
    const el = entryRefs.current[highlightParam]
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' })
    const t = setTimeout(() => {
      setHighlightId(null)
      setSearchParams(p => { p.delete('highlight'); return p }, { replace: true })
    }, 2500)
    return () => clearTimeout(t)
  }, [highlightParam, entries.length]) // eslint-disable-line react-hooks/exhaustive-deps

  function startEdit(entry: Entry) {
    setEditingId(entry.id)
    setContent(entry.content)
    setEntryType(entry.entry_type)
    setBucket(entry.bucket)
    setImpactLevel(entry.impact_level)
    setShoutoutPerson(entry.shoutout_person ?? '')
  }

  function cancelEdit() {
    setEditingId(null)
    setContent('')
    setEntryType('win')
    setBucket('execution')
    setImpactLevel('team')
    setShoutoutPerson('')
  }

  async function fixSpelling() {
    if (!content.trim()) return
    setCorrecting(true)
    try {
      const fixed = await window.seen.ai.correctSpelling(content)
      setContent(fixed)
      setCorrected(true)
      setTimeout(() => setCorrected(false), 2500)
    } finally {
      setCorrecting(false)
    }
  }

  async function suggestBucket() {
    if (!content.trim()) return
    setSuggesting(true)
    try {
      const suggested = await window.seen.ai.suggestBucket(content)
      const match = buckets.find(b =>
        b.name.toLowerCase() === suggested.bucket.trim().toLowerCase()
      )
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
      if (editingId) {
        await window.seen.entries.update(editingId, {
          content, entry_type: entryType, bucket, impact_level: impactLevel,
          shoutout_person: entryType === 'shoutout' ? shoutoutPerson : null,
        })
        cancelEdit()
      } else {
        await window.seen.entries.create({
          content, entry_type: entryType, bucket, impact_level: impactLevel,
          shoutout_person: entryType === 'shoutout' ? shoutoutPerson : null,
        })
        setSaved(true)
        setContent('')
        setShoutoutPerson('')
        setTimeout(() => setSaved(false), 2000)
      }
      qc.invalidateQueries({ queryKey: ['entries'] })
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id: string) {
    await window.seen.entries.delete(id)
    setSelected(prev => { const n = new Set(prev); n.delete(id); return n })
    qc.invalidateQueries({ queryKey: ['entries'] })
  }

  async function handleDeleteSelected() {
    if (selected.size === 0) return
    setDeleting(true)
    try {
      await Promise.all([...selected].map(id => window.seen.entries.delete(id)))
      setSelected(new Set())
      qc.invalidateQueries({ queryKey: ['entries'] })
    } finally {
      setDeleting(false)
    }
  }

  function toggleSelect(id: string) {
    setSelected(prev => {
      const n = new Set(prev)
      n.has(id) ? n.delete(id) : n.add(id)
      return n
    })
  }

  function toggleSelectAll() {
    setSelected(selected.size === entries.length ? new Set() : new Set(entries.map(e => e.id)))
  }

  const selectedBucket = buckets.find(b => b.id === bucket)

  return (
    <div className="p-6 max-w-2xl">

      {/* ── Form ──────────────────────────────────────────────── */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-0.5">
          <h1 className="text-base font-medium text-navy">
            {editingId ? 'Edit entry' : 'Log an entry'}
          </h1>
          {editingId && (
            <button
              onClick={cancelEdit}
              className="flex items-center gap-1 text-xs text-muted hover:text-ink transition-colors"
            >
              <X size={12} /> Cancel edit
            </button>
          )}
        </div>
        <p className="text-xs text-muted mb-6">
          {editingId
            ? 'Update the details below, then save.'
            : 'What did you do, decide, unblock, or ship?'}
        </p>

        {/* Entry type */}
        <div className="mb-5">
          <label className="text-[10px] text-muted uppercase tracking-wide font-medium mb-2 block">
            Entry type
          </label>
          <div className="flex flex-wrap gap-1.5">
            {ENTRY_TYPES.map(t => (
              <button
                key={t}
                onClick={() => setEntryType(t)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                  entryType === t
                    ? 'bg-navy text-ivory border-navy'
                    : 'bg-white text-muted border-border hover:border-navy/40'
                }`}
              >
                {ENTRY_TYPE_LABELS[t]}
              </button>
            ))}
          </div>
        </div>

        {/* Shoutout person (only when type = shoutout) */}
        {entryType === 'shoutout' && (
          <div className="mb-5">
            <label className="text-[10px] text-muted uppercase tracking-wide font-medium mb-2 block">
              Who are you recognising?
            </label>
            <input
              type="text"
              className="w-full text-sm text-ink placeholder-muted/50 border border-border rounded-lg p-3 focus:outline-none focus:border-amber"
              placeholder="Name or handle (e.g. Alex Chen, @priya)"
              value={shoutoutPerson}
              onChange={e => setShoutoutPerson(e.target.value)}
            />
          </div>
        )}

        {/* Content */}
        <div className="mb-5">
          <label className="text-[10px] text-muted uppercase tracking-wide font-medium mb-2 block">
            {entryType === 'shoutout' ? 'What did they do?' : 'What happened'}
          </label>
          <textarea
            className="w-full text-sm text-ink placeholder-muted/50 border border-border rounded-lg p-3 resize-none focus:outline-none focus:border-amber min-h-[120px] leading-relaxed"
            placeholder={
              entryType === 'shoutout'
                ? 'Describe what they did and why it mattered.'
                : 'Be specific — situation, action, outcome. The more context you give, the better your 1:1 prep will be.'
            }
            value={content}
            onChange={e => { setContent(e.target.value); setCorrected(false) }}
            autoFocus={!editingId}
          />
          <div className="flex items-center justify-end mt-1.5">
            {corrected && (
              <span className="text-[10px] text-green-600 mr-2 flex items-center gap-1">
                <Check size={10} /> Spelling corrected
              </span>
            )}
            <button
              onClick={fixSpelling}
              disabled={correcting || !content.trim()}
              className="flex items-center gap-1 text-[11px] text-muted hover:text-navy transition-colors disabled:opacity-40"
            >
              <SpellCheck size={11} />
              {correcting ? 'Fixing…' : 'Fix spelling'}
            </button>
          </div>
        </div>

        {/* Goal bucket */}
        <div className="mb-5">
          <div className="flex items-center justify-between mb-2">
            <label className="text-[10px] text-muted uppercase tracking-wide font-medium">
              Goal bucket
            </label>
            <button
              onClick={suggestBucket}
              disabled={suggesting || !content.trim()}
              className="flex items-center gap-1 text-[11px] text-amber hover:text-amber-light transition-colors disabled:opacity-40"
            >
              <Sparkles size={11} />
              {suggesting ? 'Thinking…' : 'AI suggest'}
            </button>
          </div>
          <div className="grid grid-cols-2 gap-1.5">
            {buckets.map(b => (
              <button
                key={b.id}
                onClick={() => setBucket(b.id as BucketId)}
                className={`text-left px-3 py-2 rounded-md text-xs border transition-colors ${
                  bucket === b.id
                    ? 'bg-amber/12 border-amber/40 text-amber'
                    : 'bg-white border-border text-muted hover:border-navy/30 hover:text-ink'
                }`}
              >
                {b.name}
              </button>
            ))}
          </div>
          {selectedBucket && (
            <p className="text-[10px] text-muted/60 mt-1.5 italic">
              {selectedBucket.promo_criteria_hint}
            </p>
          )}
        </div>

        {/* Impact level */}
        <div className="mb-6">
          <label className="text-[10px] text-muted uppercase tracking-wide font-medium mb-2 block">
            Impact level
          </label>
          <div className="grid grid-cols-3 gap-1.5">
            {IMPACT_LEVELS.map(l => (
              <button
                key={l.id}
                onClick={() => setImpactLevel(l.id)}
                className={`py-2 px-3 rounded-md border text-xs font-medium transition-colors ${
                  impactLevel === l.id
                    ? 'bg-amber/12 border-amber/40 text-amber'
                    : 'bg-white border-border text-muted hover:border-amber/30'
                }`}
              >
                {l.label}
              </button>
            ))}
          </div>
        </div>

        <Button
          onClick={handleSave}
          disabled={saving || !content.trim()}
          className={`w-full transition-all ${saved ? 'bg-green-600 hover:bg-green-600' : ''}`}
        >
          {saved ? (
            <><Check size={14} /> Saved</>
          ) : saving ? 'Saving…' : editingId ? 'Update entry' : 'Save entry'}
        </Button>
      </div>

      {/* ── Entry list ────────────────────────────────────────── */}
      <div>
        {/* List header */}
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-3">
            <span className="text-[10px] text-muted uppercase tracking-wide font-medium">
              All entries ({entries.length})
            </span>
            {entries.length > 0 && (
              <button
                onClick={toggleSelectAll}
                className="text-[10px] text-muted/60 hover:text-amber transition-colors"
              >
                {selected.size === entries.length ? 'Deselect all' : 'Select all'}
              </button>
            )}
          </div>
          {selected.size > 0 && (
            <button
              onClick={handleDeleteSelected}
              disabled={deleting}
              className="flex items-center gap-1.5 text-xs text-red-500 hover:text-red-600 border border-red-200 rounded px-2.5 py-1 bg-red-50 transition-colors disabled:opacity-50"
            >
              <Trash2 size={12} />
              {deleting ? 'Deleting…' : `Delete ${selected.size}`}
            </button>
          )}
        </div>

        {entries.length === 0 ? (
          <div className="text-xs text-muted/60 py-8 text-center">
            No entries yet. Use the form above to add your first.
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {entries.map(entry => {
              const color      = BUCKET_COLORS[entry.bucket] ?? '#8a7e6a'
              const bucketMeta = buckets.find(b => b.id === entry.bucket)
              const isSelected = selected.has(entry.id)
              const isEditing  = editingId === entry.id

              const isHighlighted = highlightId === entry.id
              return (
                <div
                  key={entry.id}
                  ref={el => { entryRefs.current[entry.id] = el }}
                  className={`bg-white border rounded-lg p-3 flex gap-3 group transition-colors ${
                    isEditing    ? 'border-amber/50 ring-1 ring-amber/20' :
                    isHighlighted? 'border-amber/60 ring-2 ring-amber/30 bg-amber/[0.04]' :
                    isSelected   ? 'border-amber/30 bg-amber/[0.02]' :
                                   'border-border'
                  }`}
                >
                  {/* Checkbox */}
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => toggleSelect(entry.id)}
                    className="mt-0.5 flex-shrink-0 cursor-pointer accent-amber"
                  />

                  {/* Colour dot */}
                  <div
                    className="w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0"
                    style={{ background: color }}
                  />

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    {entry.entry_type === 'shoutout' && entry.shoutout_person && (
                      <p className="text-[10px] text-amber font-medium mb-0.5">
                        Recognising {entry.shoutout_person}
                      </p>
                    )}
                    <p className="text-xs text-ink leading-relaxed">{entry.content}</p>
                    <div className="flex flex-wrap items-center gap-2 mt-1.5">
                      <Badge bucket={entry.bucket} className="text-[10px]">
                        {bucketMeta?.name ?? entry.bucket}
                      </Badge>
                      <span className="text-[10px] text-muted/70 capitalize">
                        {ENTRY_TYPE_LABELS[entry.entry_type] ?? entry.entry_type}
                      </span>
                      <span className="text-[10px] text-muted/40">
                        {formatRelative(entry.created_at)}
                      </span>
                    </div>
                  </div>

                  {/* Row actions (visible on hover) */}
                  <div className="flex items-start gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                    <button
                      onClick={() => isEditing ? cancelEdit() : startEdit(entry)}
                      title={isEditing ? 'Cancel edit' : 'Edit'}
                      className={`p-1.5 rounded transition-colors ${
                        isEditing
                          ? 'text-amber hover:text-amber-light'
                          : 'text-muted hover:text-navy'
                      }`}
                    >
                      {isEditing ? <X size={12} /> : <Pencil size={12} />}
                    </button>
                    <button
                      onClick={() => handleDelete(entry.id)}
                      title="Delete"
                      className="p-1.5 text-muted hover:text-red-500 rounded transition-colors"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
