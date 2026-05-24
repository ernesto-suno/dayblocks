import { useState, useEffect, useRef } from 'react'
import { format, addDays, subDays } from 'date-fns'
import { getCalendarEvents } from '../../lib/graph'
import { useTasks } from '../../hooks/useTasks'
import LoadingSpinner from './LoadingSpinner'

const HOUR_HEIGHT = 80
const START_HOUR = 6
const END_HOUR = 22
const SNAP_MINUTES = 15

function localDateStr(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

function hhmm(totalMinutes) {
  const h = Math.floor(totalMinutes / 60)
  const m = totalMinutes % 60
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

function hhmmToMins(str) {
  const [h, m] = str.slice(0, 5).split(':').map(Number)
  return h * 60 + m
}

function formatTime(str) {
  if (!str) return ''
  const [h, m] = str.slice(0, 5).split(':').map(Number)
  return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${h >= 12 ? 'pm' : 'am'}`
}

// y in pixels from top of timeline → snapped "HH:MM" or null
function yToTime(y) {
  const rawMins = (y / HOUR_HEIGHT) * 60
  const snappedMins = Math.round(rawMins / SNAP_MINUTES) * SNAP_MINUTES
  const totalMins = START_HOUR * 60 + snappedMins
  const hour = Math.floor(totalMins / 60)
  const min = totalMins % 60
  if (hour < START_HOUR || hour >= END_HOUR) return null
  return hhmm(hour * 60 + min)
}

// Geometry for an event block
function blockStyle(startHHMM, durationMins) {
  const startMins = hhmmToMins(startHHMM)
  const top = ((startMins - START_HOUR * 60) / 60) * HOUR_HEIGHT
  const height = Math.max(26, (durationMins / 60) * HOUR_HEIGHT)
  return { top, height }
}

export default function VisualScheduleSheet({ isOpen, onClose, task }) {
  const { scheduleTask, tasks } = useTasks()
  const todayStr = localDateStr(new Date())

  const [date, setDate] = useState(todayStr)
  const [selectedTime, setSelectedTime] = useState(null)
  const [duration, setDuration] = useState(30)
  const [calEvents, setCalEvents] = useState([])
  const [eventsLoading, setEventsLoading] = useState(false)
  const [scheduling, setScheduling] = useState(false)

  const scrollRef = useRef(null)
  const eventAreaRef = useRef(null)

  // ── On open: pre-fill from task ──────────────────────────────────────────
  useEffect(() => {
    if (isOpen && task) {
      setDate(task.scheduled_date || todayStr)
      setSelectedTime(task.scheduled_start_time?.slice(0, 5) || null)
      setDuration(task.estimated_minutes || 30)
    }
  }, [isOpen, task])

  // ── Load calendar events when date changes ───────────────────────────────
  useEffect(() => {
    if (!isOpen) return
    setEventsLoading(true)
    getCalendarEvents(new Date(`${date}T12:00:00`))
      .then(data => setCalEvents((data || []).filter(e => !e.isAllDay)))
      .catch(() => setCalEvents([]))
      .finally(() => setEventsLoading(false))
  }, [date, isOpen])

  // ── Scroll to selected / current time on open ────────────────────────────
  useEffect(() => {
    if (!isOpen || !scrollRef.current) return
    const h = selectedTime ? parseInt(selectedTime) : new Date().getHours()
    const px = Math.max(0, (h - START_HOUR - 1) * HOUR_HEIGHT)
    setTimeout(() => scrollRef.current?.scrollTo({ top: px, behavior: 'smooth' }), 150)
  }, [isOpen])

  // ── Non-passive touch listeners for drag-to-place ────────────────────────
  // React's synthetic onTouchMove is passive → e.preventDefault() silently fails.
  // We attach directly with { passive: false } so scroll is suppressed during drag.
  useEffect(() => {
    const el = eventAreaRef.current
    if (!el || !isOpen) return

    // Y relative to the top of the event-area element (getBoundingClientRect
    // already accounts for scroll, so we must NOT add scrollTop again)
    function getY(touch) {
      const rect = el.getBoundingClientRect()
      return touch.clientY - rect.top
    }

    function onTouchStart(e) {
      const t = yToTime(getY(e.touches[0]))
      if (t) setSelectedTime(t)
    }

    function onTouchMove(e) {
      e.preventDefault()           // stops page/container scroll while dragging
      const t = yToTime(getY(e.touches[0]))
      if (t) setSelectedTime(t)
    }

    el.addEventListener('touchstart', onTouchStart, { passive: true })
    el.addEventListener('touchmove',  onTouchMove,  { passive: false })
    return () => {
      el.removeEventListener('touchstart', onTouchStart)
      el.removeEventListener('touchmove',  onTouchMove)
    }
  }, [isOpen, date])   // re-attach when open state or date changes

  // ── Desktop click handler ─────────────────────────────────────────────────
  function handleClick(e) {
    const rect = eventAreaRef.current?.getBoundingClientRect()
    if (!rect) return
    const y = e.clientY - rect.top   // no scrollTop — rect already accounts for it
    const t = yToTime(y)
    if (t) setSelectedTime(t)
  }

  // ── Date helpers ──────────────────────────────────────────────────────────
  function changeDate(delta) {
    const d = new Date(`${date}T12:00:00`)
    d.setDate(d.getDate() + delta)
    setDate(localDateStr(d))
  }

  function scrollToHour(hour) {
    if (!scrollRef.current) return
    const px = Math.max(0, (hour - START_HOUR - 0.5) * HOUR_HEIGHT)
    scrollRef.current.scrollTo({ top: px, behavior: 'smooth' })
  }

  // ── Schedule save ─────────────────────────────────────────────────────────
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

  if (!isOpen || !task) return null

  // Other DayBlocks tasks on this day (not the one being rescheduled)
  const scheduledTasks = tasks.filter(t =>
    t.scheduled_date === date &&
    t.scheduled_start_time &&
    t.status === 'scheduled' &&
    t.id !== task?.id
  )

  const hours = Array.from({ length: END_HOUR - START_HOUR }, (_, i) => START_HOUR + i)
  const totalHeight = (END_HOUR - START_HOUR) * HOUR_HEIGHT

  // Now-line
  const now = new Date()
  let nowTop = null
  if (date === todayStr) {
    const minsFromStart = (now.getHours() * 60 + now.getMinutes()) - START_HOUR * 60
    if (minsFromStart >= 0 && minsFromStart < (END_HOUR - START_HOUR) * 60)
      nowTop = (minsFromStart / 60) * HOUR_HEIGHT
  }

  // Preview block
  let preview = null
  if (selectedTime) {
    const { top, height } = blockStyle(selectedTime, duration)
    preview = { top, height }
  }

  const dayLabel = date === todayStr
    ? 'Today'
    : date === localDateStr(new Date(Date.now() + 86400000))
      ? 'Tomorrow'
      : format(new Date(`${date}T12:00:00`), 'EEE, MMM d')

  return (
    <div className="fixed inset-0 bg-[#111113] z-50 flex flex-col">

      {/* ── Top bar ── */}
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

        {/* Date nav */}
        <div className="flex items-center justify-between">
          <button onClick={() => changeDate(-1)} className="w-10 h-10 flex items-center justify-center text-2xl text-[#71717a]">‹</button>
          <div className="text-center">
            <p className="text-[#f4f4f5] text-sm font-medium">{dayLabel}</p>
            {date !== todayStr && (
              <button onClick={() => setDate(todayStr)} className="text-[#3b82f6] text-xs">Back to today</button>
            )}
          </div>
          <button onClick={() => changeDate(1)} className="w-10 h-10 flex items-center justify-center text-2xl text-[#71717a]">›</button>
        </div>
      </div>

      {/* ── Duration + jump buttons ── */}
      <div className="px-4 py-2 flex items-center gap-2 flex-shrink-0 border-b border-[#1a1a1e] overflow-x-auto no-scrollbar">
        {[15, 30, 45, 60, 90, 120].map(d => (
          <button
            key={d}
            onClick={() => setDuration(d)}
            className={`px-2.5 h-7 rounded-full text-xs flex-shrink-0 transition-all ${
              duration === d ? 'bg-[#3b82f6]/20 text-[#3b82f6]' : 'bg-[#1a1a1e] text-[#71717a]'
            }`}
          >
            {d >= 60 ? `${d / 60}h` : `${d}m`}
          </button>
        ))}
        <div className="w-px h-5 bg-[#242428] flex-shrink-0 mx-1" />
        {[{ label: '🌅 AM', hour: 7 }, { label: '☀️ Noon', hour: 11 }, { label: '🌆 PM', hour: 15 }].map(j => (
          <button
            key={j.hour}
            onClick={() => scrollToHour(j.hour)}
            className="px-2.5 h-7 rounded-full text-xs flex-shrink-0 bg-[#1a1a1e] text-[#71717a] active:bg-[#242428]"
          >
            {j.label}
          </button>
        ))}
      </div>

      {/* ── Selected time pill ── */}
      <div className="px-5 h-9 flex items-center justify-between flex-shrink-0">
        {selectedTime ? (
          <>
            <span className="text-sm">
              <span className="text-[#a855f7] font-semibold">{formatTime(selectedTime)}</span>
              <span className="text-[#71717a]">
                {' → '}{formatTime(hhmm(hhmmToMins(selectedTime) + duration))}{' · '}{duration} min
              </span>
            </span>
            <button onClick={() => setSelectedTime(null)} className="text-[#3f3f46] text-xs">Clear</button>
          </>
        ) : (
          <p className="text-[#3f3f46] text-xs w-full text-center">Tap or drag on the timeline to place your task</p>
        )}
      </div>

      {/* ── Timeline ── */}
      <div ref={scrollRef} className="flex-1 min-h-0 overflow-y-auto">
        {eventsLoading ? (
          <div className="flex items-center justify-center py-12">
            <LoadingSpinner size={24} />
          </div>
        ) : (
          <div className="flex pb-8">

            {/* Hour labels — touchable for scrolling (doesn't interfere with placement) */}
            <div className="flex-shrink-0 w-12">
              {hours.map(h => (
                <div key={h} style={{ height: HOUR_HEIGHT }} className="flex items-start justify-end pr-2 pt-1">
                  <span className="text-[10px] text-[#3f3f46] leading-none">
                    {h === 0 ? '12a' : h < 12 ? `${h}a` : h === 12 ? '12p' : `${h - 12}p`}
                  </span>
                </div>
              ))}
            </div>

            {/* Event + touch area */}
            <div
              ref={eventAreaRef}
              onClick={handleClick}
              className="flex-1 relative mr-3 cursor-pointer"
              style={{ height: totalHeight }}
            >
              {/* Hour lines */}
              {hours.map(h => (
                <div key={h} style={{ top: (h - START_HOUR) * HOUR_HEIGHT }}
                  className="absolute left-0 right-0 border-t border-[#1a1a1e] pointer-events-none" />
              ))}
              {/* Half-hour lines */}
              {hours.map(h => (
                <div key={`${h}h`} style={{ top: (h - START_HOUR) * HOUR_HEIGHT + HOUR_HEIGHT / 2 }}
                  className="absolute left-0 right-0 border-t border-[#1a1a1e]/40 pointer-events-none" />
              ))}

              {/* Now line */}
              {nowTop !== null && (
                <div style={{ top: nowTop }} className="absolute left-0 right-0 flex items-center z-20 pointer-events-none">
                  <div className="w-2.5 h-2.5 rounded-full bg-[#ef4444] -ml-1.5 flex-shrink-0" />
                  <div className="flex-1 h-px bg-[#ef4444]" />
                </div>
              )}

              {/* Calendar events */}
              {calEvents.map(e => {
                const s = new Date(e.start.dateTime)
                const en = new Date(e.end.dateTime)
                const durMins = Math.round((en - s) / 60000)
                const startStr = `${String(s.getHours()).padStart(2,'0')}:${String(s.getMinutes()).padStart(2,'0')}`
                const { top, height } = blockStyle(startStr, durMins)
                const isOwnTask = (e.subject || '').startsWith('🟦') || (e.subject || '').startsWith('✅')
                return (
                  <div
                    key={e.id}
                    style={{ top, height }}
                    className={`absolute left-0 right-0 rounded-xl px-2.5 py-1 pointer-events-none overflow-hidden ${
                      isOwnTask
                        ? 'bg-[#3b82f6]/20 border border-[#3b82f6]/40'
                        : 'bg-[#3f3f46]/60 border border-[#3f3f46]'
                    }`}
                  >
                    <p className={`text-xs font-medium leading-snug truncate ${isOwnTask ? 'text-[#3b82f6]' : 'text-[#a1a1aa]'}`}>
                      {(e.subject || 'Busy').replace(/^[🟦✅]\s*/, '')}
                    </p>
                    {height > 36 && (
                      <p className="text-[10px] text-[#71717a]">
                        {formatTime(startStr)} – {formatTime(`${String(en.getHours()).padStart(2,'0')}:${String(en.getMinutes()).padStart(2,'0')}`)}
                      </p>
                    )}
                  </div>
                )
              })}

              {/* Scheduled DayBlocks tasks */}
              {scheduledTasks.map(t => {
                const { top, height } = blockStyle(t.scheduled_start_time.slice(0, 5), t.estimated_minutes || 30)
                return (
                  <div key={t.id} style={{ top, height }}
                    className="absolute left-0 right-0 rounded-xl px-2.5 py-1 pointer-events-none bg-[#3b82f6]/15 border border-[#3b82f6]/30">
                    <p className="text-xs text-[#3b82f6] truncate">{t.title}</p>
                  </div>
                )
              })}

              {/* Preview block — purple, follows finger */}
              {preview && (
                <div style={{ top: preview.top, height: preview.height }}
                  className="absolute left-0 right-0 rounded-xl border-2 border-[#a855f7] bg-[#a855f7]/25 pointer-events-none z-10">
                  <p className="text-xs text-[#a855f7] font-semibold px-2.5 py-1 truncate leading-snug">{task.title}</p>
                  {preview.height > 32 && selectedTime && (
                    <p className="text-[10px] text-[#a855f7]/70 px-2.5">{formatTime(selectedTime)}</p>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ── Bottom CTA ── */}
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
            <span className="text-[#3f3f46] text-sm">Tap the timeline to pick a time</span>
          </div>
        )}
      </div>

    </div>
  )
}
