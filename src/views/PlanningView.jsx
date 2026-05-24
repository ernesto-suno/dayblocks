import { useState, useEffect } from 'react'
import { format } from 'date-fns'
import { useTasks } from '../hooks/useTasks'
import { useCalendar } from '../hooks/useCalendar'
import { useApp } from '../store/AppContext'
import LoadingSpinner from '../components/shared/LoadingSpinner'
import ScheduleSheet from '../components/shared/ScheduleSheet'
import QuickAddSheet from '../components/shared/QuickAddSheet'
import Button from '../components/shared/Button'
import AIPlanningChat from '../components/planning/AIPlanningChat'

export default function PlanningView() {
  const { tasks, unscheduleTask, completeTask } = useTasks()
  const { calendarEvents, calendarLoading, loadCalendarEvents, getFreeSlots } = useCalendar()
  const { state, dispatch } = useApp()
  const [scheduleTarget, setScheduleTarget] = useState(null)
  const [expandedId, setExpandedId] = useState(null)
  const [addOpen, setAddOpen] = useState(false)
  const [chatOpen, setChatOpen] = useState(false)

  const today = new Date()
  const todayStr = format(today, 'yyyy-MM-dd')

  useEffect(() => {
    loadCalendarEvents(today)
  }, [])

  const backlog = tasks.filter(t => t.status === 'backlog')
  const todayScheduled = tasks.filter(t => t.scheduled_date === todayStr && t.status === 'scheduled')

  const prioritized = [...backlog].sort((a, b) => {
    const p = { high: 0, medium: 1, low: 2 }
    return (p[a.priority] ?? 1) - (p[b.priority] ?? 1)
  })

  const freeSlots = getFreeSlots(today, state.settings)
  const plannedMinutes = todayScheduled.reduce(
    (acc, t) => acc + (t.estimated_minutes || state.settings.defaultTaskDuration), 0
  )
  const overCapacity = plannedMinutes > freeSlots.freeMinutes

  const meetings = calendarEvents.filter(e => {
    const title = e.subject || ''
    return !title.startsWith('🟦') && !title.startsWith('✅') && !e.isAllDay
  })

  function handleDonePlanning() {
    dispatch({ type: 'SET_ACTIVE_VIEW', payload: 'today' })
  }

  function toggleExpand(id) {
    setExpandedId(prev => prev === id ? null : id)
  }

  async function handleMoveToBacklog(task) {
    await unscheduleTask(task)
    setExpandedId(null)
  }

  async function handleComplete(task) {
    await completeTask(task)
    setExpandedId(null)
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-5 pt-4 pb-3 flex-shrink-0">
        <div className="flex items-center justify-between mb-1">
          <h1 className="text-2xl font-bold text-[#f4f4f5]">Plan My Day</h1>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setChatOpen(true)}
              className="text-[#a855f7] text-sm font-medium touch-target flex items-center gap-1"
            >
              ✦ AI Chat
            </button>
            <button
              onClick={() => setAddOpen(true)}
              className="text-[#3b82f6] text-sm font-medium touch-target flex items-center gap-1"
            >
              + New
            </button>
            <button onClick={handleDonePlanning} className="text-[#a1a1aa] text-sm font-medium touch-target">
              Done
            </button>
          </div>
        </div>
        <p className="text-sm text-[#71717a]">{format(today, 'EEEE, MMMM d')}</p>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto px-5 pb-28 space-y-6">

        {/* Today's meetings */}
        <div>
          <h2 className="text-xs text-[#71717a] font-semibold uppercase tracking-wider mb-3">
            Today's Calendar
          </h2>
          {calendarLoading ? (
            <div className="flex items-center gap-2 py-4">
              <LoadingSpinner size={16} />
              <span className="text-[#71717a] text-sm">Loading calendar…</span>
            </div>
          ) : meetings.length === 0 ? (
            <p className="text-[#71717a] text-sm py-3">No meetings today.</p>
          ) : (
            <div className="space-y-2">
              {meetings.map(event => {
                const start = new Date(event.start.dateTime)
                const end = new Date(event.end.dateTime)
                const dur = Math.round((end - start) / 60000)
                return (
                  <div key={event.id} className="bg-[#1a1a1e] rounded-2xl p-3 flex items-center gap-3">
                    <div className="w-1 h-10 bg-[#3f3f46] rounded-full flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-[#f4f4f5] text-sm font-medium truncate">{event.subject}</p>
                      <p className="text-[#71717a] text-xs">
                        {format(start, 'h:mm')}–{format(end, 'h:mma')} · {dur} min
                      </p>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Free time summary */}
        <div className="bg-[#1a1a1e] rounded-2xl p-4">
          <div className="flex justify-between items-center mb-3">
            <span className="text-sm font-medium text-[#f4f4f5]">Available today</span>
            <span className="text-[#22c55e] font-bold">{freeSlots.freeHours}h free</span>
          </div>
          <div className="h-2 bg-[#242428] rounded-full overflow-hidden">
            <div
              className="h-full bg-[#22c55e] rounded-full"
              style={{ width: `${Math.min(100, (freeSlots.freeMinutes / freeSlots.totalMinutes) * 100)}%` }}
            />
          </div>
          <div className="flex justify-between mt-1.5">
            <span className="text-[10px] text-[#71717a]">{freeSlots.busyMinutes} min in meetings</span>
            <span className="text-[10px] text-[#71717a]">{freeSlots.freeMinutes} min open</span>
          </div>
        </div>

        {/* Scheduled today */}
        {todayScheduled.length > 0 && (
          <div>
            <h2 className="text-xs text-[#71717a] font-semibold uppercase tracking-wider mb-3">
              Scheduled Today ({Math.round(plannedMinutes / 60 * 10) / 10}h)
            </h2>
            <div className={`p-3 rounded-2xl mb-3 ${overCapacity ? 'bg-[#ef4444]/10 border border-[#ef4444]/20' : 'bg-[#22c55e]/10 border border-[#22c55e]/20'}`}>
              <p className={`text-sm ${overCapacity ? 'text-[#ef4444]' : 'text-[#22c55e]'}`}>
                {overCapacity
                  ? `That's a full day — want to move something to tomorrow?`
                  : `You're ${Math.round((freeSlots.freeMinutes - plannedMinutes) / 60 * 10) / 10}h under capacity. Looking good.`
                }
              </p>
            </div>

            <div className="space-y-2">
              {todayScheduled.map(task => (
                <div key={task.id} className="bg-[#1a1a1e] rounded-2xl overflow-hidden">
                  <button
                    onClick={() => toggleExpand(task.id)}
                    className="w-full p-4 flex items-center gap-3 text-left active:bg-[#242428]"
                  >
                    <div className="w-1 h-10 bg-[#3b82f6]/60 rounded-full flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-[#f4f4f5] text-sm font-medium truncate">{task.title}</p>
                      <p className="text-[#71717a] text-xs">
                        {task.scheduled_start_time ? formatTime(task.scheduled_start_time) : '—'} · {task.estimated_minutes || 30} min
                      </p>
                    </div>
                    <svg className={`text-[#71717a] transition-transform flex-shrink-0 ${expandedId === task.id ? 'rotate-180' : ''}`} width="16" height="16" viewBox="0 0 16 16" fill="none">
                      <path d="M4 6l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                    </svg>
                  </button>

                  {expandedId === task.id && (
                    <div className="px-4 pb-4 flex gap-2 border-t border-[#242428] pt-3">
                      <button
                        onClick={() => handleComplete(task)}
                        className="flex-1 h-10 bg-[#22c55e]/10 text-[#22c55e] rounded-xl text-sm font-medium active:bg-[#22c55e]/20"
                      >
                        ✓ Done
                      </button>
                      <button
                        onClick={() => { setScheduleTarget(task); setExpandedId(null) }}
                        className="flex-1 h-10 bg-[#3b82f6]/10 text-[#3b82f6] rounded-xl text-sm font-medium active:bg-[#3b82f6]/20"
                      >
                        Reschedule
                      </button>
                      <button
                        onClick={() => handleMoveToBacklog(task)}
                        className="flex-1 h-10 bg-[#242428] text-[#a1a1aa] rounded-xl text-sm active:bg-[#2e2e34]"
                      >
                        ↩ Backlog
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Backlog to plan */}
        <div>
          <h2 className="text-xs text-[#71717a] font-semibold uppercase tracking-wider mb-3">
            Backlog to Plan ({backlog.length})
          </h2>

          {backlog.length === 0 ? (
            <p className="text-[#71717a] text-sm py-3">All tasks are scheduled — nice work.</p>
          ) : (
            <div className="space-y-2">
              {prioritized.map(task => (
                <div key={task.id} className="bg-[#1a1a1e] rounded-2xl overflow-hidden">
                  <button
                    onClick={() => toggleExpand(task.id)}
                    className="w-full p-4 flex items-center gap-3 text-left active:bg-[#242428]"
                  >
                    <div
                      className="w-2 h-2 rounded-full flex-shrink-0"
                      style={{ background: task.priority === 'high' ? '#ef4444' : task.priority === 'low' ? '#71717a' : '#3b82f6' }}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-[#f4f4f5] text-sm font-medium truncate">{task.title}</p>
                      {task.estimated_minutes && (
                        <p className="text-[#71717a] text-xs">{task.estimated_minutes} min</p>
                      )}
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className="h-8 px-3 bg-[#3b82f6]/10 text-[#3b82f6] rounded-xl text-sm font-medium flex items-center">
                        + Add
                      </span>
                      <svg className={`text-[#71717a] transition-transform ${expandedId === task.id ? 'rotate-180' : ''}`} width="16" height="16" viewBox="0 0 16 16" fill="none">
                        <path d="M4 6l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                      </svg>
                    </div>
                  </button>

                  {expandedId === task.id && (
                    <div className="px-4 pb-4 border-t border-[#242428] pt-3 space-y-2">
                      {task.notes && (
                        <p className="text-[#71717a] text-sm mb-3">{task.notes}</p>
                      )}
                      <div className="flex gap-2">
                        <button
                          onClick={() => { setScheduleTarget(task); setExpandedId(null) }}
                          className="flex-1 h-10 bg-[#3b82f6]/10 text-[#3b82f6] rounded-xl text-sm font-medium active:bg-[#3b82f6]/20"
                        >
                          📅 Schedule for Today
                        </button>
                        <button
                          onClick={() => handleComplete(task)}
                          className="h-10 px-3 bg-[#22c55e]/10 text-[#22c55e] rounded-xl text-sm active:bg-[#22c55e]/20"
                        >
                          ✓
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Done button */}
      <div className="px-5 pb-safe pt-3 flex-shrink-0 border-t border-[#1a1a1e]">
        <Button fullWidth onClick={handleDonePlanning} size="lg">
          Done Planning
        </Button>
      </div>

      <ScheduleSheet
        isOpen={!!scheduleTarget}
        onClose={() => setScheduleTarget(null)}
        task={scheduleTarget}
      />

      <QuickAddSheet
        isOpen={addOpen}
        onClose={() => setAddOpen(false)}
        defaultDate={todayStr}
      />

      {chatOpen && (
        <AIPlanningChat
          onClose={() => setChatOpen(false)}
          freeMinutes={freeSlots.freeMinutes}
          freeHours={freeSlots.freeHours}
          calendarEvents={calendarEvents}
          settings={state.settings}
        />
      )}
    </div>
  )
}

function formatTime(t) {
  if (!t) return ''
  const [h, m] = t.split(':').map(Number)
  const period = h >= 12 ? 'pm' : 'am'
  return `${h % 12 || 12}:${m.toString().padStart(2, '0')} ${period}`
}
