import { useEffect, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useStore } from '@/store/useStore'
import { Button } from '@/components/ui/button'
import { Check, Pencil, Trash2, Plus } from 'lucide-react'
import type { Bucket } from '@/types'

interface Field { key: string; label: string; placeholder: string; type?: string }

const PROFILE_FIELDS: Field[] = [
  { key: 'user_name',    label: 'Your name',      placeholder: 'Leela Kumili'      },
  { key: 'user_role',    label: 'Your role',      placeholder: 'Engineering Lead'  },
  { key: 'manager_name', label: "Manager's name", placeholder: 'Alex Chen'         },
]

const AI_PROVIDERS = [
  { id: 'ollama',    label: 'Ollama (local, default)' },
  { id: 'anthropic', label: 'Anthropic API'           },
]

export function Settings() {
  const qc = useQueryClient()
  const { setSettings } = useStore()
  const [local,  setLocal]  = useState<Record<string, string>>({})
  const [saved,  setSaved]  = useState(false)
  const [saving, setSaving] = useState(false)

  // Bucket state
  const [editingBucketId,   setEditingBucketId]   = useState<string | null>(null)
  const [editBucketName,    setEditBucketName]    = useState('')
  const [editBucketHint,    setEditBucketHint]    = useState('')
  const [newBucketName,     setNewBucketName]     = useState('')
  const [newBucketHint,     setNewBucketHint]     = useState('')
  const [addingBucket,      setAddingBucket]      = useState(false)
  const [bucketError,       setBucketError]       = useState('')

  const { data: buckets = [] } = useQuery<Bucket[]>({
    queryKey: ['buckets'],
    queryFn:  () => window.seen.buckets.list(),
  })

  useEffect(() => {
    window.seen.settings.getAll().then(all => {
      setLocal(all as Record<string, string>)
      setSettings(all)
    })
  }, [setSettings])

  function update(key: string, value: string) {
    setLocal(prev => ({ ...prev, [key]: value }))
  }

  async function handleSave() {
    setSaving(true)
    try {
      await Promise.all(
        Object.entries(local).map(([k, v]) => window.seen.settings.set(k, v))
      )
      setSettings(local)
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } finally {
      setSaving(false)
    }
  }

  function startEditBucket(b: Bucket) {
    setEditingBucketId(b.id)
    setEditBucketName(b.name)
    setEditBucketHint(b.promo_criteria_hint)
    setBucketError('')
  }

  async function saveEditBucket(id: string) {
    if (!editBucketName.trim()) return
    await window.seen.buckets.update(id, {
      name: editBucketName.trim(),
      promo_criteria_hint: editBucketHint.trim(),
    })
    setEditingBucketId(null)
    qc.invalidateQueries({ queryKey: ['buckets'] })
  }

  async function handleDeleteBucket(id: string) {
    const result = await window.seen.buckets.delete(id)
    if (!result.deleted) {
      setBucketError(result.reason ?? 'Cannot delete bucket')
      return
    }
    setBucketError('')
    qc.invalidateQueries({ queryKey: ['buckets'] })
  }

  async function handleAddBucket() {
    if (!newBucketName.trim()) return
    await window.seen.buckets.create({ name: newBucketName.trim(), promo_criteria_hint: newBucketHint.trim() })
    setNewBucketName('')
    setNewBucketHint('')
    setAddingBucket(false)
    qc.invalidateQueries({ queryKey: ['buckets'] })
  }

  function exportJson() {
    window.seen.entries.list().then(entries => {
      const blob = new Blob([JSON.stringify(entries, null, 2)], { type: 'application/json' })
      const url  = URL.createObjectURL(blob)
      const a    = document.createElement('a')
      a.href = url; a.download = 'seen-export.json'; a.click()
      URL.revokeObjectURL(url)
    })
  }

  function exportMarkdown() {
    window.seen.entries.list().then(entries => {
      const lines = ['# Seen — Work Log Export', '', `Exported: ${new Date().toLocaleDateString()}`, '']
      const bucketNameMap = Object.fromEntries(buckets.map(b => [b.id, b.name]))
      const byBucket: Record<string, typeof entries> = {}
      entries.forEach(e => {
        if (!byBucket[e.bucket]) byBucket[e.bucket] = []
        byBucket[e.bucket].push(e)
      })
      Object.entries(byBucket).forEach(([bucket, items]) => {
        const displayName = bucketNameMap[bucket] ?? bucket
        lines.push(`## ${displayName}`, '')
        items.forEach(e => {
          lines.push(`- **[${e.entry_type} · ${e.impact_level}]** ${e.content}`)
          if (e.shoutout_person) lines.push(`  _(recognising ${e.shoutout_person})_`)
          lines.push(`  _${new Date(e.created_at).toLocaleDateString()}_`)
        })
        lines.push('')
      })
      const blob = new Blob([lines.join('\n')], { type: 'text/markdown' })
      const url  = URL.createObjectURL(blob)
      const a    = document.createElement('a')
      a.href = url; a.download = 'seen-export.md'; a.click()
      URL.revokeObjectURL(url)
    })
  }

  return (
    <div className="p-6 max-w-lg">
      <h1 className="text-base font-medium text-navy mb-0.5">Settings</h1>
      <p className="text-xs text-muted mb-6">Configure Seen to match your setup.</p>

      {/* Profile */}
      <section className="mb-8">
        <div className="text-[10px] text-muted uppercase tracking-wide font-medium mb-3">Profile</div>
        <div className="flex flex-col gap-3">
          {PROFILE_FIELDS.map(f => (
            <div key={f.key}>
              <label className="text-xs text-muted block mb-1">{f.label}</label>
              <input
                type={f.type ?? 'text'}
                value={local[f.key] ?? ''}
                onChange={e => update(f.key, e.target.value)}
                placeholder={f.placeholder}
                className="w-full text-sm text-ink border border-border rounded-md px-3 py-2 focus:outline-none focus:border-amber bg-white placeholder-muted/40"
              />
            </div>
          ))}
        </div>
      </section>

      {/* Promotion target */}
      <section className="mb-8">
        <div className="text-[10px] text-muted uppercase tracking-wide font-medium mb-3">Promotion target</div>
        <div className="flex flex-col gap-3">
          <div>
            <label className="text-xs text-muted block mb-1">Target level / role</label>
            <input
              value={local.target_role ?? ''}
              onChange={e => update('target_role', e.target.value)}
              placeholder="e.g. Staff Engineer, L6"
              className="w-full text-sm text-ink border border-border rounded-md px-3 py-2 focus:outline-none focus:border-amber bg-white placeholder-muted/40"
            />
          </div>
          <div>
            <label className="text-xs text-muted block mb-1">Target date</label>
            <input
              type="date"
              value={local.target_date ?? ''}
              onChange={e => update('target_date', e.target.value)}
              className="w-full text-sm text-ink border border-border rounded-md px-3 py-2 focus:outline-none focus:border-amber bg-white"
            />
          </div>
        </div>
      </section>

      {/* Notifications */}
      <section className="mb-8">
        <div className="text-[10px] text-muted uppercase tracking-wide font-medium mb-3">Notifications</div>
        <div className="flex flex-col gap-4">
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={(local.notifications_enabled ?? 'true') === 'true'}
              onChange={e => update('notifications_enabled', e.target.checked ? 'true' : 'false')}
              className="accent-amber"
            />
            <div>
              <span className="text-sm text-ink">Daily log reminder</span>
              <p className="text-[10px] text-muted/60 mt-0.5">
                Notify me if I haven't logged anything by the set time.
              </p>
            </div>
          </label>

          {(local.notifications_enabled ?? 'true') === 'true' && (
            <div className="ml-6">
              <label className="text-xs text-muted block mb-1">Remind me at</label>
              <input
                type="time"
                value={local.notification_time ?? '17:00'}
                onChange={e => update('notification_time', e.target.value)}
                className="text-sm text-ink border border-border rounded-md px-3 py-2 focus:outline-none focus:border-amber bg-white"
              />
            </div>
          )}
        </div>
      </section>

      {/* Goal buckets */}
      <section className="mb-8">
        <div className="text-[10px] text-muted uppercase tracking-wide font-medium mb-1">Goal buckets</div>
        <p className="text-[10px] text-muted/60 mb-3">
          Customise to match your company's or org's promotion criteria.
        </p>

        {bucketError && (
          <p className="text-xs text-red-500 mb-2">{bucketError}</p>
        )}

        <div className="flex flex-col gap-2">
          {buckets.map(b => (
            <div key={b.id} className="border border-border rounded-md p-2.5 bg-white">
              {editingBucketId === b.id ? (
                <div className="flex flex-col gap-2">
                  <input
                    value={editBucketName}
                    onChange={e => setEditBucketName(e.target.value)}
                    className="text-xs text-ink border border-border rounded px-2 py-1 focus:outline-none focus:border-amber"
                    placeholder="Bucket name"
                    autoFocus
                  />
                  <input
                    value={editBucketHint}
                    onChange={e => setEditBucketHint(e.target.value)}
                    className="text-[11px] text-muted border border-border rounded px-2 py-1 focus:outline-none focus:border-amber"
                    placeholder="Hint shown under entries (optional)"
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={() => saveEditBucket(b.id)}
                      className="text-[11px] text-green-700 border border-green-200 rounded px-2.5 py-1 hover:bg-green-50 transition-colors"
                    >
                      Save
                    </button>
                    <button
                      onClick={() => setEditingBucketId(null)}
                      className="text-[11px] text-muted hover:text-ink transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex items-start gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-ink font-medium">{b.name}</p>
                    {b.promo_criteria_hint && (
                      <p className="text-[10px] text-muted/60 mt-0.5">{b.promo_criteria_hint}</p>
                    )}
                  </div>
                  <div className="flex gap-1 flex-shrink-0">
                    <button
                      onClick={() => startEditBucket(b)}
                      className="p-1.5 text-muted hover:text-navy rounded transition-colors"
                      title="Edit"
                    >
                      <Pencil size={11} />
                    </button>
                    <button
                      onClick={() => handleDeleteBucket(b.id)}
                      className="p-1.5 text-muted hover:text-red-500 rounded transition-colors"
                      title="Delete"
                    >
                      <Trash2 size={11} />
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Add bucket */}
        {addingBucket ? (
          <div className="mt-2 border border-amber/30 rounded-md p-2.5 bg-amber/5 flex flex-col gap-2">
            <input
              value={newBucketName}
              onChange={e => setNewBucketName(e.target.value)}
              className="text-xs text-ink border border-border rounded px-2 py-1 focus:outline-none focus:border-amber bg-white"
              placeholder="Bucket name (e.g. Customer Impact)"
              autoFocus
            />
            <input
              value={newBucketHint}
              onChange={e => setNewBucketHint(e.target.value)}
              className="text-[11px] text-muted border border-border rounded px-2 py-1 focus:outline-none focus:border-amber bg-white"
              placeholder="Hint (optional)"
            />
            <div className="flex gap-2">
              <button
                onClick={handleAddBucket}
                disabled={!newBucketName.trim()}
                className="text-[11px] text-amber border border-amber/40 rounded px-2.5 py-1 hover:bg-amber/10 transition-colors disabled:opacity-40"
              >
                Add bucket
              </button>
              <button
                onClick={() => { setAddingBucket(false); setNewBucketName(''); setNewBucketHint('') }}
                className="text-[11px] text-muted hover:text-ink transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setAddingBucket(true)}
            className="mt-2 flex items-center gap-1 text-[11px] text-amber hover:text-amber-light transition-colors"
          >
            <Plus size={11} /> Add bucket
          </button>
        )}
      </section>

      {/* AI provider */}
      <section className="mb-8">
        <div className="text-[10px] text-muted uppercase tracking-wide font-medium mb-3">AI provider</div>
        <div className="flex flex-col gap-2">
          {AI_PROVIDERS.map(p => (
            <label key={p.id} className="flex items-center gap-3 cursor-pointer">
              <input
                type="radio"
                name="ai_provider"
                value={p.id}
                checked={(local.ai_provider ?? 'ollama') === p.id}
                onChange={() => update('ai_provider', p.id)}
                className="accent-amber"
              />
              <span className="text-sm text-ink">{p.label}</span>
            </label>
          ))}
        </div>

        {(local.ai_provider ?? 'ollama') === 'anthropic' && (
          <div className="mt-3 p-3 bg-amber/5 border border-amber/20 rounded-md flex flex-col gap-3">
            <div>
              <label className="text-xs text-muted block mb-1">API key</label>
              <input
                type="password"
                value={local.anthropic_api_key ?? ''}
                onChange={e => update('anthropic_api_key', e.target.value)}
                placeholder="sk-ant-…"
                className="w-full text-xs text-ink border border-border rounded px-2 py-1.5 focus:outline-none focus:border-amber bg-white font-mono"
              />
              <p className="text-[10px] text-muted/60 mt-1">
                Stored locally in your SQLite database. Takes priority over ANTHROPIC_API_KEY env var.
              </p>
            </div>
            <div>
              <label className="text-xs text-muted block mb-1">Model name</label>
              <input
                value={local.ai_model ?? 'claude-sonnet-4-6'}
                onChange={e => update('ai_model', e.target.value)}
                placeholder="claude-sonnet-4-6"
                className="w-full text-xs text-ink border border-border rounded px-2 py-1.5 focus:outline-none focus:border-amber bg-white"
              />
            </div>
          </div>
        )}

        {(local.ai_provider ?? 'ollama') === 'ollama' && (
          <div className="mt-3">
            <label className="text-xs text-muted block mb-1">Ollama host</label>
            <input
              value={local.ollama_host ?? 'http://localhost:11434'}
              onChange={e => update('ollama_host', e.target.value)}
              placeholder="http://localhost:11434"
              className="w-full text-xs text-ink border border-border rounded px-2 py-1.5 focus:outline-none focus:border-amber bg-white"
            />
            <label className="text-xs text-muted block mb-1 mt-2">Model name</label>
            <input
              value={local.ai_model ?? 'mistral'}
              onChange={e => update('ai_model', e.target.value)}
              placeholder="llama3"
              className="w-full text-xs text-ink border border-border rounded px-2 py-1.5 focus:outline-none focus:border-amber bg-white"
            />
          </div>
        )}
      </section>

      {/* Data */}
      <section className="mb-8">
        <div className="text-[10px] text-muted uppercase tracking-wide font-medium mb-3">Data</div>
        <div className="flex flex-col gap-3">
          <div>
            <label className="text-xs text-muted block mb-1">Auto-archive after (days)</label>
            <input
              type="number"
              min={30}
              max={365}
              value={local.archive_days ?? '90'}
              onChange={e => update('archive_days', e.target.value)}
              className="w-24 text-sm text-ink border border-border rounded-md px-3 py-2 focus:outline-none focus:border-amber bg-white"
            />
          </div>
          <div className="flex gap-2">
            <button
              onClick={exportJson}
              className="text-xs text-amber border border-amber/40 rounded px-3 py-1.5 hover:bg-amber/5 transition-colors"
            >
              Export JSON
            </button>
            <button
              onClick={exportMarkdown}
              className="text-xs text-amber border border-amber/40 rounded px-3 py-1.5 hover:bg-amber/5 transition-colors"
            >
              Export Markdown
            </button>
          </div>
        </div>
      </section>

      <Button
        onClick={handleSave}
        disabled={saving}
        className={saved ? 'bg-green-600 hover:bg-green-600' : ''}
      >
        {saved ? <><Check size={14} /> Saved</> : saving ? 'Saving…' : 'Save settings'}
      </Button>
    </div>
  )
}
