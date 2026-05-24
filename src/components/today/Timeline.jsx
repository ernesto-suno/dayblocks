import { useRef, useEffect, useState } from 'react'
import { format, parseISO } from 'date-fns'
import { useApp } from '../../store/AppContext'

const HOUR_HEIGHT = 80 // px per hour

function timeToOffset(timeStr, workStart) {
  const [h, m] = timeStr.split(':').map(Number)
  const [sh] = workStart.split(':').map(Number)
  return ((h - sh) + m / 60) * HOUR_HEIGHT
}

function minutesToHeight(minutes) {
  return (minutes / 60) * HOUR_HEIGHT
}

function formatHour(h) {
  if (h === 0) return '12am'
  if (h === 12) return '12pm'
  return h > 12 ? `${h - 12}pm` : `${h}am`
}

export default function Timeline({ tasks, calendarEvents, onTaskTap, onEmptySlotTap, settings }) {
  const scrollRef = useRef(null)
  const { workDayStart = '07:00', workDayEnd = '22:00' } = settings || {}

  const [startH] = workDayStart.split(':').map(Number)
  const [endH] = workDayEnd.split(':').map(Number)
  const totalHours = endH - startH
  const totalHeight = totalHours * HOUR_HEIGHT

  // Current time indicator
  const now = new Date()
  const nowOffset = timeToOffset(
    `${now.getHours()}:${now.getMinutes()}`,
    workDayStart
  )

  // Scroll to current time on mount
  useEffect(() => {
    if (scrollRef.current && nowOffset > 0) {
      scrollRef.current.scrollTo({ top: Math.max(0, nowOffset - 100), behavior: 'smooth' })
    }
  }, [])

  // Only show events that overlap with work day
  const visibleCalEvents = calendarEvents.filter(e => {
    if (e.isAllDay) return false
    const start = new Date(e.start.dateTime)
    const end = new Date(e.end.dateTime)
    const startH2 = start.getHours()
    const endH2 = end.getHours()
    return endH2 >= startH && startH2 <= endH
  })

  const scheduledTasks = tasks.filter(t =>
    t.status === 'scheduled' && t.scheduled_start_time
  )

  function handleEmptyTap(e) {
    const rect = e.currentTarget.getBoundingClientRect()
    const y = e.clientY - rect.top + e.currentTarget.scrollTop
    const fractionHour = y / HOUR_HEIGHT
    const hour = Math.floor(startH + fractionHour)
    const min = Math.floor(((fractionHour % 1) * 60) / 15) * 15
    const timeStr = `${hour.toString().padStart(2, '0')}:${min.toString().padStart(2, '0')}`
    onEmptySlotTap?.(timeStr)
  }

  return (
    <div
      ref={scrollRef}
      className="h-full overflow-y-auto no-scrollbar relative"
      onClick={handleEmptyTap}
    >
      <div className="relative" style={{ height: totalHeight + 40 }}>
        {/* Hour lines and labels */}
        {Array.from({ length: totalHours + 1 }, (_, i) => {
          const h = startH + i
          const y = i * HOUR_HEIGHT
          return (
            <div key={h} className="absolute left-0 right-0 flex items-center" style={{ top: y }}>
              <span className="text-[10px] text-[#3f3f46] w-11 text-right pr-2 flex-shrink-0 select-none">
                {formatHour(h)}
              </span>
              <div className="flex-1 border-t border-[#1e1e22]" />
            </div>
          )
        })}

        {/* Blocks container */}
        <div className="absolute" style={{ left: 48, right: 8, top: 0, bottom: 0 }}>

          {/* Calendar events (gray, read-only) */}
          {visibleCalEvents.map(event => {
            const start = new Date(event.start.dateTime)
            const end = new Date(event.end.dateTime)
            const startTime = `${start.getHours()}:${start.getMinutes()}`
            const durationMin = Math.round((end - start) / 60000)
            const top = timeToOffset(startTime, workDayStart)
            const height = Math.max(24, minutesToHeight(durationMin))

            // Skip DayBlocks events (shown as tasks instead)
            if (event.subject?.startsWith('🟦') || event.subject?.startsWith('✅')) return null

            return (
              <div
                key={event.id}
                className="absolute left-0 right-0 bg-[#2a2a30] border border-[#3f3f46] rounded-xl px-3 py-1.5 overflow-hidden"
                style={{ top, height: height - 2 }}
              >
                <p className="text-[#a1a1aa] text-xs font-medium leading-tight truncate">{event.subject}</p>
                <p className="text-[#71717a] text-[10px] mt-0.5">
                  {format(start, 'h:mm')}–{format(end, 'h:mma')}
                </p>
              </div>
            )
          })}

          {/* Task blocks */}
          {scheduledTasks.map(task => {
            const [h, m] = task.scheduled_start_time.split(':').map(Number)
            const durationMin = task.estimated_minutes || 30
            const top = timeToOffset(`${h}:${m}`, workDayStart)
            const height = Math.max(36, minutesToHeight(durationMin))

            const colors = {
              high: { bg: 'bg-[#ef4444]/15', border: 'border-[#ef4444]/40', text: 'text-[#ef4444]', label: 'text-[#f87171]' },
              medium: { bg: 'bg-[#3b82f6]/15', border: 'border-[#3b82f6]/40', text: 'text-[#3b82f6]', label: 'text-[#60a5fa]' },
              low: { bg: 'bg-[#3f3f46]/40', border: 'border-[#3f3f46]', text: 'text-[#71717a]', label: 'text-[#a1a1aa]' },
            }
            const c = colors[task.priority] || colors.medium

            return (
              <button
                key={task.id}
                className={`absolute left-0 right-0 ${c.bg} border ${c.border} rounded-xl px-3 py-1.5 overflow-hidden text-left active:brightness-110 touch-target`}
                style={{ top, height: height - 2 }}
                onClick={e => { e.stopPropagation(); onTaskTap(task) }}
              >
                <p className={`text-xs font-semibold leading-tight truncate ${c.label}`}>{task.title}</p>
                {height > 40 && (
                  <p className={`text-[10px] mt-0.5 ${c.text} opacity-70`}>{durationMin} min</p>
                )}
              </button>
            )
          })}

          {/* Current time indicator */}
          {nowOffset > 0 && nowOffset < totalHeight && (
            <div
              className="absolute left-0 right-0 flex items-center pointer-events-none"
              style={{ top: nowOffset }}
            >
              <div className="w-2 h-2 rounded-full bg-[#3b82f6] flex-shrink-0 -ml-1" />
              <div className="flex-1 border-t border-[#3b82f6]" />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
