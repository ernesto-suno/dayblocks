import { useState } from 'react'
import BottomSheet from '../shared/BottomSheet'
import VisualScheduleSheet from '../shared/VisualScheduleSheet'
import { useApp } from '../../store/AppContext'
import { useTasks } from '../../hooks/useTasks'

export default function TaskDetailSheet({ isOpen, onClose, task, onStartFocus }) {
  const { openSheet } = useApp()
  const { completeTask, unscheduleTask } = useTasks()
  const [rescheduleOpen, setRescheduleOpen] = useState(false)
  const [loading, setLoading] = useState(null)

  if (!task) return null

  const completedSubtasks = (task.subtasks || []).filter(s => s.completed).length
  const totalSubtasks = (task.subtasks || []).length

  async function handleComplete() {
    setLoading('complete')
    await completeTask(task)
    setLoading(null)
    onClose()
  }

  async function handleMoveToBacklog() {
    setLoading('backlog')
    await unscheduleTask(task)
    setLoading(null)
    onClose()
  }

  return (
    <>
      <BottomSheet isOpen={isOpen && !rescheduleOpen} onClose={onClose}>
        <div className="px-5 pb-6 space-y-3">

          {/* Task title + time */}
          <div className="pt-2 pb-1">
            <h2 className="text-xl font-bold text-[#f4f4f5] leading-snug">{task.title}</h2>
            {task.scheduled_start_time && (
              <p className="text-[#71717a] text-sm mt-1">
                {formatTime(task.scheduled_start_time)} · {task.estimated_minutes || 30} min
              </p>
            )}
          </div>

          {task.notes && (
            <p className="text-[#a1a1aa] text-sm leading-relaxed pb-1">{task.notes}</p>
          )}

          {totalSubtasks > 0 && (
            <div className="bg-[#242428] rounded-2xl p-3 space-y-2">
              {task.subtasks.map(sub => (
                <div key={sub.id} className="flex items-center gap-2.5">
                  <div className={`w-4 h-4 rounded border flex-shrink-0 flex items-center justify-center ${
                    sub.completed ? 'bg-[#22c55e] border-[#22c55e]' : 'border-[#3f3f46]'
                  }`}>
                    {sub.completed && <span className="text-white text-[10px]">✓</span>}
                  </div>
                  <span className={`text-sm ${sub.completed ? 'line-through text-[#71717a]' : 'text-[#f4f4f5]'}`}>
                    {sub.title}
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* ── The two actions the user needs most ── */}

          {/* 1. Change time / reschedule */}
          <button
            onClick={() => setRescheduleOpen(true)}
            className="w-full bg-[#3b82f6]/10 border border-[#3b82f6]/30 rounded-2xl p-4 flex items-center gap-3 active:bg-[#3b82f6]/20 text-left"
          >
            <span className="text-2xl">📅</span>
            <div>
              <p className="text-[#3b82f6] font-semibold text-sm">Change Time</p>
              <p className="text-[#71717a] text-xs mt-0.5">Move it to a different slot today or another day</p>
            </div>
            <svg className="ml-auto text-[#3b82f6]/50 flex-shrink-0" width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M6 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
          </button>

          {/* 2. Back to backlog */}
          <button
            onClick={handleMoveToBacklog}
            disabled={loading === 'backlog'}
            className="w-full bg-[#242428] rounded-2xl p-4 flex items-center gap-3 active:bg-[#2e2e34] text-left"
          >
            <span className="text-2xl">↩</span>
            <div>
              <p className="text-[#f4f4f5] font-semibold text-sm">
                {loading === 'backlog' ? 'Moving…' : 'Send to Backlog'}
              </p>
              <p className="text-[#71717a] text-xs mt-0.5">Not getting to it today — remove from calendar</p>
            </div>
          </button>

          {/* ── Secondary actions ── */}
          <div className="grid grid-cols-3 gap-2 pt-1">
            <button
              onClick={() => { onClose(); setTimeout(() => onStartFocus(task), 300) }}
              className="h-12 bg-[#3b82f6] text-white rounded-2xl text-sm font-semibold active:bg-[#2563eb] flex items-center justify-center gap-1"
            >
              ▶ Start
            </button>
            <button
              onClick={handleComplete}
              disabled={loading === 'complete'}
              className="h-12 bg-[#22c55e]/10 text-[#22c55e] rounded-2xl text-sm font-medium active:bg-[#22c55e]/20 flex items-center justify-center"
            >
              {loading === 'complete' ? '…' : '✓ Done'}
            </button>
            <button
              onClick={() => { onClose(); setTimeout(() => openSheet('aiTools', task), 300) }}
              className="h-12 bg-[#a855f7]/10 text-[#a855f7] rounded-2xl text-sm font-medium active:bg-[#a855f7]/20 flex items-center justify-center"
            >
              ✦ AI
            </button>
          </div>

        </div>
      </BottomSheet>

      <VisualScheduleSheet
        isOpen={rescheduleOpen}
        onClose={() => { setRescheduleOpen(false); onClose() }}
        task={task}
      />
    </>
  )
}

function formatTime(t) {
  if (!t) return ''
  const [h, m] = t.slice(0, 5).split(':').map(Number)
  const period = h >= 12 ? 'pm' : 'am'
  return `${h % 12 || 12}:${m.toString().padStart(2, '0')} ${period}`
}
