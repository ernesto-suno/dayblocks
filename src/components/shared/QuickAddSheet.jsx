import { useState } from 'react'
import BottomSheet from './BottomSheet'
import Button from './Button'
import { useTasks } from '../../hooks/useTasks'
import { useApp } from '../../store/AppContext'
import { suggestCategory } from '../../lib/claude'
import { format } from 'date-fns'

export default function QuickAddSheet({ isOpen, onClose, defaultTime = null, defaultDate = null }) {
  const { addTask, scheduleTask, tasks } = useTasks()
  const { state } = useApp()
  const [title, setTitle] = useState('')
  const [notes, setNotes] = useState('')
  const [priority, setPriority] = useState('medium')
  const [category, setCategory] = useState('')
  const [isRecurring, setIsRecurring] = useState(false)
  const [time, setTime] = useState(defaultTime || '')
  const [duration, setDuration] = useState(state.settings.defaultTaskDuration.toString())
  const [date, setDate] = useState(defaultDate || format(new Date(), 'yyyy-MM-dd'))
  const [loading, setLoading] = useState(false)
  const [categorizing, setCategorizing] = useState(false)

  // Pull existing categories from all tasks for smarter suggestions
  const existingCategories = [...new Set(tasks.map(t => t.category).filter(Boolean))]

  async function handleAutoCategory() {
    if (!title.trim()) return
    setCategorizing(true)
    try {
      const suggested = await suggestCategory(title, notes, existingCategories)
      setCategory(suggested)
    } catch (err) {
      console.error(err)
    } finally {
      setCategorizing(false)
    }
  }

  async function handleSubmit() {
    if (!title.trim()) return
    setLoading(true)
    try {
      const task = await addTask({
        title: title.trim(),
        notes,
        priority,
        category: category.trim() || null,
        is_recurring: isRecurring,
      })
      if (time && duration) {
        await scheduleTask(task, {
          date,
          startTime: time,
          durationMinutes: parseInt(duration),
        })
      }
      setTitle(''); setNotes(''); setTime(''); setCategory(''); setIsRecurring(false)
      setDuration(state.settings.defaultTaskDuration.toString())
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

        {/* Category */}
        <div>
          <label className="text-xs text-[#71717a] mb-2 block">Category</label>
          <div className="flex gap-2">
            <input
              value={category}
              onChange={e => setCategory(e.target.value)}
              placeholder="e.g. Sales, Hiring, Ops…"
              className="flex-1 bg-[#242428] rounded-xl px-3 py-2.5 text-[#f4f4f5] placeholder-[#71717a] outline-none text-sm"
            />
            <button
              onClick={handleAutoCategory}
              disabled={!title.trim() || categorizing}
              className="px-3 h-10 bg-[#a855f7]/10 text-[#a855f7] rounded-xl text-sm font-medium active:bg-[#a855f7]/20 disabled:opacity-40 flex-shrink-0"
            >
              {categorizing ? '…' : '✦ Auto'}
            </button>
          </div>
          {/* Existing category chips */}
          {existingCategories.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-2">
              {existingCategories.slice(0, 8).map(cat => (
                <button
                  key={cat}
                  onClick={() => setCategory(cat)}
                  className={`px-2.5 py-1 rounded-full text-xs transition-all ${
                    category === cat
                      ? 'bg-[#a855f7]/20 text-[#a855f7]'
                      : 'bg-[#242428] text-[#71717a]'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Priority + Recurring */}
        <div className="flex gap-3">
          <div className="flex-1">
            <label className="text-xs text-[#71717a] mb-2 block">Priority</label>
            <div className="flex gap-1.5">
              {['high', 'medium', 'low'].map(p => (
                <button
                  key={p}
                  onClick={() => setPriority(p)}
                  className={`flex-1 h-10 rounded-xl text-xs capitalize transition-all ${
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
          <div>
            <label className="text-xs text-[#71717a] mb-2 block">Recurring</label>
            <button
              onClick={() => setIsRecurring(v => !v)}
              className={`w-16 h-10 rounded-xl text-sm transition-all ${
                isRecurring ? 'bg-[#22c55e]/20 text-[#22c55e]' : 'bg-[#242428] text-[#71717a]'
              }`}
            >
              🔁
            </button>
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
            <label className="text-xs text-[#71717a] mb-1 block">Duration</label>
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
          </div>
        </div>

        <Button fullWidth onClick={handleSubmit} disabled={!title.trim() || loading} size="lg">
          {loading ? 'Adding…' : time ? 'Add & Schedule' : 'Add to Backlog'}
        </Button>
      </div>
    </BottomSheet>
  )
}
