import { BarChart2, TrendingUp, Bell } from 'lucide-react'

const COMING_SOON = [
  {
    Icon: BarChart2,
    title: 'Entry volume by bucket',
    desc: "See which promo criteria you're actively building evidence for over time.",
  },
  {
    Icon: TrendingUp,
    title: 'Impact level distribution',
    desc: 'Track whether your work is landing at team, org, or cross-org scope.',
  },
  {
    Icon: Bell,
    title: 'Smart nudges',
    desc: 'Get alerts like "No Technical Scope entries in 3 weeks" before your next review.',
  },
]

export function Insights() {
  return (
    <div className="p-6 max-w-2xl">
      <h1 className="text-base font-medium text-navy mb-0.5">Insights</h1>
      <p className="text-xs text-muted mb-8">
        Visibility analytics for your promo track — coming in v2.
      </p>

      <div className="flex flex-col gap-4">
        {COMING_SOON.map(({ Icon, title, desc }) => (
          <div
            key={title}
            className="flex gap-4 p-4 bg-white border border-border rounded-lg opacity-60"
          >
            <div className="w-8 h-8 rounded-md bg-navy/8 flex items-center justify-center flex-shrink-0">
              <Icon size={15} className="text-navy/50" />
            </div>
            <div>
              <div className="text-xs font-medium text-navy mb-0.5">{title}</div>
              <div className="text-[11px] text-muted leading-relaxed">{desc}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-8 p-4 border border-dashed border-amber/40 rounded-lg bg-amber/3 text-center">
        <p className="text-xs text-amber/80 font-medium mb-1">Feature flagged — not yet active</p>
        <p className="text-[11px] text-muted/70">
          The Insights data model is already in your SQLite schema.{' '}
          <a
            href="https://github.com/leelakumili/seen"
            target="_blank"
            rel="noreferrer"
            className="underline hover:text-amber transition-colors"
          >
            Watch the repo
          </a>{' '}
          for the v2 release.
        </p>
      </div>
    </div>
  )
}
