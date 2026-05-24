import { useEffect } from 'react'
import AuthWrapper from './components/layout/AuthWrapper'
import NavBar from './components/layout/NavBar'
import AIToolsSheet from './components/ai-tools/AIToolsSheet'
import { useApp } from './store/AppContext'
import TodayView from './views/TodayView'
import PlanningView from './views/PlanningView'
import BacklogView from './views/BacklogView'
import HistoryView from './views/HistoryView'
import SettingsView from './views/SettingsView'
import { useTasks } from './hooks/useTasks'
import { useMsal } from '@azure/msal-react'
import { getMe } from './lib/graph'

function AppContent() {
  const { state, dispatch, closeSheet } = useApp()
  const { loadTasks } = useTasks()
  const { accounts } = useMsal()

  useEffect(() => {
    loadTasks()
  }, [])

  useEffect(() => {
    if (accounts[0]) {
      getMe().then(me => dispatch({ type: 'SET_USER', payload: me })).catch(() => {})
    }
  }, [accounts])

  const VIEW_MAP = {
    today: TodayView,
    planning: PlanningView,
    backlog: BacklogView,
    history: HistoryView,
    settings: SettingsView,
  }

  const ActiveView = VIEW_MAP[state.activeView] || TodayView

  // Global sheet handler (for AI Tools opened from any view)
  const isAiSheet = state.bottomSheet?.type === 'aiTools'

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-[#111113]">
      <div className="flex-1 overflow-hidden pb-16">
        <ActiveView />
      </div>
      <NavBar />

      {/* Global AI Tools sheet */}
      <AIToolsSheet
        isOpen={isAiSheet}
        onClose={closeSheet}
        task={isAiSheet ? state.bottomSheet.data : null}
      />
    </div>
  )
}

export default function App() {
  return (
    <AuthWrapper>
      <AppContent />
    </AuthWrapper>
  )
}
