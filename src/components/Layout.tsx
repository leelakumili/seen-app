import { Outlet } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { QuickLogModal } from './QuickLogModal'
import { useStore } from '@/store/useStore'
import { Button } from '@/components/ui/button'
import { Plus } from 'lucide-react'

export function Layout() {
  const setQuickLogOpen = useStore(s => s.setQuickLogOpen)

  return (
    <div className="flex h-screen overflow-hidden bg-ivory font-body">
      <Sidebar />

      <main className="flex-1 overflow-auto relative">
        <Outlet />

        {/* Floating Quick Log button */}
        <Button
          variant="default"
          className="fixed bottom-4 right-4 shadow-lg rounded-full px-4 py-2 text-xs font-medium z-40"
          onClick={() => setQuickLogOpen(true)}
        >
          <Plus size={14} />
          Quick log
        </Button>
      </main>

      <QuickLogModal />
    </div>
  )
}
