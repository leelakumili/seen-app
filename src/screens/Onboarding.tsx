/**
 * SAMPLE — Onboarding flow
 *
 * Shown on first launch when settings.onboarded !== 'true'.
 * Walks the user through 3 steps: profile, AI provider, first entry.
 * On completion writes onboarded=true to settings so it never shows again.
 *
 * To wire this in: check `settings.onboarded` in App.tsx and render
 * <Onboarding onComplete={() => refetchSettings()} /> instead of the main layout.
 */

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { ChevronRight, Check, User, Cpu, PenLine } from 'lucide-react'

type Step = 'profile' | 'ai' | 'first-entry'

const STEPS: { id: Step; label: string; icon: React.ReactNode }[] = [
  { id: 'profile',     label: 'Your profile',  icon: <User    size={14} /> },
  { id: 'ai',          label: 'AI provider',   icon: <Cpu     size={14} /> },
  { id: 'first-entry', label: 'First entry',   icon: <PenLine size={14} /> },
]

interface OnboardingProps {
  onComplete: () => void
}

export function Onboarding({ onComplete }: OnboardingProps) {
  const [step,    setStep]    = useState<Step>('profile')
  const [saving,  setSaving]  = useState(false)

  // Profile step
  const [name,    setName]    = useState('')
  const [role,    setRole]    = useState('')
  const [manager, setManager] = useState('')

  // AI step
  const [provider, setProvider] = useState<'ollama' | 'anthropic'>('ollama')
  const [apiKey,   setApiKey]   = useState('')
  const [model,    _setModel]   = useState('')

  // First entry
  const [entryContent, setEntryContent] = useState('')
  const [entrySaved,   setEntrySaved]   = useState(false)

  const stepIndex   = STEPS.findIndex(s => s.id === step)
  async function saveProfile() {
    if (!name.trim()) return
    setSaving(true)
    await Promise.all([
      window.seen.settings.set('user_name',    name.trim()),
      window.seen.settings.set('user_role',    role.trim()),
      window.seen.settings.set('manager_name', manager.trim()),
    ])
    setSaving(false)
    setStep('ai')
  }

  async function saveAi() {
    setSaving(true)
    await Promise.all([
      window.seen.settings.set('ai_provider', provider),
      apiKey ? window.seen.settings.set('anthropic_api_key', apiKey) : Promise.resolve(),
      model  ? window.seen.settings.set('ai_model', model)           : Promise.resolve(),
    ])
    setSaving(false)
    setStep('first-entry')
  }

  async function saveEntry() {
    if (!entryContent.trim()) return
    setSaving(true)
    await window.seen.entries.create({
      content:      entryContent.trim(),
      entry_type:   'win',
      bucket:       'execution',
      impact_level: 'team',
    })
    setEntrySaved(true)
    setSaving(false)
  }

  async function finish() {
    await window.seen.settings.set('onboarded', 'true')
    onComplete()
  }

  return (
    <div className="min-h-screen bg-ivory flex items-center justify-center p-6">
      <div className="w-full max-w-md">

        {/* Header */}
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-serif font-medium text-navy mb-1">Welcome to Seen</h1>
          <p className="text-sm text-muted">
            Set up takes two minutes. You'll log your first win before you're done.
          </p>
        </div>

        {/* Step indicators */}
        <div className="flex items-center gap-2 mb-8 justify-center">
          {STEPS.map((s, i) => (
            <div key={s.id} className="flex items-center gap-2">
              <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                s.id === step
                  ? 'bg-navy text-ivory'
                  : i < stepIndex
                  ? 'bg-green-100 text-green-700'
                  : 'bg-white border border-border text-muted'
              }`}>
                {i < stepIndex ? <Check size={11} /> : s.icon}
                {s.label}
              </div>
              {i < STEPS.length - 1 && (
                <ChevronRight size={12} className="text-muted/40" />
              )}
            </div>
          ))}
        </div>

        {/* Step content */}
        <div className="bg-white border border-border rounded-xl p-6 shadow-sm">

          {step === 'profile' && (
            <div className="flex flex-col gap-4">
              <div>
                <h2 className="text-sm font-medium text-navy mb-0.5">Tell us about yourself</h2>
                <p className="text-xs text-muted">This personalises the language in your brag docs and reviews.</p>
              </div>
              <div>
                <label className="text-xs text-muted block mb-1">Your name <span className="text-red-400">*</span></label>
                <input
                  autoFocus
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="Leela Kumili"
                  className="w-full text-sm text-ink border border-border rounded-md px-3 py-2 focus:outline-none focus:border-amber bg-white placeholder-muted/40"
                />
              </div>
              <div>
                <label className="text-xs text-muted block mb-1">Your current role</label>
                <input
                  value={role}
                  onChange={e => setRole(e.target.value)}
                  placeholder="Senior Engineer"
                  className="w-full text-sm text-ink border border-border rounded-md px-3 py-2 focus:outline-none focus:border-amber bg-white placeholder-muted/40"
                />
              </div>
              <div>
                <label className="text-xs text-muted block mb-1">Manager's name</label>
                <input
                  value={manager}
                  onChange={e => setManager(e.target.value)}
                  placeholder="Alex Chen"
                  className="w-full text-sm text-ink border border-border rounded-md px-3 py-2 focus:outline-none focus:border-amber bg-white placeholder-muted/40"
                />
              </div>
              <Button onClick={saveProfile} disabled={!name.trim() || saving} className="mt-2">
                {saving ? 'Saving…' : 'Continue'} <ChevronRight size={14} className="ml-1" />
              </Button>
            </div>
          )}

          {step === 'ai' && (
            <div className="flex flex-col gap-4">
              <div>
                <h2 className="text-sm font-medium text-navy mb-0.5">Choose your AI backend</h2>
                <p className="text-xs text-muted">Ollama runs fully local. Anthropic gives higher-quality output.</p>
              </div>
              <div className="flex flex-col gap-2">
                {(['ollama', 'anthropic'] as const).map(p => (
                  <label key={p} className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                    provider === p ? 'border-amber/50 bg-amber/5' : 'border-border bg-white'
                  }`}>
                    <input
                      type="radio"
                      name="provider"
                      value={p}
                      checked={provider === p}
                      onChange={() => setProvider(p)}
                      className="accent-amber mt-0.5"
                    />
                    <div>
                      <p className="text-sm text-ink font-medium">
                        {p === 'ollama' ? 'Ollama (local, default)' : 'Anthropic API'}
                      </p>
                      <p className="text-[11px] text-muted mt-0.5">
                        {p === 'ollama'
                          ? 'Private, free, requires Ollama running locally'
                          : 'Best output quality, requires an API key'}
                      </p>
                    </div>
                  </label>
                ))}
              </div>
              {provider === 'anthropic' && (
                <div>
                  <label className="text-xs text-muted block mb-1">API key</label>
                  <input
                    type="password"
                    value={apiKey}
                    onChange={e => setApiKey(e.target.value)}
                    placeholder="sk-ant-…"
                    className="w-full text-xs text-ink border border-border rounded px-2 py-1.5 focus:outline-none focus:border-amber bg-white font-mono"
                  />
                </div>
              )}
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setStep('profile')} size="sm">Back</Button>
                <Button onClick={saveAi} disabled={saving} className="flex-1">
                  {saving ? 'Saving…' : 'Continue'} <ChevronRight size={14} className="ml-1" />
                </Button>
              </div>
            </div>
          )}

          {step === 'first-entry' && (
            <div className="flex flex-col gap-4">
              <div>
                <h2 className="text-sm font-medium text-navy mb-0.5">Log your first win</h2>
                <p className="text-xs text-muted">
                  What's something you shipped, fixed, or unblocked recently? One sentence is enough.
                </p>
              </div>
              {entrySaved ? (
                <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg">
                  <Check size={14} className="text-green-600" />
                  <p className="text-xs text-green-700 font-medium">Entry saved. You're all set.</p>
                </div>
              ) : (
                <textarea
                  autoFocus
                  value={entryContent}
                  onChange={e => setEntryContent(e.target.value)}
                  rows={3}
                  placeholder="Shipped the new auth flow ahead of schedule, no P1s in the first 48h post-deploy."
                  className="w-full text-sm text-ink border border-border rounded-lg px-3 py-2.5 resize-none focus:outline-none focus:border-amber placeholder-muted/40"
                />
              )}
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setStep('ai')} size="sm" disabled={entrySaved}>Back</Button>
                {!entrySaved && (
                  <Button onClick={saveEntry} disabled={!entryContent.trim() || saving} className="flex-1">
                    {saving ? 'Saving…' : 'Save entry'}
                  </Button>
                )}
                {(entrySaved || !entryContent.trim()) && (
                  <Button onClick={finish} className={entrySaved ? 'flex-1' : 'flex-1'} variant={entrySaved ? 'default' : 'outline'}>
                    {entrySaved ? 'Go to Seen →' : 'Skip and finish'}
                  </Button>
                )}
              </div>
            </div>
          )}
        </div>

        <p className="text-center text-[11px] text-muted/50 mt-4">
          All data is stored locally on your machine. Nothing leaves your device.
        </p>
      </div>
    </div>
  )
}
