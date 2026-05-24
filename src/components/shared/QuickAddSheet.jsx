import { useState } from 'react'
import BottomSheet from './BottomSheet'
import Button from './Button'
import { useTasks } from '../../hooks/useTasks'
import { useApp } from '../../store/AppContext'
import { format } from 'date-fns'

export default function QuickAddSheet({ isOpen, onClose, defaultTime = null, defaultDate = null }) {
  const { addTask, scheduleTask } = useTasks()
  const { state } = useApp()
  const [title, setTitle] = useState('')
  const [notes, setNotes] = useState('')
  const [priority, setPriority] = useState('medium')
  const [time, setTime] = useState(defaultTime || '')
  const [duration, setDuration] = useState(state.settings.defaultTaskDuration.toString())
  const [date, setDate] = useState(defaultDate || format(new Date(), 'yyyy-MM-dd'))
  const [loading, setLoading] = useState(false)

  async function handleSubmit() {
    if (!title.trim()) return
    setLoading(true)
    try {
      const task = await addTask({ title: title.trim(), notes, priority })
      if (time && duration) {
        await scheduleTask(task, {
          date,
          startTime: time,
          durationMinutes: parseInt(duration),
        })
      }
      setTitle(''); setNotes(''); setTime(''); setDuration(state.settings.defaultTaskDuration.toString())
      onClose()
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <BottomSheet isOpen={isOpen} onClose={onClose} title="Add task">
      <div className="px-5 pb-4 space-y-4">
        <input
          autoFocus
          value={title}
          onChange={e => setTitle(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleSubmit()}
          placeholder="What do you need to do?"
          className="w-full bg-[#242428] rounded-2xl px-4 py-3.5 text-[#f4f4f5] placeholder-[#71717a] outline-none text-base"
        />

        <textarea
          value={notes}
          onChange={e => setNotes(e.target.value)}
          placeholder="Notes (optional)"
          rows={2}
          className="w-full bg-[#242428] rounded-2xl px-4 py-3.5 text-[#f4f4f5] placeholder-[#71717a] outline-none text-sm resize-none"
        />

        {/* Priority */}
        <div>
          <label className="text-xs text-[#71717a] mb-2 block">Priority</label>
          <div className="flex gap-2">
            {['high', 'medium', 'low'].map(p => (
              <button
                key={p}
                onClick={() => setPriority(p)}
                className={`flex-1 h-10 rounded-xl text-sm capitalize transition-all ${
                  priority === p
                    ? p === 'high' ? 'bg-[#ef4444]/20 text-[#ef4444]'
                      : p === 'medium' ? 'bg-[#3b82f6]/20 text-[#3b82f6]'
                      : 'bg-[#3f3f46] text-[#a1a1aa]'
                    : 'bg-[#242428] text-[#71717a]'
                }`}
              >
                {p}
              </button>
            ))}
          </div>
        </div>

        {/* Schedule */}
        <div>
          <label className="text-xs text-[#71717a] mb-2 block">Schedule (optional)</label>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-xs text-[#71717a] mb-1 block">Date</label>
              <input
                type="date"
                value={date}
                onChange={e => setDate(e.target.value)}
                className="w-full bg-[#242428] rounded-xl px-3 py-3 text-[#f4f4f5] outline-none text-sm"
              />
            </div>
            <div>
              <label className="text-xs text-[#71717a] mb-1 block">Time</label>
              <input
                type="time"
                value={time}
                onChange={e => setTime(e.target.value)}
                className="w-full bg-[#242428] rounded-xl px-3 py-3 text-[#f4f4f5] outline-none text-sm"
              />
            </div>
          </div>

          <div className="mt-2">
            <label className="text-xs text-[#71717a] mb-1 block">Duration (minutes)</label>
            <div className="flex gap-2">
              {['15', '30', '45', '60', '90'].map(d => (
                <button
                  key={d}
                  onClick={() => setDuration(d)}
                  className={`flex-1 h-9 rounded-xl text-sm transition-all ${
                    duration === d ? 'bg-[#3b82f6]/20 text-[#3b82f6]' : 'bg-[#242428] text-[#71717a]'
                  }`}
                >
                  {d}
                </button>
              ))}
            </div>
            <input
              type="number"
              value={duration}
              onChange={e => setDuration(e.target.value)}
              placeholder="Custom minutes"
              className="mt-2 w-full bg-[#242428] rounded-xl px-3 py-2.5 text-[#f4f4f5] outline-none text-sm"
            />
          </div>
        </div>

        <Button fullWidth onClick={handleSubmit} disabled={!title.trim() || loading} size="lg">
          {loading ? 'Adding…' : time ? 'Add & Schedule' : 'Add to Backlog'}
        </Button>
      </div>
    </BottomSheet>
  )
}
