import { useState } from 'react'
import { format, startOfWeek, endOfWeek, isWithinInterval, parseISO } from 'date-fns'
import { AnimatePresence, motion } from 'framer-motion'
import { useTasks } from '../hooks/useTasks'
import { useApp } from '../store/AppContext'
import TaskCard from '../components/shared/TaskCard'
import QuickAddSheet from '../components/shared/QuickAddSheet'
import ScheduleSheet from '../components/shared/ScheduleSheet'
import AIToolsSheet from '../components/ai-tools/AIToolsSheet'
import EditTaskSheet from '../components/backlog/EditTaskSheet'
import FocusMode from './FocusMode'

const SECTIONS = [
  { id: 'today', label: 'Today' },
  { id: 'week', label: 'This Week' },
  { id: 'someday', label: 'Someday' },
]

export default function BacklogView() {
  const { tasks, completeTask, deleteTask } = useTasks()
  const { openSheet } = useApp()
  const [addOpen, setAddOpen] = useState(false)
  const [scheduleTask, setScheduleTask] = useState(null)
  const [aiTask, setAiTask] = useState(null)
  const [editTask, setEditTask] = useState(null)
  const [focusTask, setFocusTask] = useState(null)
  const [filter, setFilter] = useState('all') // 'all' | 'high' | 'medium' | 'low'

  const backlog = tasks.filter(t => t.status === 'backlog')

  const todayStr = format(new Date(), 'yyyy-MM-dd')
  const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 })
  const weekEnd = endOfWeek(new Date(), { weekStartsOn: 1 })

  function categorize(task) {
    if (!task.scheduled_date) return 'someday'
    if (task.scheduled_date === todayStr) return 'today'
    try {
      const d = parseISO(task.scheduled_date)
      if (isWithinInterval(d, { start: weekStart, end: weekEnd })) return 'week'
    } catch {}
    return 'someday'
  }

  const grouped = {
    today: backlog.filter(t => categorize(t) === 'today'),
    week: backlog.filter(t => categorize(t) === 'week'),
    someday: backlog.filter(t => categorize(t) === 'someday'),
  }

  const filteredGrouped = Object.fromEntries(
    Object.entries(grouped).map(([k, v]) => [
      k,
      filter === 'all' ? v : v.filter(t => t.priority === filter),
    ])
  )

  async function handleComplete(task) {
    await completeTask(task)
  }

  async function handleDelete(task) {
    if (confirm(`Delete "${task.title}"?`)) {
      await deleteTask(task)
    }
  }

  if (focusTask) {
    return <FocusMode task={focusTask} onExit={() => setFocusTask(null)} />
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-5 pt-4 pb-3 flex-shrink-0">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-bold text-[#f4f4f5]">Backlog</h1>
          <span className="text-sm text-[#71717a]">{backlog.length} tasks</span>
        </div>

        {/* Priority filter */}
        <div className="flex gap-2">
          {[
            { id: 'all', label: 'All' },
            { id: 'high', label: '● High' },
            { id: 'medium', label: '● Medium' },
            { id: 'low', label: '● Low' },
          ].map(f => (
            <button
              key={f.id}
              onClick={() => setFilter(f.id)}
              className={`px-3 h-8 rounded-full text-xs transition-all ${
                filter === f.id
                  ? f.id === 'high' ? 'bg-[#ef4444]/20 text-[#ef4444]'
                    : f.id === 'medium' ? 'bg-[#3b82f6]/20 text-[#3b82f6]'
                    : f.id === 'low' ? 'bg-[#3f3f46] text-[#a1a1aa]'
                    : 'bg-[#3b82f6]/20 text-[#3b82f6]'
                  : 'bg-[#1a1a1e] text-[#71717a]'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Task list */}
      <div className="flex-1 min-h-0 overflow-y-auto px-4 pb-28">
        {backlog.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="text-4xl mb-3">🎉</div>
            <p className="text-[#f4f4f5] font-medium">Backlog is clear!</p>
            <p className="text-[#71717a] text-sm mt-1">Add tasks to get started.</p>
          </div>
        ) : (
          SECTIONS.map(section => {
            const sectionTasks = filteredGrouped[section.id] || []
            if (sectionTasks.length === 0) return null
            return (
              <div key={section.id} className="mb-6">
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-xs text-[#71717a] font-semibold uppercase tracking-wider">
                    {section.label}
                  </span>
                  <span className="text-xs text-[#3f3f46]">{sectionTasks.length}</span>
                </div>
                {sectionTasks.map(task => (
                  <TaskCard
                    key={task.id}
                    task={task}
                    onComplete={handleComplete}
                    onDelete={handleDelete}
                    onSchedule={t => setScheduleTask(t)}
                    onStartFocus={t => setFocusTask(t)}
                    onEdit={t => setEditTask(t)}
                  />
                ))}
              </div>
            )
          })
        )}
      </div>

      {/* FAB */}
      <button
        onClick={() => setAddOpen(true)}
        className="fixed right-5 bottom-24 w-14 h-14 bg-[#3b82f6] rounded-full flex items-center justify-center shadow-lg active:bg-[#2563eb] active:scale-95 transition-transform z-30"
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
          <path d="M12 5v14M5 12h14" stroke="white" strokeWidth="2.5" strokeLinecap="round" />
        </svg>
      </button>

      {/* Sheets */}
      <QuickAddSheet isOpen={addOpen} onClose={() => setAddOpen(false)} />
      <ScheduleSheet isOpen={!!scheduleTask} onClose={() => setScheduleTask(null)} task={scheduleTask} />
      <AIToolsSheet isOpen={!!aiTask} onClose={() => setAiTask(null)} task={aiTask} />
      <EditTaskSheet isOpen={!!editTask} onClose={() => setEditTask(null)} task={editTask} />
    </div>
  )
}
