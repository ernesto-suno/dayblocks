import { useState, useEffect } from 'react'
import BottomSheet from './BottomSheet'
import Button from './Button'
import { useTasks } from '../../hooks/useTasks'
import { format } from 'date-fns'

export default function ScheduleSheet({ isOpen, onClose, task }) {
  const { scheduleTask } = useTasks()

  // Pre-fill with the task's existing scheduled date/time if it has one
  const [date, setDate] = useState('')
  const [time, setTime] = useState('')
  const [duration, setDuration] = useState('30')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (task) {
      setDate(task.scheduled_date || format(new Date(), 'yyyy-MM-dd'))
      // Convert "HH:MM:SS" from DB to "HH:MM" for the time input
      setTime(task.scheduled_start_time ? task.scheduled_start_time.slice(0, 5) : '')
      setDuration(task.estimated_minutes?.toString() || '30')
    }
  }, [task])

  async function handleSchedule() {
    if (!task || !time) return
    setLoading(true)
    try {
      await scheduleTask(task, { date, startTime: time, durationMinutes: parseInt(duration) || 30 })
      onClose()
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  if (!task) return null

  const isRescheduling = !!task.scheduled_start_time

  return (
    <BottomSheet
      isOpen={isOpen}
      onClose={onClose}
      title={isRescheduling ? `Move "${task.title}"` : `Schedule "${task.title}"`}
    >
      <div className="px-5 pb-4 space-y-4">

        {/* Current time pill if rescheduling */}
        {isRescheduling && (
          <div className="bg-[#242428] rounded-xl px-4 py-2.5 flex items-center gap-2">
            <span className="text-[#71717a] text-xs">Currently:</span>
            <span className="text-[#f4f4f5] text-sm font-medium">
              {task.scheduled_date} at {formatTime(task.scheduled_start_time)} · {task.estimated_minutes || 30} min
            </span>
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-[#71717a] mb-1.5 block">Date</label>
            <input
              type="date"
              value={date}
              onChange={e => setDate(e.target.value)}
              className="w-full bg-[#242428] rounded-xl px-3 py-3 text-[#f4f4f5] outline-none text-sm"
            />
          </div>
          <div>
            <label className="text-xs text-[#71717a] mb-1.5 block">New time</label>
            <input
              autoFocus
              type="time"
              value={time}
              onChange={e => setTime(e.target.value)}
              className="w-full bg-[#242428] rounded-xl px-3 py-3 text-[#f4f4f5] outline-none text-sm"
            />
          </div>
        </div>

        <div>
          <label className="text-xs text-[#71717a] mb-2 block">Duration</label>
          <div className="flex gap-2">
            {['15', '30', '45', '60', '90', '120'].map(d => (
              <button
                key={d}
                onClick={() => setDuration(d)}
                className={`flex-1 h-9 rounded-xl text-xs transition-all ${
                  duration === d ? 'bg-[#3b82f6]/20 text-[#3b82f6]' : 'bg-[#242428] text-[#71717a]'
                }`}
              >
                {d}m
              </button>
            ))}
          </div>
        </div>

        <Button fullWidth onClick={handleSchedule} disabled={!time || loading} size="lg">
          {loading ? 'Saving…' : isRescheduling ? 'Move on Calendar' : 'Schedule & Add to Calendar'}
        </Button>
      </div>
    </BottomSheet>
  )
}

function formatTime(t) {
  if (!t) return ''
  const [h, m] = t.slice(0, 5).split(':').map(Number)
  const period = h >= 12 ? 'pm' : 'am'
  return `${h % 12 || 12}:${m.toString().padStart(2, '0')} ${period}`
}
