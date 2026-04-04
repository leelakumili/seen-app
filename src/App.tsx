import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { HashRouter, Routes, Route } from 'react-router-dom'
import { useEffect } from 'react'
import { Layout } from './components/Layout'
import { Home }     from './screens/Home'
import { Log }      from './screens/Log'
import { Amplify }   from './screens/Amplify'
import { Insights }  from './screens/Insights'
import { Settings }  from './screens/Settings'
import { useStore } from './store/useStore'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 30_000, retry: 1 },
  },
})

function AppInner() {
  const setSettings = useStore(s => s.setSettings)

  useEffect(() => {
    // Hydrate settings on mount
    window.seen?.settings.getAll().then(setSettings).catch(console.error)
  }, [setSettings])

  return (
    <HashRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route index        element={<Home />}     />
          <Route path="log"      element={<Log />}      />
          <Route path="amplify"  element={<Amplify />}  />
          <Route path="insights" element={<Insights />} />
          <Route path="settings" element={<Settings />} />
        </Route>
      </Routes>
    </HashRouter>
  )
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AppInner />
    </QueryClientProvider>
  )
}
