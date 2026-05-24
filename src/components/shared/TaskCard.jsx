import { useState, useRef } from 'react'
import { useApp } from '../../store/AppContext'

const PRIORITY_COLORS = {
  high: '#ef4444',
  medium: '#3b82f6',
  low: '#71717a',
}

const PRIORITY_BG = {
  high: 'bg-[#ef4444]/10',
  medium: 'bg-[#3b82f6]/10',
  low: 'bg-[#3f3f46]',
}

export default function TaskCard({ task, onComplete, onDelete, onSchedule, onStartFocus, onEdit, showRolloverBadge = true }) {
  const { openSheet } = useApp()
  const [expanded, setExpanded] = useState(false)
  const [swipeX, setSwipeX] = useState(0)
  const startX = useRef(0)

  const isRolloverWarning = (task.rollover_count || 0) >= 3

  // Swipe handling
  function onTouchStart(e) {
    startX.current = e.touches[0].clientX
  }
  function onTouchMove(e) {
    const dx = e.touches[0].clientX - startX.current
    setSwipeX(Math.max(-100, Math.min(80, dx)))
  }
  function onTouchEnd() {
    if (swipeX < -60) {
      // Swipe left → reveal actions (hold at -100)
      setSwipeX(-100)
    } else if (swipeX > 50) {
      // Swipe right → start focus
      setSwipeX(0)
      onStartFocus?.(task)
    } else {
      setSwipeX(0)
    }
  }

  const completedSubtasks = (task.subtasks || []).filter(s => s.completed).length
  const totalSubtasks = (task.subtasks || []).length

  return (
    <div className="relative overflow-hidden rounded-2xl mb-2">
      {/* Swipe action backdrop */}
      <div className="absolute inset-0 flex">
        <div className="flex-1 bg-[#22c55e]/20 flex items-center pl-4">
          <span className="text-[#22c55e] text-sm font-medium">Start</span>
        </div>
        <div className="flex items-center gap-1 pr-2">
          <button
            onClick={() => { setSwipeX(0); onComplete?.(task) }}
            className="h-12 px-3 bg-[#22c55e]/20 rounded-xl flex items-center gap-1 text-[#22c55e] text-sm"
          >
            ✓
          </button>
          <button
            onClick={() => { setSwipeX(0); onSchedule?.(task) }}
            className="h-12 px-3 bg-[#3b82f6]/20 rounded-xl flex items-center gap-1 text-[#3b82f6] text-sm"
          >
            📅
          </button>
          <button
            onClick={() => { setSwipeX(0); onDelete?.(task) }}
            className="h-12 px-3 bg-[#ef4444]/20 rounded-xl flex items-center text-[#ef4444] text-sm"
          >
            🗑
          </button>
        </div>
      </div>

      {/* Card face */}
      <div
        style={{ transform: `translateX(${swipeX}px)`, transition: swipeX === 0 || swipeX === -100 ? 'transform 0.2s' : 'none' }}
        className="bg-[#1a1a1e] rounded-2xl"
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        onClick={() => swipeX === 0 && setExpanded(v => !v)}
      >
        <div className="p-4">
          <div className="flex items-start gap-3">
            {/* Priority dot */}
            <div
              className="w-2.5 h-2.5 rounded-full mt-1.5 flex-shrink-0"
              style={{ background: PRIORITY_COLORS[task.priority] || PRIORITY_COLORS.medium }}
            />

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[#f4f4f5] font-medium text-sm leading-snug">{task.title}</span>

                {/* Recurring badge */}
                {task.is_recurring && (
                  <span className="text-xs px-1.5 py-0.5 rounded-full bg-[#22c55e]/15 text-[#22c55e]">🔁</span>
                )}

                {/* Rollover badge */}
                {showRolloverBadge && (task.rollover_count || 0) > 0 && (
                  <span className={`text-xs px-1.5 py-0.5 rounded-full ${
                    isRolloverWarning ? 'bg-[#eab308]/20 text-[#eab308]' : 'bg-[#3f3f46] text-[#a1a1aa]'
                  }`}>
                    ↩ {task.rollover_count}
                  </span>
                )}
              </div>

              <div className="flex items-center gap-3 mt-1 flex-wrap">
                {task.category && (
                  <span className="text-xs px-2 py-0.5 rounded-full bg-[#a855f7]/15 text-[#a855f7]">
                    {task.category}
                  </span>
                )}
                {task.estimated_minutes && (
                  <span className="text-xs text-[#71717a]">{task.estimated_minutes} min</span>
                )}
                {totalSubtasks > 0 && (
                  <span className="text-xs text-[#71717a]">{completedSubtasks}/{totalSubtasks} subtasks</span>
                )}
                {task.scheduled_start_time && (
                  <span className="text-xs text-[#3b82f6]">
                    {formatTime(task.scheduled_start_time)}
                  </span>
                )}
              </div>

              {/* Rollover warning */}
              {isRolloverWarning && (
                <button
                  onClick={e => { e.stopPropagation(); openSheet('aiTools', task) }}
                  className="mt-2 text-xs text-[#eab308] flex items-center gap-1 active:opacity-70"
                >
                  🚩 Still on your list for {task.rollover_count} days. Want help with it?
                </button>
              )}
            </div>

            <svg
              className={`flex-shrink-0 text-[#71717a] transition-transform mt-0.5 ${expanded ? 'rotate-180' : ''}`}
              width="16" height="16" viewBox="0 0 16 16" fill="none"
            >
              <path d="M4 6l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </div>
        </div>

        {/* Expanded section */}
        {expanded && (
          <div className="px-4 pb-4 border-t border-[#242428] pt-3" onClick={e => e.stopPropagation()}>
            {task.notes && (
              <p className="text-[#a1a1aa] text-sm mb-3 leading-relaxed">{task.notes}</p>
            )}

            {/* Subtasks */}
            {totalSubtasks > 0 && (
              <div className="mb-3 space-y-2">
                {task.subtasks.map(sub => (
                  <div key={sub.id} className="flex items-center gap-2">
                    <div className={`w-4 h-4 rounded border flex items-center justify-center ${
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

            {/* Action buttons */}
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => onStartFocus?.(task)}
                className="flex-1 min-w-0 h-10 bg-[#3b82f6]/10 text-[#3b82f6] rounded-xl text-sm font-medium active:bg-[#3b82f6]/20 flex items-center justify-center"
              >
                ▶ Start
              </button>
              <button
                onClick={() => onComplete?.(task)}
                className="flex-1 min-w-0 h-10 bg-[#22c55e]/10 text-[#22c55e] rounded-xl text-sm font-medium active:bg-[#22c55e]/20 flex items-center justify-center"
              >
                ✓ Done
              </button>
              <button
                onClick={() => openSheet('aiTools', task)}
                className="h-10 px-3 bg-[#a855f7]/10 text-[#a855f7] rounded-xl text-sm font-medium active:bg-[#a855f7]/20"
              >
                ✦ AI
              </button>
              <button
                onClick={() => onEdit?.(task)}
                className="h-10 px-3 bg-[#242428] text-[#a1a1aa] rounded-xl text-sm active:bg-[#2e2e34]"
              >
                Edit
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function formatTime(timeStr) {
  if (!timeStr) return ''
  const [h, m] = timeStr.split(':').map(Number)
  const period = h >= 12 ? 'pm' : 'am'
  const hour = h % 12 || 12
  return `${hour}:${m.toString().padStart(2, '0')} ${period}`
}
