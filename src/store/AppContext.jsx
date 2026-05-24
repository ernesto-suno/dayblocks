import { createContext, useContext, useReducer, useCallback } from 'react'

const AppContext = createContext(null)

const initialState = {
  // Tasks
  tasks: [],
  tasksLoading: false,

  // Today's calendar events (from Outlook)
  calendarEvents: [],
  calendarLoading: false,

  // Carry-forward banner
  rolloverTasks: [],
  showRolloverBanner: false,

  // Active focus session
  focusTask: null,

  // UI state
  activeView: 'today',
  bottomSheet: null, // { type, data }

  // Settings
  settings: {
    workDayStart: '07:00',
    workDayEnd: '22:00',
    defaultTaskDuration: 30,
    focusCheckInInterval: 10,
    planningReminderTime: '08:00',
  },

  // User info
  user: null,
}

function reducer(state, action) {
  switch (action.type) {
    case 'SET_TASKS':
      return { ...state, tasks: action.payload, tasksLoading: false }
    case 'SET_TASKS_LOADING':
      return { ...state, tasksLoading: action.payload }
    case 'ADD_TASK':
      return { ...state, tasks: [action.payload, ...state.tasks] }
    case 'UPDATE_TASK':
      return {
        ...state,
        tasks: state.tasks.map(t => t.id === action.payload.id ? { ...t, ...action.payload } : t),
      }
    case 'REMOVE_TASK':
      return { ...state, tasks: state.tasks.filter(t => t.id !== action.payload) }

    case 'SET_CALENDAR_EVENTS':
      return { ...state, calendarEvents: action.payload, calendarLoading: false }
    case 'SET_CALENDAR_LOADING':
      return { ...state, calendarLoading: action.payload }

    case 'SET_ROLLOVER_TASKS':
      return {
        ...state,
        rolloverTasks: action.payload,
        showRolloverBanner: action.payload.length > 0,
      }
    case 'DISMISS_ROLLOVER':
      return { ...state, showRolloverBanner: false }

    case 'SET_FOCUS_TASK':
      return { ...state, focusTask: action.payload }
    case 'CLEAR_FOCUS':
      return { ...state, focusTask: null }

    case 'SET_ACTIVE_VIEW':
      return { ...state, activeView: action.payload }
    case 'OPEN_SHEET':
      return { ...state, bottomSheet: { type: action.payload.type, data: action.payload.data } }
    case 'CLOSE_SHEET':
      return { ...state, bottomSheet: null }

    case 'UPDATE_SETTINGS':
      return { ...state, settings: { ...state.settings, ...action.payload } }

    case 'SET_USER':
      return { ...state, user: action.payload }

    default:
      return state
  }
}

export function AppProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, initialState)

  const openSheet = useCallback((type, data = null) => {
    dispatch({ type: 'OPEN_SHEET', payload: { type, data } })
  }, [])

  const closeSheet = useCallback(() => {
    dispatch({ type: 'CLOSE_SHEET' })
  }, [])

  return (
    <AppContext.Provider value={{ state, dispatch, openSheet, closeSheet }}>
      {children}
    </AppContext.Provider>
  )
}

export function useApp() {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useApp must be used inside AppProvider')
  return ctx
}
