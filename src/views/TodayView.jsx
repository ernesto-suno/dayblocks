import { useState, useEffect } from 'react'
import { format } from 'date-fns'
import { AnimatePresence, motion } from 'framer-motion'
import { useTasks } from '../hooks/useTasks'
import { useCalendar } from '../hooks/useCalendar'
import { useApp } from '../store/AppContext'
import Timeline from '../components/today/Timeline'
import TaskDetailSheet from '../components/today/TaskDetailSheet'
import QuickAddSheet from '../components/shared/QuickAddSheet'
import ScheduleSheet from '../components/shared/ScheduleSheet'
import AIToolsSheet from '../components/ai-tools/AIToolsSheet'
import LoadingSpinner from '../components/shared/LoadingSpinner'
import FocusMode from './FocusMode'

export default function TodayView() {
  const { tasks, completeTask, deleteTask, runCarryForward } = useTasks()
  const { calendarEvents, calendarLoading, loadCalendarEvents, getFreeSlots } = useCalendar()
  const { state, dispatch } = useApp()

  const [selectedTask, setSelectedTask] = useState(null)
  const [addOpen, setAddOpen] = useState(false)
  const [addDefaultTime, setAddDefaultTime] = useState(null)
  const [scheduleTask, setScheduleTask] = useState(null)
  const [aiTask, setAiTask] = useState(null)
  const [focusTask, setFocusTask] = useState(null)

  const today = new Date()
  const todayStr = format(today, 'yyyy-MM-dd')

  useEffect(() => {
    loadCalendarEvents(today)
    runCarryForward()
  }, [])

  const freeSlots = getFreeSlots(today, state.settings)

  const todayTasks = tasks.filter(t =>
    t.scheduled_date === todayStr ||
    (t.status === 'scheduled' && t.scheduled_date === todayStr)
  )

  function handleEmptySlotTap(time) {
    setAddDefaultTime(time)
    setAddOpen(true)
  }

  if (focusTask) {
    return (
      <AnimatePresence>
        <FocusMode task={focusTask} onExit={() => setFocusTask(null)} />
      </AnimatePresence>
    )
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-5 pt-4 pb-3 flex-shrink-0">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-[#f4f4f5]">
              {format(today, 'EEEE, MMM d')}
            </h1>
            {calendarLoading ? (
              <div className="flex items-center gap-2 mt-1">
                <LoadingSpinner size={12} />
                <span className="text-xs text-[#71717a]">Loading calendar…</span>
              </div>
            ) : (
              <p className="text-sm text-[#71717a] mt-0.5">
                {freeSlots.freeHours}h free today
              </p>
            )}
          </div>

          {/* Capacity bar */}
          <div className="text-right">
            <div className="w-24 h-2 bg-[#242428] rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${
                  freeSlots.freeMinutes / freeSlots.totalMinutes > 0.4
                    ? 'bg-[#22c55e]'
                    : freeSlots.freeMinutes / freeSlots.totalMinutes > 0.2
                    ? 'bg-[#eab308]'
                    : 'bg-[#ef4444]'
                }`}
                style={{ width: `${Math.min(100, (freeSlots.freeMinutes / freeSlots.totalMinutes) * 100)}%` }}
              />
            </div>
            <span className="text-[10px] text-[#71717a] mt-1 block">
              {freeSlots.freeHours}h / {Math.round(freeSlots.totalMinutes / 60)}h free
            </span>
          </div>
        </div>

        {/* Rollover banner */}
        {state.showRolloverBanner && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-3 bg-[#eab308]/10 border border-[#eab308]/20 rounded-2xl p-3 flex items-center justify-between"
          >
            <div>
              <p className="text-[#eab308] text-sm font-medium">
                {state.rolloverTasks.length} task{state.rolloverTasks.length > 1 ? 's' : ''} from yesterday
              </p>
              <p className="text-[#a1a1aa] text-xs mt-0.5">Still on your list. What should we do?</p>
            </div>
            <button
              onClick={() => dispatch({ type: 'DISMISS_ROLLOVER' })}
              className="text-[#71717a] text-xs ml-3"
            >
              Later
            </button>
          </motion.div>
        )}

        {/* Plan My Day button */}
        <button
          onClick={() => dispatch({ type: 'SET_ACTIVE_VIEW', payload: 'planning' })}
          className="mt-3 w-full h-10 bg-[#3b82f6]/10 border border-[#3b82f6]/20 rounded-2xl text-[#3b82f6] text-sm font-medium active:bg-[#3b82f6]/20"
        >
          Plan My Day →
        </button>
      </div>

      {/* Timeline */}
      <div className="flex-1 min-h-0 overflow-hidden">
        <Timeline
          tasks={todayTasks}
          calendarEvents={calendarEvents}
          onTaskTap={task => setSelectedTask(task)}
          onEmptySlotTap={handleEmptySlotTap}
          settings={state.settings}
        />
      </div>

      {/* FAB */}
      <button
        onClick={() => { setAddDefaultTime(null); setAddOpen(true) }}
        className="fixed right-5 bottom-24 w-14 h-14 bg-[#3b82f6] rounded-full flex items-center justify-center shadow-lg active:bg-[#2563eb] active:scale-95 transition-transform z-30"
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
          <path d="M12 5v14M5 12h14" stroke="white" strokeWidth="2.5" strokeLinecap="round" />
        </svg>
      </button>

      {/* Sheets */}
      <TaskDetailSheet
        isOpen={!!selectedTask}
        onClose={() => setSelectedTask(null)}
        task={selectedTask}
        onStartFocus={task => { setSelectedTask(null); setTimeout(() => setFocusTask(task), 300) }}
      />

      <QuickAddSheet
        isOpen={addOpen}
        onClose={() => { setAddOpen(false); setAddDefaultTime(null) }}
        defaultTime={addDefaultTime}
        defaultDate={todayStr}
      />

      <ScheduleSheet
        isOpen={!!scheduleTask}
        onClose={() => setScheduleTask(null)}
        task={scheduleTask}
      />

      <AIToolsSheet
        isOpen={!!aiTask}
        onClose={() => setAiTask(null)}
        task={aiTask}
      />
    </div>
  )
}
