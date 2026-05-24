import { useState } from 'react'
import BottomSheet from './BottomSheet'
import Button from './Button'
import { useTasks } from '../../hooks/useTasks'
import { format } from 'date-fns'

export default function ScheduleSheet({ isOpen, onClose, task }) {
  const { scheduleTask } = useTasks()
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'))
  const [time, setTime] = useState('')
  const [duration, setDuration] = useState(task?.estimated_minutes?.toString() || '30')
  const [loading, setLoading] = useState(false)

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

  return (
    <BottomSheet isOpen={isOpen} onClose={onClose} title={`Schedule "${task.title}"`}>
      <div className="px-5 pb-4 space-y-4">
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
            <label className="text-xs text-[#71717a] mb-1.5 block">Time</label>
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
          <div className="flex gap-2 mb-2">
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
          {loading ? 'Scheduling…' : 'Schedule & Add to Calendar'}
        </Button>
      </div>
    </BottomSheet>
  )
}
