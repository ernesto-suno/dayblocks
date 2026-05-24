import { useState } from 'react'
import BottomSheet from '../shared/BottomSheet'
import Button from '../shared/Button'
import ScheduleSheet from '../shared/ScheduleSheet'
import { useApp } from '../../store/AppContext'
import { useTasks } from '../../hooks/useTasks'

export default function TaskDetailSheet({ isOpen, onClose, task, onStartFocus }) {
  const { openSheet } = useApp()
  const { completeTask, unscheduleTask } = useTasks()
  const [rescheduleOpen, setRescheduleOpen] = useState(false)

  if (!task) return null

  const completedSubtasks = (task.subtasks || []).filter(s => s.completed).length
  const totalSubtasks = (task.subtasks || []).length

  async function handleComplete() {
    await completeTask(task)
    onClose()
  }

  async function handleMoveToBacklog() {
    await unscheduleTask(task)
    onClose()
  }

  return (
    <>
      <BottomSheet isOpen={isOpen && !rescheduleOpen} onClose={onClose} title={task.title}>
        <div className="px-5 pb-4 space-y-4">

          {/* Time + priority pills */}
          <div className="flex items-center gap-2 flex-wrap">
            {task.scheduled_start_time && (
              <button
                onClick={() => setRescheduleOpen(true)}
                className="flex items-center gap-1.5 bg-[#3b82f6]/10 text-[#3b82f6] px-3 py-1.5 rounded-full text-xs font-medium active:bg-[#3b82f6]/20"
              >
                🕐 {formatTime(task.scheduled_start_time)} · {task.estimated_minutes || 30} min
                <span className="text-[#3b82f6]/60">· tap to move</span>
              </button>
            )}
            <span className={`text-xs px-2.5 py-1 rounded-full ${
              task.priority === 'high' ? 'bg-[#ef4444]/10 text-[#ef4444]'
              : task.priority === 'low' ? 'bg-[#3f3f46] text-[#71717a]'
              : 'bg-[#3b82f6]/10 text-[#3b82f6]'
            }`}>
              {task.priority}
            </span>
          </div>

          {/* Notes */}
          {task.notes && (
            <p className="text-[#a1a1aa] text-sm leading-relaxed">{task.notes}</p>
          )}

          {/* Subtasks */}
          {totalSubtasks > 0 && (
            <div className="space-y-2">
              <div className="text-xs text-[#71717a] font-medium uppercase tracking-wider">
                Subtasks {completedSubtasks}/{totalSubtasks}
              </div>
              {task.subtasks.map(sub => (
                <div key={sub.id} className="flex items-center gap-2.5 py-1">
                  <div className={`w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 ${
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

          {/* Primary actions */}
          <Button fullWidth size="lg"
            onClick={() => { onClose(); setTimeout(() => onStartFocus(task), 300) }}
          >
            ▶ Start Focus Session
          </Button>

          <div className="grid grid-cols-2 gap-2">
            <Button variant="success" fullWidth onClick={handleComplete}>
              ✓ Mark Complete
            </Button>
            <Button variant="secondary" fullWidth onClick={() => setRescheduleOpen(true)}>
              📅 Change Time
            </Button>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <Button variant="ghost" fullWidth
              onClick={() => { onClose(); setTimeout(() => openSheet('edit', task), 300) }}
            >
              Edit
            </Button>
            <Button variant="secondary" fullWidth onClick={handleMoveToBacklog}>
              ↩ Backlog
            </Button>
          </div>

          <Button variant="yellow" fullWidth
            onClick={() => { onClose(); setTimeout(() => openSheet('aiTools', task), 300) }}
          >
            ✦ AI Tools
          </Button>
        </div>
      </BottomSheet>

      {/* Reschedule sheet — sits on top */}
      <ScheduleSheet
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
