import { useState, useEffect, useRef } from 'react'
import { format, addDays, subDays } from 'date-fns'
import { getCalendarEvents } from '../../lib/graph'
import { useTasks } from '../../hooks/useTasks'
import { useApp } from '../../store/AppContext'
import LoadingSpinner from './LoadingSpinner'

const HOUR_HEIGHT = 80   // px per hour — generous for fingers
const START_HOUR = 6     // 6am
const END_HOUR = 22      // 10pm
const SNAP_MINUTES = 15  // snap to 15-min grid

// "09:30" → { top: px, height: px }
function blockGeometry(startH, startM, durationMin) {
  const top = ((startH * 60 + startM) - START_HOUR * 60) / 60 * HOUR_HEIGHT
  const height = Math.max(24, durationMin / 60 * HOUR_HEIGHT)
  return { top, height }
}

function formatTime(hhmm) {
  if (!hhmm) return ''
  const [h, m] = hhmm.slice(0, 5).split(':').map(Number)
  const period = h >= 12 ? 'pm' : 'am'
  return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${period}`
}

function addMins(hhmm, mins) {
  const [h, m] = hhmm.split(':').map(Number)
  const total = h * 60 + m + mins
  return `${String(Math.floor(total / 60) % 24).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`
}

function yToSnappedTime(y) {
  const rawMins = (y / HOUR_HEIGHT) * 60
  const snapped = Math.round(rawMins / SNAP_MINUTES) * SNAP_MINUTES
  const hour = START_HOUR + Math.floor(snapped / 60)
  const min = snapped % 60
  if (hour < START_HOUR || hour >= END_HOUR) return null
  return `${String(hour).padStart(2, '0')}:${String(min).padStart(2, '0')}`
}

function localDateStr(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

export default function VisualScheduleSheet({ isOpen, onClose, task }) {
  const { scheduleTask, tasks } = useTasks()
  const { state } = useApp()

  const todayStr = localDateStr(new Date())
  const [date, setDate] = useState(todayStr)
  const [selectedTime, setSelectedTime] = useState(null)
  const [duration, setDuration] = useState(30)
  const [calEvents, setCalEvents] = useState([])
  const [eventsLoading, setEventsLoading] = useState(false)
  const [scheduling, setScheduling] = useState(false)

  const timelineRef = useRef(null)
  const scrollRef = useRef(null)

  // Pre-fill from task on open
  useEffect(() => {
    if (isOpen && task) {
      const d = task.scheduled_date || todayStr
      setDate(d)
      setSelectedTime(task.scheduled_start_time?.slice(0, 5) || null)
      setDuration(task.estimated_minutes || 30)
    }
  }, [isOpen, task])

  // Load events whenever date changes
  useEffect(() => {
    if (!isOpen) return
    setEventsLoading(true)
    // noon avoids any DST edge cases
    getCalendarEvents(new Date(`${date}T12:00:00`))
      .then(data => setCalEvents((data || []).filter(e => !e.isAllDay)))
      .catch(() => setCalEvents([]))
      .finally(() => setEventsLoading(false))
  }, [date, isOpen])

  // Auto-scroll to the right time when opening
  useEffect(() => {
    if (!isOpen || !scrollRef.current) return
    const targetHour = selectedTime
      ? parseInt(selectedTime.split(':')[0])
      : new Date().getHours()
    const px = Math.max(0, (targetHour - START_HOUR - 1) * HOUR_HEIGHT)
    setTimeout(() => scrollRef.current?.scrollTo({ top: px, behavior: 'smooth' }), 150)
  }, [isOpen])

  // Other scheduled DayBlocks tasks on this day (not the current task)
  const scheduledTasks = tasks.filter(t =>
    t.scheduled_date === date &&
    t.scheduled_start_time &&
    t.status === 'scheduled' &&
    t.id !== task?.id
  )

  // ── Touch / click handlers for drag-to-place ──────────────────────────────

  function getYFromEvent(e) {
    const rect = timelineRef.current?.getBoundingClientRect()
    if (!rect) return null
    const scrollTop = scrollRef.current?.scrollTop || 0
    const clientY = e.touches ? e.touches[0].clientY : e.clientY
    return clientY - rect.top + scrollTop
  }

  function handlePointerDown(e) {
    const y = getYFromEvent(e)
    if (y == null) return
    const t = yToSnappedTime(y)
    if (t) setSelectedTime(t)
  }

  function handlePointerMove(e) {
    if (!e.buttons && !e.touches) return  // only while pressing
    const y = getYFromEvent(e)
    if (y == null) return
    const t = yToSnappedTime(y)
    if (t) setSelectedTime(t)
  }

  function handleTouchMove(e) {
    e.preventDefault()  // stop scroll while dragging
    const y = getYFromEvent(e)
    if (y == null) return
    const t = yToSnappedTime(y)
    if (t) setSelectedTime(t)
  }

  async function handleSchedule() {
    if (!selectedTime || !task || scheduling) return
    setScheduling(true)
    try {
      await scheduleTask(task, { date, startTime: selectedTime, durationMinutes: duration })
      onClose()
    } catch (err) {
      console.error(err)
    } finally {
      setScheduling(false)
    }
  }

  function changeDate(delta) {
    const d = new Date(`${date}T12:00:00`)
    d.setDate(d.getDate() + delta)
    setDate(localDateStr(d))
  }

  if (!isOpen || !task) return null

  const hours = Array.from({ length: END_HOUR - START_HOUR }, (_, i) => START_HOUR + i)
  const totalHeight = (END_HOUR - START_HOUR) * HOUR_HEIGHT

  // Preview geometry
  let previewBlock = null
  if (selectedTime) {
    const [ph, pm] = selectedTime.split(':').map(Number)
    previewBlock = blockGeometry(ph, pm, duration)
  }

  // Current time marker
  const now = new Date()
  let nowTop = null
  if (date === todayStr) {
    const minsFromStart = (now.getHours() * 60 + now.getMinutes()) - START_HOUR * 60
    if (minsFromStart >= 0 && minsFromStart < (END_HOUR - START_HOUR) * 60) {
      nowTop = minsFromStart / 60 * HOUR_HEIGHT
    }
  }

  return (
    <div className="fixed inset-0 bg-[#111113] z-50 flex flex-col">

      {/* ── Header ── */}
      <div className="px-5 pt-4 pb-3 flex-shrink-0 border-b border-[#1a1a1e]">
        <div className="flex items-center justify-between mb-3">
          <button onClick={onClose} className="text-[#71717a] text-sm font-medium active:opacity-60 w-16">
            Cancel
          </button>
          <p className="text-[#f4f4f5] font-semibold text-sm flex-1 text-center mx-2 truncate">
            {task.title}
          </p>
          <button
            onClick={handleSchedule}
            disabled={!selectedTime || scheduling}
            className="text-[#3b82f6] text-sm font-semibold disabled:opacity-30 active:opacity-60 w-16 text-right"
          >
            {scheduling ? '…' : 'Save'}
          </button>
        </div>

        {/* Date navigation */}
        <div className="flex items-center justify-between">
          <button
            onClick={() => changeDate(-1)}
            className="w-10 h-10 flex items-center justify-center text-2xl text-[#71717a] active:text-[#f4f4f5]"
          >
            ‹
          </button>
          <div className="text-center">
            <p className="text-[#f4f4f5] text-sm font-medium">
              {date === todayStr ? 'Today' : date === localDateStr(new Date(Date.now() + 86400000)) ? 'Tomorrow' : format(new Date(`${date}T12:00:00`), 'EEE, MMM d')}
            </p>
            {date !== todayStr && (
              <button onClick={() => setDate(todayStr)} className="text-[#3b82f6] text-xs mt-0.5">
                Back to today
              </button>
            )}
          </div>
          <button
            onClick={() => changeDate(1)}
            className="w-10 h-10 flex items-center justify-center text-2xl text-[#71717a] active:text-[#f4f4f5]"
          >
            ›
          </button>
        </div>
      </div>

      {/* ── Duration picker ── */}
      <div className="px-5 py-2 flex items-center gap-2 flex-shrink-0 border-b border-[#1a1a1e] overflow-x-auto no-scrollbar">
        <span className="text-xs text-[#71717a] flex-shrink-0">Duration:</span>
        {[15, 30, 45, 60, 90, 120].map(d => (
          <button
            key={d}
            onClick={() => setDuration(d)}
            className={`px-3 h-7 rounded-full text-xs flex-shrink-0 transition-all ${
              duration === d ? 'bg-[#3b82f6]/20 text-[#3b82f6]' : 'bg-[#1a1a1e] text-[#71717a]'
            }`}
          >
            {d >= 60 ? `${d / 60}h` : `${d}m`}
          </button>
        ))}
      </div>

      {/* ── Selected time summary ── */}
      <div className="px-5 py-2 flex-shrink-0 min-h-[36px]">
        {selectedTime ? (
          <div className="flex items-center justify-between">
            <span className="text-sm text-[#f4f4f5]">
              <span className="text-[#a855f7] font-semibold">{formatTime(selectedTime)}</span>
              <span className="text-[#71717a]"> → {formatTime(addMins(selectedTime, duration))} · {duration} min</span>
            </span>
            <button onClick={() => setSelectedTime(null)} className="text-[#3f3f46] text-xs">Clear</button>
          </div>
        ) : (
          <p className="text-[#3f3f46] text-xs text-center">Tap or drag on the timeline to place your task</p>
        )}
      </div>

      {/* ── Timeline ── */}
      <div ref={scrollRef} className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden">
        {eventsLoading ? (
          <div className="flex items-center justify-center py-12">
            <LoadingSpinner size={24} />
          </div>
        ) : (
          <div className="flex pb-8">

            {/* Hour labels (left column) */}
            <div className="flex-shrink-0 w-14">
              {hours.map(h => (
                <div key={h} style={{ height: HOUR_HEIGHT }} className="flex items-start justify-end pr-2 pt-1">
                  <span className="text-[10px] text-[#3f3f46] leading-none">
                    {h === 0 ? '12a' : h < 12 ? `${h}a` : h === 12 ? '12p' : `${h - 12}p`}
                  </span>
                </div>
              ))}
            </div>

            {/* Event + interaction area */}
            <div
              ref={timelineRef}
              className="flex-1 relative mr-4 touch-none select-none"
              style={{ height: totalHeight }}
              onMouseDown={handlePointerDown}
              onMouseMove={handlePointerMove}
              onTouchStart={handlePointerDown}
              onTouchMove={handleTouchMove}
            >
              {/* Hour grid lines */}
              {hours.map(h => (
                <div
                  key={h}
                  style={{ top: (h - START_HOUR) * HOUR_HEIGHT }}
                  className="absolute left-0 right-0 border-t border-[#1a1a1e] pointer-events-none"
                />
              ))}
              {/* 30-min half-hour lines */}
              {hours.map(h => (
                <div
                  key={`${h}h`}
                  style={{ top: (h - START_HOUR) * HOUR_HEIGHT + HOUR_HEIGHT / 2 }}
                  className="absolute left-0 right-0 border-t border-[#1a1a1e]/40 pointer-events-none"
                />
              ))}

              {/* ── Now line ── */}
              {nowTop !== null && (
                <div
                  style={{ top: nowTop }}
                  className="absolute left-0 right-0 flex items-center z-20 pointer-events-none"
                >
                  <div className="w-2.5 h-2.5 rounded-full bg-[#ef4444] flex-shrink-0 -ml-1.5 shadow-sm" />
                  <div className="flex-1 h-px bg-[#ef4444]" />
                </div>
              )}

              {/* ── Calendar events (meetings) ── */}
              {calEvents.map(e => {
                const s = new Date(e.start.dateTime)
                const en = new Date(e.end.dateTime)
                const { top, height } = blockGeometry(s.getHours(), s.getMinutes(), (en - s) / 60000)
                const isTask = (e.subject || '').startsWith('🟦') || (e.subject || '').startsWith('✅')
                return (
                  <div
                    key={e.id}
                    style={{ top, height }}
                    className={`absolute left-0 right-0 rounded-xl px-2.5 py-1 pointer-events-none overflow-hidden ${
                      isTask
                        ? 'bg-[#3b82f6]/20 border border-[#3b82f6]/40'
                        : 'bg-[#3f3f46]/50 border border-[#3f3f46]/70'
                    }`}
                  >
                    <p className={`text-xs font-medium truncate leading-snug ${isTask ? 'text-[#3b82f6]' : 'text-[#a1a1aa]'}`}>
                      {(e.subject || 'Busy').replace(/^[🟦✅]\s*/, '')}
                    </p>
                    {height > 36 && (
                      <p className="text-[10px] text-[#71717a]">
                        {`${s.getHours() % 12 || 12}:${String(s.getMinutes()).padStart(2, '0')}${s.getHours() >= 12 ? 'p' : 'a'}`}
                        {' – '}
                        {`${en.getHours() % 12 || 12}:${String(en.getMinutes()).padStart(2, '0')}${en.getHours() >= 12 ? 'p' : 'a'}`}
                      </p>
                    )}
                  </div>
                )
              })}

              {/* ── DayBlocks scheduled tasks ── */}
              {scheduledTasks.map(t => {
                const [sh, sm] = t.scheduled_start_time.slice(0, 5).split(':').map(Number)
                const { top, height } = blockGeometry(sh, sm, t.estimated_minutes || 30)
                return (
                  <div
                    key={t.id}
                    style={{ top, height }}
                    className="absolute left-0 right-0 rounded-xl px-2.5 py-1 pointer-events-none bg-[#3b82f6]/15 border border-[#3b82f6]/30"
                  >
                    <p className="text-xs text-[#3b82f6] truncate">{t.title}</p>
                  </div>
                )
              })}

              {/* ── Preview block (task being placed) ── */}
              {previewBlock && (
                <div
                  style={{ top: previewBlock.top, height: previewBlock.height }}
                  className="absolute left-0 right-0 rounded-xl border-2 border-[#a855f7] bg-[#a855f7]/25 pointer-events-none z-10"
                >
                  <p className="text-xs text-[#a855f7] font-semibold px-2.5 py-1 truncate">{task.title}</p>
                  {previewBlock.height > 36 && selectedTime && (
                    <p className="text-[10px] text-[#a855f7]/70 px-2.5">{formatTime(selectedTime)}</p>
                  )}
                </div>
              )}
            </div>

          </div>
        )}
      </div>

      {/* ── Schedule button ── */}
      <div className="px-5 pb-8 pt-3 border-t border-[#1a1a1e] flex-shrink-0">
        {selectedTime ? (
          <button
            onClick={handleSchedule}
            disabled={scheduling}
            className="w-full h-12 bg-[#3b82f6] text-white rounded-2xl text-base font-semibold active:bg-[#2563eb] disabled:opacity-50"
          >
            {scheduling ? 'Scheduling…' : `Schedule at ${formatTime(selectedTime)}`}
          </button>
        ) : (
          <div className="w-full h-12 bg-[#1a1a1e] rounded-2xl flex items-center justify-center">
            <p className="text-[#3f3f46] text-sm">Tap the timeline to pick a time</p>
          </div>
        )}
      </div>

    </div>
  )
}
