import { NavLink } from 'react-router-dom'
import { Home, BookOpen, Zap, BarChart2, Settings } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useStore } from '@/store/useStore'
import logoUrl from '@/assets/logo.svg'

const NAV = [
  { to: '/',          label: 'Home',     Icon: Home      },
  { to: '/log',       label: 'Log',      Icon: BookOpen  },
  { to: '/amplify',   label: 'Amplify',  Icon: Zap       },
  { to: '/insights',  label: 'Insights', Icon: BarChart2 },
  { to: '/settings',  label: 'Settings', Icon: Settings  },
]

export function Sidebar() {
  const settings = useStore(s => s.settings)
  const initials = (settings.user_name ?? 'LK')
    .split(' ')
    .map(w => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()

  return (
    <nav className="w-[188px] flex-shrink-0 bg-navy flex flex-col h-full">
      {/* macOS traffic-light spacer */}
      <div className="drag-region h-7 flex-shrink-0" />
      {/* Logo */}
      <div className="px-4 pt-2 pb-4 border-b border-amber/20 mb-2">
        <div className="flex items-center gap-2.5">
          <img src={logoUrl} alt="Seen logo" className="w-7 h-7 flex-shrink-0 rounded-lg" />
          <div>
            <div className="text-ivory text-sm font-bold font-display tracking-tight leading-none">seen</div>
            <div className="border-t border-amber/50 mt-1.5 mb-1" />
            <div className="text-ivory/40 text-[9px] tracking-widest uppercase leading-none">Visibility Engine</div>
          </div>
        </div>
      </div>

      {/* Nav links */}
      <div className="flex-1 px-2 py-1 flex flex-col gap-0.5">
        {NAV.map(({ to, label, Icon }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-2.5 px-3 py-2 rounded-md text-xs transition-colors',
                isActive
                  ? 'bg-amber/18 text-amber'
                  : 'text-ivory/45 hover:bg-amber/10 hover:text-ivory/80',
              )
            }
          >
            {({ isActive }) => (
              <>
                <span className={cn('w-1.5 h-1.5 rounded-full bg-current flex-shrink-0', isActive ? 'opacity-100' : 'opacity-50')} />
                <Icon size={13} className="flex-shrink-0" />
                {label}
              </>
            )}
          </NavLink>
        ))}
      </div>

      {/* User footer */}
      <div className="px-4 py-3 border-t border-amber/18 mt-auto">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-full bg-amber/20 flex items-center justify-center text-[10px] font-medium text-amber flex-shrink-0">
            {initials}
          </div>
          <div>
            <div className="text-ivory/60 text-[11px] truncate max-w-[120px]">
              {settings.user_name ?? 'Your Name'}
            </div>
            <div className="text-ivory/30 text-[10px] truncate max-w-[120px]">
              {settings.user_role ?? 'Engineering Lead'}
            </div>
          </div>
        </div>
      </div>
    </nav>
  )
}
