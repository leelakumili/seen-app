import { useState, useRef, useEffect, useCallback, useMemo } from 'react'
import ReactMarkdown, { defaultUrlTransform } from 'react-markdown'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { currentQuarter, formatDate, BUCKET_COLORS, DEFAULT_BUCKETS, ENTRY_TYPE_LABELS } from '@/lib/utils'
import { Loader2, Send, Bot, User, Pencil, RotateCcw, Check, Copy, Download, ExternalLink, X } from 'lucide-react'
import type { Generation, Entry } from '@/types'

// Convert [entry:uuid] tokens to a markdown link the custom renderer can intercept
function processEntryLinks(content: string): string {
  return content.replace(/\[entry:([a-f0-9-]{36})\]/g, '[↗](entry:$1)')
}

type TabType = 'brag_doc' | 'quarterly' | 'ask'
type ChatMessage = { role: 'user' | 'assistant'; content: string }

const TABS: { id: TabType; label: string; desc: string }[] = [
  { id: 'brag_doc',  label: 'Brag Doc',        desc: 'Monthly brag statements organized by goal area'               },
  { id: 'quarterly', label: 'Quarterly Review', desc: 'Situation, task, and outcome narrative for your review cycle' },
  { id: 'ask',       label: 'Ask',              desc: 'Ask anything about your work and career progress'             },
]

const QUARTERS = ['Q1', 'Q2', 'Q3', 'Q4']

// Generate a rolling 4-year window centred on the current year
function yearOptions(): number[] {
  const current = new Date().getFullYear()
  return [current - 1, current, current + 1, current + 2]
}

const QUARTER_MONTHS: Record<string, { num: number; label: string; short: string }[]> = {
  Q1: [{ num: 1, label: 'January',   short: 'Jan' }, { num: 2, label: 'February',  short: 'Feb' }, { num: 3, label: 'March',     short: 'Mar' }],
  Q2: [{ num: 4, label: 'April',     short: 'Apr' }, { num: 5, label: 'May',        short: 'May' }, { num: 6, label: 'June',      short: 'Jun' }],
  Q3: [{ num: 7, label: 'July',      short: 'Jul' }, { num: 8, label: 'August',     short: 'Aug' }, { num: 9, label: 'September', short: 'Sep' }],
  Q4: [{ num: 10,label: 'October',   short: 'Oct' }, { num: 11,label: 'November',   short: 'Nov' }, { num: 12,label: 'December',  short: 'Dec' }],
}

const PROSE_CLASS = 'text-xs text-ink leading-relaxed prose prose-sm max-w-none prose-headings:text-navy prose-headings:font-semibold prose-headings:text-sm prose-strong:text-ink prose-li:my-0.5'

export function Amplify() {
  const navigate = useNavigate()
  const [streamBuffer, setStreamBuffer] = useState('')
  const appendStream = useCallback((chunk: string) => setStreamBuffer(prev => prev + chunk), [])
  const clearStream  = useCallback(() => setStreamBuffer(''), [])

  const [activeTab,  setActiveTab]  = useState<TabType>('brag_doc')
  const [quarter,    setQuarter]    = useState(currentQuarter())
  const [year,       setYear]       = useState(new Date().getFullYear())
  const [generating, setGenerating] = useState(false)
  const [copied,     setCopied]     = useState(false)

  // Brag doc state
  const [selectedMonth,     setSelectedMonth]     = useState<number | null>(null)
  const [bragMonthSaved,    setBragMonthSaved]    = useState<string | null>(null)

  // Quarterly state
  const [generation,  setGeneration]  = useState<Generation | null>(null)
  const [isEditing,   setIsEditing]   = useState(false)
  const [editContent, setEditContent] = useState('')
  const [saving,      setSaving]      = useState(false)

  // Ask / chat state
  const [messages,   setMessages]   = useState<ChatMessage[]>([])
  const [chatInput,  setChatInput]  = useState('')
  const [chatting,   setChatting]   = useState(false)
  const [liveReply,  setLiveReply]  = useState('')
  const [bragMode,   setBragMode]   = useState(false)
  const [entryPopover, setEntryPopover] = useState<{ entry: Entry; x: number; y: number } | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // ── Entry lookup for citation popovers ───────────────────────────────────

  const { data: chatEntries = [] } = useQuery<Entry[]>({
    queryKey: ['entries', 'all'],
    queryFn:  () => window.seen.entries.list(),
    enabled:  activeTab === 'ask',
    staleTime: 60_000,
  })
  const entryMap = useMemo(
    () => Object.fromEntries(chatEntries.map(e => [e.id, e])),
    [chatEntries]
  )

  // ── Load existing quarterly generation ───────────────────────────────────

  const loadQuarterly = useCallback(async () => {
    if (!window.seen) return
    clearStream()
    setGeneration(null)
    setIsEditing(false)
    const existing = await window.seen.generations.get({ type: 'quarterly', quarter, year })
    setGeneration(existing)
  }, [quarter, year, clearStream])

  useEffect(() => {
    if (activeTab === 'quarterly') {
      loadQuarterly()
    } else if (activeTab === 'brag_doc') {
      clearStream()
      setSelectedMonth(null)
      setBragMonthSaved(null)
    }
  }, [activeTab, loadQuarterly, clearStream])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, liveReply])

  // ── Brag doc: generate for a month ───────────────────────────────────────

  async function selectMonth(month: number) {
    if (!window.seen || generating) return
    setSelectedMonth(month)
    setBragMonthSaved(null)
    clearStream()
    // Load persisted output for this month if it exists
    const existing = await window.seen.generations.get({ type: 'brag_month', year, month })
    if (existing?.output) setBragMonthSaved(existing.output)
  }

  async function generateBragMonth(month: number) {
    if (!window.seen) return
    clearStream()
    setBragMonthSaved(null)
    setGenerating(true)
    try {
      window.seen.ai.onStream(appendStream)
      await window.seen.ai.generateBragMonth({ quarter, year, month })
      // Load the freshly saved generation from DB so it survives navigation
      const saved = await window.seen.generations.get({ type: 'brag_month', year, month })
      if (saved?.output) setBragMonthSaved(saved.output)
    } finally {
      window.seen.ai.offStream()
      setGenerating(false)
    }
  }

  // ── Quarterly: generate ───────────────────────────────────────────────────

  async function generateQuarterly() {
    if (!window.seen) return
    setGenerating(true)
    setGeneration(null)
    setIsEditing(false)
    clearStream()
    try {
      window.seen.ai.onStream(appendStream)
      const result = await window.seen.ai.generateQuarterly({ quarter, year })
      if (result) {
        if (result.id) {
          const saved = await window.seen.generations.get({ type: 'quarterly', quarter, year })
          setGeneration(saved)
        } else {
          // No entries: persist message as generation output so it survives setGenerating(false)
          setGeneration({ id: '', output: result.output, type: 'quarterly', quarter, year, month: null, date_range_start: null, date_range_end: null, created_at: new Date().toISOString() })
        }
        clearStream()
      }
    } finally {
      window.seen.ai.offStream()
      setGenerating(false)
    }
  }

  // ── Edit & save (quarterly) ───────────────────────────────────────────────

  function startEdit() {
    setEditContent(generation?.output ?? '')
    setIsEditing(true)
  }

  async function saveEdit() {
    if (!generation?.id) return
    setSaving(true)
    try {
      await window.seen.generations.save(generation.id, editContent)
      setGeneration({ ...generation, output: editContent })
      setIsEditing(false)
    } finally {
      setSaving(false)
    }
  }

  function cancelEdit() {
    setIsEditing(false)
    setEditContent('')
  }

  async function copyOutput(text: string) {
    await navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  async function exportOutput(text: string, defaultName: string) {
    if (!window.seen) return
    await window.seen.file.save(text, defaultName)
  }

  // ── Ask / chat ────────────────────────────────────────────────────────────

  async function sendMessage() {
    const text = chatInput.trim()
    if (!text || chatting || !window.seen) return
    const next: ChatMessage[] = [...messages, { role: 'user', content: text }]
    setMessages(next)
    setChatInput('')
    setChatting(true)
    setLiveReply('')
    let reply = ''
    try {
      window.seen.ai.onStream((chunk) => { reply += chunk; setLiveReply(reply) })
      await window.seen.ai.ask(next, bragMode ? 'brag' : 'normal')
      setMessages(prev => [...prev, { role: 'assistant', content: reply }])
    } finally {
      window.seen.ai.offStream()
      setLiveReply('')
      setChatting(false)
    }
  }

  function handleChatKey(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage() }
  }

  // ── Markdown components ───────────────────────────────────────────────────

  const markdownComponents = {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    a: ({ href, children }: any) => {
      if (href?.startsWith('entry:')) {
        const id = href.slice(6)
        return (
          <button
            onClick={(e) => {
              e.stopPropagation()
              const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
              setEntryPopover(prev => prev?.entry.id === id ? null : {
                entry: entryMap[id],
                x: rect.left,
                y: rect.bottom + 6,
              })
            }}
            className="inline-flex items-center gap-0.5 text-amber hover:text-amber-light text-[10px] underline underline-offset-2 cursor-pointer align-baseline ml-0.5"
          >
            {children}<ExternalLink size={9} className="inline" />
          </button>
        )
      }
      return <span>{children}</span>
    },
  }

  // ── Derived ───────────────────────────────────────────────────────────────

  const activeTabMeta   = TABS.find(t => t.id === activeTab)!
  const quarterMonths   = QUARTER_MONTHS[quarter] ?? []
  const hasQuarterlyOut = !!generation?.output
  const monthLabel      = quarterMonths.find(m => m.num === selectedMonth)?.label ?? ''

  // Period selector (shared between brag + quarterly tabs)
  const periodSelector = (
    <div className="flex items-center gap-2 mb-5">
      <div className="flex gap-1">
        {QUARTERS.map(q => (
          <button key={q} onClick={() => { setQuarter(q) }}
            className={`px-2.5 py-1 rounded text-xs border transition-colors ${
              quarter === q ? 'bg-navy text-ivory border-navy' : 'bg-white border-border text-muted hover:border-navy/40'
            }`}>
            {q}
          </button>
        ))}
      </div>
      <select value={year} onChange={e => setYear(Number(e.target.value))}
        className="text-xs border border-border rounded px-2 py-1 text-ink focus:outline-none focus:border-amber bg-white">
        {yearOptions().map(y => (
          <option key={y} value={y}>{y}</option>
        ))}
      </select>
    </div>
  )

  return (
    <div className="p-6 max-w-2xl flex flex-col">
      {/* ── Entry citation popover ── */}
      {entryPopover?.entry && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setEntryPopover(null)} />
          <div
            className="fixed z-50 w-[272px] bg-white border border-border rounded-lg shadow-lg p-3"
            style={{
              left: Math.min(entryPopover.x, window.innerWidth - 284),
              top:  entryPopover.y,
            }}
          >
            <div className="flex items-start justify-between gap-2 mb-2">
              <div className="flex items-center gap-1.5 min-w-0">
                <div
                  className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                  style={{ background: BUCKET_COLORS[entryPopover.entry.bucket] ?? '#8a7e6a' }}
                />
                <span className="text-[10px] text-muted truncate">
                  {DEFAULT_BUCKETS.find(b => b.id === entryPopover.entry.bucket)?.name ?? entryPopover.entry.bucket}
                  {' · '}
                  {ENTRY_TYPE_LABELS[entryPopover.entry.entry_type] ?? entryPopover.entry.entry_type}
                  {' · '}
                  {formatDate(entryPopover.entry.created_at)}
                </span>
              </div>
              <button onClick={() => setEntryPopover(null)} className="text-muted/40 hover:text-muted flex-shrink-0">
                <X size={11} />
              </button>
            </div>
            <p className="text-xs text-ink leading-relaxed">{entryPopover.entry.content}</p>
            <button
              onClick={() => { navigate(`/log?highlight=${entryPopover.entry.id}`); setEntryPopover(null) }}
              className="mt-2.5 text-[10px] text-amber hover:text-amber-light transition-colors flex items-center gap-1"
            >
              View in Log <ExternalLink size={9} />
            </button>
          </div>
        </>
      )}

      <h1 className="text-base font-medium text-navy mb-0.5">Amplify</h1>
      <p className="text-xs text-muted mb-5">Generate structured outputs from your logged entries.</p>

      {/* Tabs */}
      <div className="flex gap-0 border-b border-border mb-6">
        {TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => { setActiveTab(tab.id); setIsEditing(false) }}
            className={`px-4 py-2.5 text-xs font-medium border-b-2 transition-colors -mb-px ${
              activeTab === tab.id
                ? 'border-amber text-navy'
                : 'border-transparent text-muted hover:text-ink'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ── Ask tab ── */}
      {activeTab === 'ask' ? (
        <div className="flex flex-col gap-4">
          <p className="text-xs text-muted/70 italic">{activeTabMeta.desc}</p>

          <div className="flex flex-col gap-3 min-h-[200px] max-h-[420px] overflow-y-auto pr-1">
            {messages.length === 0 && !chatting && (
              <div className="text-xs text-muted/50 py-8 text-center">
                Ask anything — "What are my biggest wins this quarter?",
                "Am I thin on Technical Scope?", "Draft an answer to 'describe your impact this year'."
              </div>
            )}
            {messages.map((msg, i) => (
              <div key={i} className={`flex gap-2.5 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                {msg.role === 'assistant' && (
                  <div className="w-6 h-6 rounded-full bg-navy/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Bot size={12} className="text-navy/60" />
                  </div>
                )}
                <div className={`max-w-[82%] rounded-lg px-3 py-2 text-xs leading-relaxed ${
                  msg.role === 'user'
                    ? 'bg-navy text-ivory'
                    : `bg-white border border-border ${PROSE_CLASS}`
                }`}>
                  {msg.role === 'assistant'
                    ? <ReactMarkdown components={markdownComponents} urlTransform={(url) => url.startsWith('entry:') ? url : defaultUrlTransform(url)}>{processEntryLinks(msg.content)}</ReactMarkdown>
                    : msg.content}
                </div>
                {msg.role === 'user' && (
                  <div className="w-6 h-6 rounded-full bg-amber/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <User size={12} className="text-amber" />
                  </div>
                )}
              </div>
            ))}
            {chatting && (
              <div className="flex gap-2.5 justify-start">
                <div className="w-6 h-6 rounded-full bg-navy/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Bot size={12} className="text-navy/60" />
                </div>
                <div className={`max-w-[82%] rounded-lg px-3 py-2 bg-white border border-border ${PROSE_CLASS}`}>
                  {liveReply
                    ? <><ReactMarkdown components={markdownComponents} urlTransform={(url) => url.startsWith('entry:') ? url : defaultUrlTransform(url)}>{processEntryLinks(liveReply)}</ReactMarkdown><span className="animate-pulse text-amber">▋</span></>
                    : <span className="text-muted/50 animate-pulse">Thinking…</span>}
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          <div className="flex items-center gap-2 mb-1">
            <button
              onClick={() => setBragMode(b => !b)}
              className={`text-[11px] px-2.5 py-1 rounded border transition-colors ${
                bragMode
                  ? 'bg-amber/15 border-amber/50 text-navy font-medium'
                  : 'bg-white border-border text-muted hover:border-amber/40 hover:text-ink'
              }`}
            >
              {bragMode ? 'Brag mode on' : 'Brag mode'}
            </button>
            <span className="text-[10px] text-muted/50">
              {bragMode ? 'Answers will highlight your wins boldly' : 'Toggle for confident, impact-forward answers'}
            </span>
          </div>

          <div className="flex gap-2 items-end">
            <textarea
              value={chatInput}
              onChange={e => setChatInput(e.target.value)}
              onKeyDown={handleChatKey}
              disabled={chatting}
              rows={2}
              placeholder="Ask about your entries… (Enter to send, Shift+Enter for newline)"
              className="flex-1 text-xs text-ink placeholder-muted/50 border border-border rounded-lg px-3 py-2.5 resize-none focus:outline-none focus:border-amber disabled:opacity-50"
            />
            <Button onClick={sendMessage} disabled={chatting || !chatInput.trim()} size="sm" className="flex-shrink-0 h-[58px] px-3">
              {chatting ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
            </Button>
          </div>
          {messages.length > 0 && (
            <button onClick={() => { setMessages([]); setLiveReply('') }}
              className="text-[10px] text-muted/50 hover:text-muted transition-colors self-start">
              Clear conversation
            </button>
          )}
        </div>

      ) : activeTab === 'brag_doc' ? (

        /* ── Brag Doc tab ── */
        <>
          <p className="text-xs text-muted/70 mb-4 italic">{activeTabMeta.desc}</p>

          {periodSelector}

          {/* Month picker */}
          <div className="flex items-center gap-2 mb-5">
            <span className="text-xs text-muted mr-1">Month</span>
            {quarterMonths.map(m => (
              <button
                key={m.num}
                onClick={() => selectMonth(m.num)}
                disabled={generating}
                className={`px-3 py-1.5 rounded text-xs border transition-colors disabled:opacity-40 ${
                  selectedMonth === m.num
                    ? 'bg-amber/15 border-amber/50 text-navy font-medium'
                    : 'bg-white border-border text-muted hover:border-amber/40 hover:text-ink'
                }`}
              >
                {m.label}
              </button>
            ))}
            {(bragMonthSaved || streamBuffer) && !generating && (
              <div className="ml-auto flex items-center gap-1.5">
                <button onClick={() => generateBragMonth(selectedMonth!)}
                  className="flex items-center gap-1 text-[11px] text-muted hover:text-navy border border-border rounded px-2.5 py-1.5 transition-colors">
                  <RotateCcw size={11} /> Regenerate
                </button>
                <button onClick={() => copyOutput(bragMonthSaved ?? streamBuffer)}
                  className="flex items-center gap-1 text-[11px] text-muted hover:text-ink border border-border rounded px-2.5 py-1.5 transition-colors">
                  {copied ? <><Check size={11} /> Copied</> : <><Copy size={11} /> Copy</>}
                </button>
                <button onClick={() => exportOutput(bragMonthSaved ?? streamBuffer, `brag-${monthLabel.toLowerCase()}-${year}.txt`)}
                  className="flex items-center gap-1 text-[11px] text-muted hover:text-ink border border-border rounded px-2.5 py-1.5 transition-colors">
                  <Download size={11} /> Export
                </button>
              </div>
            )}
          </div>

          {/* Output */}
          {generating ? (
            <div className="bg-white border border-border rounded-lg p-5">
              <div className="text-[10px] text-muted uppercase tracking-wide font-medium mb-3">
                Generating brag statements for {monthLabel}…
              </div>
              <div className="text-xs text-ink leading-relaxed prose prose-sm max-w-none prose-headings:text-navy prose-headings:font-semibold prose-headings:text-sm prose-strong:text-ink prose-li:my-0.5">
                {streamBuffer
                  ? <ReactMarkdown>{streamBuffer}</ReactMarkdown>
                  : <span className="text-muted/50 animate-pulse">Starting…</span>}
                <span className="animate-pulse text-amber">▋</span>
              </div>
            </div>
          ) : (bragMonthSaved || streamBuffer) ? (
            <div className="bg-white border border-border rounded-lg p-5">
              <div className="text-[10px] text-muted uppercase tracking-wide font-medium mb-3">
                {monthLabel} {year} — Brag statements
                {bragMonthSaved && (
                  <span className="text-muted/50 normal-case font-normal ml-2">· saved</span>
                )}
              </div>
              <div className="text-xs text-ink leading-relaxed prose prose-sm max-w-none prose-headings:text-navy prose-headings:font-semibold prose-headings:text-sm prose-strong:text-ink prose-li:my-0.5">
                <ReactMarkdown>{bragMonthSaved ?? streamBuffer}</ReactMarkdown>
              </div>
            </div>
          ) : selectedMonth ? (
            <div className="border border-dashed border-border rounded-lg p-10 text-center">
              <p className="text-xs text-muted/60">No output yet. Hit Generate above.</p>
              <button onClick={() => generateBragMonth(selectedMonth)}
                className="mt-3 text-xs text-amber hover:text-amber-light transition-colors">
                Generate now
              </button>
            </div>
          ) : (
            <div className="border border-dashed border-border rounded-lg p-10 text-center">
              <p className="text-xs text-muted/60">
                Select a month above to generate brag statements.
              </p>
            </div>
          )}
        </>

      ) : (

        /* ── Quarterly Review tab ── */
        <>
          <p className="text-xs text-muted/70 mb-4 italic">{activeTabMeta.desc}</p>

          {periodSelector}

          {/* Action buttons */}
          <div className="flex items-center gap-2 mb-5">
            {hasQuarterlyOut && !generating && (
              <>
                <button onClick={() => copyOutput(isEditing ? editContent : (generation?.output ?? ''))}
                  className="flex items-center gap-1 text-[11px] text-muted hover:text-ink border border-border rounded px-2.5 py-1.5 transition-colors">
                  {copied ? <><Check size={11} /> Copied</> : <><Copy size={11} /> Copy</>}
                </button>
                <button onClick={() => exportOutput(isEditing ? editContent : (generation?.output ?? ''), `quarterly-${quarter}-${year}.txt`)}
                  className="flex items-center gap-1 text-[11px] text-muted hover:text-ink border border-border rounded px-2.5 py-1.5 transition-colors">
                  <Download size={11} /> Export
                </button>
                {!isEditing && generation?.id && (
                  <button onClick={startEdit}
                    className="flex items-center gap-1 text-[11px] text-muted hover:text-navy border border-border rounded px-2.5 py-1.5 transition-colors">
                    <Pencil size={11} /> Edit
                  </button>
                )}
                <Button onClick={generateQuarterly} disabled={generating} size="sm" variant="outline"
                  className="flex items-center gap-1.5 text-xs ml-auto">
                  <RotateCcw size={12} /> Regenerate
                </Button>
              </>
            )}
            {!hasQuarterlyOut && !generating && (
              <Button onClick={generateQuarterly} size="sm">Generate</Button>
            )}
            {generating && (
              <Button disabled size="sm">
                <Loader2 size={12} className="animate-spin mr-1.5" /> Generating…
              </Button>
            )}
          </div>

          {/* Output area */}
          {generating ? (
            <div className="bg-white border border-border rounded-lg p-5">
              <div className="text-[10px] text-muted uppercase tracking-wide font-medium mb-3">Generating…</div>
              <div className="text-xs text-ink leading-relaxed prose prose-sm max-w-none prose-headings:text-navy prose-headings:font-semibold prose-headings:text-sm prose-strong:text-ink prose-li:my-0.5">
                {streamBuffer
                  ? <ReactMarkdown>{streamBuffer}</ReactMarkdown>
                  : <span className="text-muted/50 animate-pulse">Starting…</span>}
                <span className="animate-pulse text-amber">▋</span>
              </div>
            </div>
          ) : isEditing ? (
            <div className="bg-white border border-amber/40 rounded-lg p-5">
              <div className="text-[10px] text-muted uppercase tracking-wide font-medium mb-3">
                Editing — changes save to your local DB
              </div>
              <textarea
                value={editContent}
                onChange={e => setEditContent(e.target.value)}
                className="w-full text-xs text-ink leading-relaxed font-mono resize-none focus:outline-none min-h-[360px]"
                autoFocus
              />
              <div className="flex gap-2 mt-4 pt-3 border-t border-border">
                <Button onClick={saveEdit} disabled={saving} size="sm">
                  {saving ? 'Saving…' : <><Check size={12} className="mr-1" /> Save changes</>}
                </Button>
                <Button onClick={cancelEdit} variant="outline" size="sm">Cancel</Button>
                <button onClick={() => copyOutput(editContent)}
                  className="ml-auto text-[11px] text-muted hover:text-ink transition-colors flex items-center gap-1">
                  <Copy size={11} /> Copy
                </button>
              </div>
            </div>
          ) : hasQuarterlyOut ? (
            <div className="bg-white border border-border rounded-lg p-5">
              <div className="text-[10px] text-muted uppercase tracking-wide font-medium mb-3">
                Saved output
                {generation?.created_at && (
                  <span className="text-muted/50 normal-case font-normal ml-2">
                    · last generated {new Date(generation.created_at).toLocaleDateString()}
                  </span>
                )}
              </div>
              <div className="text-xs text-ink leading-relaxed prose prose-sm max-w-none prose-headings:text-navy prose-headings:font-semibold prose-headings:text-sm prose-strong:text-ink prose-li:my-0.5">
                <ReactMarkdown>{generation?.output ?? ''}</ReactMarkdown>
              </div>
            </div>
          ) : (
            <div className="border border-dashed border-border rounded-lg p-10 text-center">
              <p className="text-xs text-muted/60">
                No saved output for this period yet. Hit Generate to create one.
              </p>
            </div>
          )}
        </>
      )}
    </div>
  )
}
