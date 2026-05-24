import { useState, useEffect, useRef } from 'react'
import { format, addDays, subDays } from 'date-fns'
import { getCalendarEvents } from '../../lib/graph'
import { useTasks } from '../../hooks/useTasks'
import LoadingSpinner from './LoadingSpinner'

const HOUR_HEIGHT = 80    // px per hour
const START_HOUR  = 6     // 6 am
const END_HOUR    = 22    // 10 pm
const SNAP        = 15    // snap to nearest 15 min

// ── helpers ────────────────────────────────────────────────────────────────

function localDateStr(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

function hhmmToMins(str) {
  const [h, m] = str.slice(0, 5).split(':').map(Number)
  return h * 60 + m
}

function minsToHHMM(mins) {
  const h = Math.floor(mins / 60)
  const m = mins % 60
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

function fmt(hhmm) {
  if (!hhmm) return ''
  const [h, m] = hhmm.slice(0, 5).split(':').map(Number)
  return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${h >= 12 ? 'pm' : 'am'}`
}

// Convert a raw y-pixel (from top of timeline content) → snapped "HH:MM" or null
function yToTime(y) {
  const rawMins    = (y / HOUR_HEIGHT) * 60
  const snapped    = Math.round(rawMins / SNAP) * SNAP
  const totalMins  = START_HOUR * 60 + snapped
  const hour       = Math.floor(totalMins / 60)
  const min        = totalMins % 60
  if (hour < START_HOUR || hour >= END_HOUR) return null
  return minsToHHMM(hour * 60 + min)
}

// ── component ──────────────────────────────────────────────────────────────

export default function VisualScheduleSheet({ isOpen, onClose, task }) {
  const { scheduleTask, tasks } = useTasks()
  const todayStr = localDateStr(new Date())

  const [date,         setDate]         = useState(todayStr)
  const [selectedTime, setSelectedTime] = useState(null)
  const [duration,     setDuration]     = useState(30)
  const [calEvents,    setCalEvents]    = useState([])
  const [eventsLoading,setEventsLoading]= useState(false)
  const [scheduling,   setScheduling]   = useState(false)

  const scrollRef   = useRef(null)   // the scrollable container
  const eventAreaRef= useRef(null)   // the inner tap/drag area

  // Pre-fill from task whenever the sheet opens
  useEffect(() => {
    if (!isOpen || !task) return
    setDate(task.scheduled_date || todayStr)
    setSelectedTime(task.scheduled_start_time?.slice(0, 5) || null)
    setDuration(task.estimated_minutes || 30)
  }, [isOpen, task])

  // Load calendar events for the selected date
  useEffect(() => {
    if (!isOpen) return
    setEventsLoading(true)
    getCalendarEvents(new Date(`${date}T12:00:00`))
      .then(data => setCalEvents((data || []).filter(e => !e.isAllDay)))
      .catch(() => setCalEvents([]))
      .finally(() => setEventsLoading(false))
  }, [date, isOpen])

  // Scroll to current/selected time on open
  useEffect(() => {
    if (!isOpen || !scrollRef.current) return
    const targetH = selectedTime ? parseInt(selectedTime) : new Date().getHours()
    const px = Math.max(0, (targetH - START_HOUR - 1) * HOUR_HEIGHT)
    setTimeout(() => scrollRef.current?.scrollTo({ top: px, behavior: 'smooth' }), 180)
  }, [isOpen])

  // ── Coordinate helper ────────────────────────────────────────────────────
  // KEY FIX: reference the scroll CONTAINER, not the tall inner div.
  // On iOS Safari, getBoundingClientRect() on a ~1280px element inside a
  // scrolled container returns incorrect values.  The scroll container itself
  // is a stable fixed-child and always reports a correct viewport rect.
  //
  //   y = (clientY − scrollContainer.top)   →  offset inside the VISIBLE area
  //     + scrollContainer.scrollTop          →  convert to absolute content y
  function clientYToTimelineY(clientY) {
    const el = scrollRef.current
    if (!el) return 0
    const rect = el.getBoundingClientRect()      // stable: direct child of fixed overlay
    return (clientY - rect.top) + el.scrollTop   // visible-area offset + scroll offset
  }

  // ── Touch listeners (attached directly, non-passive for touchmove) ────────
  useEffect(() => {
    const area = eventAreaRef.current
    if (!area || !isOpen) return

    function onTouchStart(e) {
      const y = clientYToTimelineY(e.touches[0].clientY)
      const t = yToTime(y)
      if (t) setSelectedTime(t)
    }

    function onTouchMove(e) {
      e.preventDefault()    // must be non-passive to suppress scroll while dragging
      const y = clientYToTimelineY(e.touches[0].clientY)
      const t = yToTime(y)
      if (t) setSelectedTime(t)
    }

    area.addEventListener('touchstart', onTouchStart, { passive: true  })
    area.addEventListener('touchmove',  onTouchMove,  { passive: false })
    return () => {
      area.removeEventListener('touchstart', onTouchStart)
      area.removeEventListener('touchmove',  onTouchMove)
    }
  }, [isOpen, date])   // re-attach when date changes (new render)

  // Desktop click
  function handleClick(e) {
    const y = clientYToTimelineY(e.clientY)
    const t = yToTime(y)
    if (t) setSelectedTime(t)
  }

  // ── Date navigation ───────────────────────────────────────────────────────
  function changeDate(delta) {
    const d = new Date(`${date}T12:00:00`)
    d.setDate(d.getDate() + delta)
    setDate(localDateStr(d))
  }

  function scrollToHour(h) {
    const px = Math.max(0, (h - START_HOUR - 0.5) * HOUR_HEIGHT)
    scrollRef.current?.scrollTo({ top: px, behavior: 'smooth' })
  }

  // ── Schedule ──────────────────────────────────────────────────────────────
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

  // Other scheduled tasks on this day
  const scheduledTasks = tasks.filter(t =>
    t.scheduled_date === date &&
    t.scheduled_start_time &&
    t.status === 'scheduled' &&
    t.id !== task?.id
  )

  const hours       = Array.from({ length: END_HOUR - START_HOUR }, (_, i) => START_HOUR + i)
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
    const startMins = hhmmToMins(selectedTime) - START_HOUR * 60
    preview = {
      top:    (startMins / 60) * HOUR_HEIGHT,
      height: Math.max(26, (duration / 60) * HOUR_HEIGHT),
    }
  }

  const dayLabel =
    date === todayStr                              ? 'Today'
    : date === localDateStr(new Date(Date.now() + 86400000)) ? 'Tomorrow'
    : format(new Date(`${date}T12:00:00`), 'EEE, MMM d')

  const endTime = selectedTime ? fmt(minsToHHMM(hhmmToMins(selectedTime) + duration)) : ''

  return (
    <div className="fixed inset-0 bg-[#111113] z-50 flex flex-col">

      {/* ── Header ── */}
      <div className="px-5 pt-4 pb-3 flex-shrink-0 border-b border-[#1a1a1e]">
        <div className="flex items-center justify-between mb-3">
          <button onClick={onClose}
            className="text-[#71717a] text-sm font-medium active:opacity-60 w-16">
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
          <button onClick={() => changeDate(-1)}
            className="w-10 h-10 flex items-center justify-center text-2xl text-[#71717a]">‹</button>
          <div className="text-center">
            <p className="text-[#f4f4f5] text-sm font-medium">{dayLabel}</p>
            {date !== todayStr && (
              <button onClick={() => setDate(todayStr)} className="text-[#3b82f6] text-xs">Back to today</button>
            )}
          </div>
          <button onClick={() => changeDate(1)}
            className="w-10 h-10 flex items-center justify-center text-2xl text-[#71717a]">›</button>
        </div>
      </div>

      {/* ── Duration + quick-jump ── */}
      <div className="px-4 py-2 flex items-center gap-2 flex-shrink-0 border-b border-[#1a1a1e] overflow-x-auto no-scrollbar">
        {[15, 30, 45, 60, 90, 120].map(d => (
          <button key={d} onClick={() => setDuration(d)}
            className={`px-2.5 h-7 rounded-full text-xs flex-shrink-0 transition-all ${
              duration === d ? 'bg-[#3b82f6]/20 text-[#3b82f6]' : 'bg-[#1a1a1e] text-[#71717a]'
            }`}>
            {d >= 60 ? `${d / 60}h` : `${d}m`}
          </button>
        ))}
        <div className="w-px h-4 bg-[#242428] flex-shrink-0 mx-1" />
        {[{ label: '🌅 AM', h: 7 }, { label: '☀️ Noon', h: 11 }, { label: '🌆 PM', h: 15 }].map(j => (
          <button key={j.h} onClick={() => scrollToHour(j.h)}
            className="px-2.5 h-7 rounded-full text-xs flex-shrink-0 bg-[#1a1a1e] text-[#71717a] active:bg-[#242428]">
            {j.label}
          </button>
        ))}
      </div>

      {/* ── Selected time summary ── */}
      <div className="px-5 h-9 flex items-center justify-between flex-shrink-0">
        {selectedTime ? (
          <>
            <span className="text-sm">
              <span className="text-[#a855f7] font-semibold">{fmt(selectedTime)}</span>
              <span className="text-[#71717a]"> → {endTime} · {duration} min</span>
            </span>
            <button onClick={() => setSelectedTime(null)} className="text-[#3f3f46] text-xs">Clear</button>
          </>
        ) : (
          <p className="text-[#3f3f46] text-xs w-full text-center">Tap or drag on the timeline ↓</p>
        )}
      </div>

      {/* ── Timeline (scrollable) ── */}
      <div ref={scrollRef} className="flex-1 min-h-0 overflow-y-auto">
        {eventsLoading ? (
          <div className="flex items-center justify-center py-12">
            <LoadingSpinner size={24} />
          </div>
        ) : (
          <div className="flex pb-8">

            {/* Hour labels — untouched, user can swipe here to scroll */}
            <div className="flex-shrink-0 w-12">
              {hours.map(h => (
                <div key={h} style={{ height: HOUR_HEIGHT }}
                  className="flex items-start justify-end pr-2 pt-1">
                  <span className="text-[10px] text-[#3f3f46] leading-none">
                    {h === 0 ? '12a' : h < 12 ? `${h}a` : h === 12 ? '12p' : `${h - 12}p`}
                  </span>
                </div>
              ))}
            </div>

            {/* Tap / drag area */}
            <div
              ref={eventAreaRef}
              onClick={handleClick}
              className="flex-1 relative mr-3 cursor-pointer select-none"
              style={{ height: totalHeight }}
            >
              {/* Hour grid */}
              {hours.map(h => (
                <div key={h}
                  style={{ top: (h - START_HOUR) * HOUR_HEIGHT }}
                  className="absolute left-0 right-0 border-t border-[#1a1a1e] pointer-events-none" />
              ))}
              {/* Half-hour grid */}
              {hours.map(h => (
                <div key={`${h}h`}
                  style={{ top: (h - START_HOUR) * HOUR_HEIGHT + HOUR_HEIGHT / 2 }}
                  className="absolute left-0 right-0 border-t border-[#1a1a1e]/40 pointer-events-none" />
              ))}

              {/* Now line */}
              {nowTop !== null && (
                <div style={{ top: nowTop }}
                  className="absolute left-0 right-0 flex items-center z-20 pointer-events-none">
                  <div className="w-2.5 h-2.5 rounded-full bg-[#ef4444] -ml-1 flex-shrink-0" />
                  <div className="flex-1 h-px bg-[#ef4444]" />
                </div>
              )}

              {/* Calendar events */}
              {calEvents.map(e => {
                const s   = new Date(e.start.dateTime)
                const end = new Date(e.end.dateTime)
                const durMins   = Math.round((end - s) / 60000)
                const startMins = (s.getHours() * 60 + s.getMinutes()) - START_HOUR * 60
                if (startMins < 0 || startMins >= (END_HOUR - START_HOUR) * 60) return null
                const top    = (startMins / 60) * HOUR_HEIGHT
                const height = Math.max(26, (durMins / 60) * HOUR_HEIGHT)
                const isTask = (e.subject || '').startsWith('🟦') || (e.subject || '').startsWith('✅')
                return (
                  <div key={e.id} style={{ top, height }}
                    className={`absolute left-0 right-0 rounded-xl px-2.5 py-1 pointer-events-none overflow-hidden ${
                      isTask
                        ? 'bg-[#3b82f6]/20 border border-[#3b82f6]/40'
                        : 'bg-[#3f3f46]/60 border border-[#3f3f46]'
                    }`}>
                    <p className={`text-xs font-medium leading-snug truncate ${isTask ? 'text-[#3b82f6]' : 'text-[#a1a1aa]'}`}>
                      {(e.subject || 'Busy').replace(/^[🟦✅]\s*/, '')}
                    </p>
                    {height > 36 && (
                      <p className="text-[10px] text-[#71717a]">
                        {fmt(`${String(s.getHours()).padStart(2,'0')}:${String(s.getMinutes()).padStart(2,'0')}`)}
                        {' – '}
                        {fmt(`${String(end.getHours()).padStart(2,'0')}:${String(end.getMinutes()).padStart(2,'0')}`)}
                      </p>
                    )}
                  </div>
                )
              })}

              {/* Other DayBlocks tasks */}
              {scheduledTasks.map(t => {
                const startMins = hhmmToMins(t.scheduled_start_time.slice(0,5)) - START_HOUR * 60
                const top    = (startMins / 60) * HOUR_HEIGHT
                const height = Math.max(26, ((t.estimated_minutes || 30) / 60) * HOUR_HEIGHT)
                return (
                  <div key={t.id} style={{ top, height }}
                    className="absolute left-0 right-0 rounded-xl px-2.5 py-1 pointer-events-none bg-[#3b82f6]/15 border border-[#3b82f6]/30">
                    <p className="text-xs text-[#3b82f6] truncate">{t.title}</p>
                  </div>
                )
              })}

              {/* Preview block — follows finger */}
              {preview && (
                <div style={{ top: preview.top, height: preview.height }}
                  className="absolute left-0 right-0 rounded-xl border-2 border-[#a855f7] bg-[#a855f7]/25 pointer-events-none z-10">
                  <p className="text-xs text-[#a855f7] font-semibold px-2.5 pt-1 truncate">{task.title}</p>
                  {preview.height > 34 && (
                    <p className="text-[10px] text-[#a855f7]/70 px-2.5">{fmt(selectedTime)}</p>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ── Schedule CTA ── */}
      <div className="px-5 pb-8 pt-3 border-t border-[#1a1a1e] flex-shrink-0">
        {selectedTime ? (
          <button onClick={handleSchedule} disabled={scheduling}
            className="w-full h-12 bg-[#3b82f6] text-white rounded-2xl text-base font-semibold active:bg-[#2563eb] disabled:opacity-50">
            {scheduling ? 'Scheduling…' : `Schedule at ${fmt(selectedTime)}`}
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
