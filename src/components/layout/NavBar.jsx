import { useApp } from '../../store/AppContext'

const TABS = [
  { id: 'today', label: 'Today', icon: TodayIcon },
  { id: 'planning', label: 'Plan', icon: PlanIcon },
  { id: 'backlog', label: 'Backlog', icon: BacklogIcon },
  { id: 'history', label: 'History', icon: HistoryIcon },
  { id: 'settings', label: 'Settings', icon: SettingsIcon },
]

export default function NavBar() {
  const { state, dispatch } = useApp()
  const active = state.activeView

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-[#111113]/90 backdrop-blur border-t border-[#1a1a1e] pb-safe z-40">
      <div className="flex">
        {TABS.map(tab => {
          const Icon = tab.icon
          const isActive = active === tab.id
          return (
            <button
              key={tab.id}
              onClick={() => dispatch({ type: 'SET_ACTIVE_VIEW', payload: tab.id })}
              className={`flex-1 flex flex-col items-center justify-center py-2 gap-1 touch-target transition-colors ${
                isActive ? 'text-[#3b82f6]' : 'text-[#71717a]'
              }`}
            >
              <Icon active={isActive} />
              <span className="text-[10px] font-medium">{tab.label}</span>
            </button>
          )
        })}
      </div>
    </nav>
  )
}

function TodayIcon({ active }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
      <rect x="3" y="4" width="18" height="18" rx="3" stroke="currentColor" strokeWidth="1.8"
        fill={active ? 'currentColor' : 'none'} fillOpacity="0.1" />
      <path d="M8 2v3M16 2v3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M3 9h18" stroke="currentColor" strokeWidth="1.8" />
      {active && <rect x="8" y="13" width="3" height="3" rx="0.5" fill="currentColor" />}
    </svg>
  )
}

function PlanIcon({ active }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
      <path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2"
        stroke="currentColor" strokeWidth="1.8" />
      <rect x="9" y="3" width="6" height="4" rx="1" stroke="currentColor" strokeWidth="1.8"
        fill={active ? 'currentColor' : 'none'} fillOpacity="0.15" />
      <path d="M9 12h6M9 16h4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  )
}

function BacklogIcon({ active }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
      <path d="M8 6h13M8 12h13M8 18h13" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <circle cx="3.5" cy="6" r="1.5" fill="currentColor" />
      <circle cx="3.5" cy="12" r="1.5" fill="currentColor" />
      <circle cx="3.5" cy="18" r="1.5" fill={active ? 'currentColor' : 'none'}
        stroke={active ? 'none' : 'currentColor'} strokeWidth="1.5" />
    </svg>
  )
}

function HistoryIcon({ active }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
      <path d="M12 8v4l2.5 2.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M3.05 12A9 9 0 1 0 4.2 7M3 3v4.2L7.2 7"
        stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"
        fill={active ? 'currentColor' : 'none'} fillOpacity="0.08" />
    </svg>
  )
}

function SettingsIcon({ active }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.8"
        fill={active ? 'currentColor' : 'none'} fillOpacity="0.2" />
      <path
        d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"
        stroke="currentColor" strokeWidth="1.8" />
    </svg>
  )
}
