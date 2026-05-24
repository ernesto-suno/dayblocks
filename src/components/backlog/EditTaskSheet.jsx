import { useState, useEffect } from 'react'
import BottomSheet from '../shared/BottomSheet'
import Button from '../shared/Button'
import { useTasks } from '../../hooks/useTasks'
import { suggestCategory } from '../../lib/claude'

export default function EditTaskSheet({ isOpen, onClose, task }) {
  const { updateTask, tasks } = useTasks()
  const [title, setTitle] = useState('')
  const [notes, setNotes] = useState('')
  const [priority, setPriority] = useState('medium')
  const [estimatedMinutes, setEstimatedMinutes] = useState('')
  const [targetDate, setTargetDate] = useState('')
  const [category, setCategory] = useState('')
  const [isRecurring, setIsRecurring] = useState(false)
  const [loading, setLoading] = useState(false)
  const [categorizing, setCategorizing] = useState(false)

  const existingCategories = [...new Set(tasks.map(t => t.category).filter(Boolean))]

  useEffect(() => {
    if (task) {
      setTitle(task.title || '')
      setNotes(task.notes || '')
      setPriority(task.priority || 'medium')
      setEstimatedMinutes(task.estimated_minutes?.toString() || '')
      setTargetDate(task.scheduled_date || '')
      setCategory(task.category || '')
      setIsRecurring(task.is_recurring || false)
    }
  }, [task])

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

  async function handleSave() {
    if (!title.trim()) return
    setLoading(true)
    try {
      await updateTask(task.id, {
        title: title.trim(),
        notes: notes || null,
        priority,
        estimated_minutes: estimatedMinutes ? parseInt(estimatedMinutes) : null,
        scheduled_date: targetDate || null,
        category: category.trim() || null,
        is_recurring: isRecurring,
      })
      onClose()
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  if (!task) return null

  return (
    <BottomSheet isOpen={isOpen} onClose={onClose} title="Edit task">
      <div className="px-5 pb-4 space-y-4">
        <div>
          <label className="text-xs text-[#71717a] mb-1.5 block">Title</label>
          <input
            value={title}
            onChange={e => setTitle(e.target.value)}
            className="w-full bg-[#242428] rounded-2xl px-4 py-3.5 text-[#f4f4f5] outline-none text-base"
          />
        </div>

        <div>
          <label className="text-xs text-[#71717a] mb-1.5 block">Notes</label>
          <textarea
            value={notes}
            onChange={e => setNotes(e.target.value)}
            rows={3}
            className="w-full bg-[#242428] rounded-2xl px-4 py-3 text-[#f4f4f5] outline-none text-sm resize-none"
          />
        </div>

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

        <div>
          <label className="text-xs text-[#71717a] mb-2 block">Priority</label>
          <div className="flex gap-2">
            {['high', 'medium', 'low'].map(p => (
              <button
                key={p}
                onClick={() => setPriority(p)}
                className={`flex-1 h-10 rounded-xl text-sm capitalize ${
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

        <div className="flex items-center justify-between bg-[#242428] rounded-xl px-4 py-3">
          <div>
            <p className="text-sm text-[#f4f4f5]">Recurring task</p>
            <p className="text-xs text-[#71717a] mt-0.5">Resets to backlog when completed</p>
          </div>
          <button
            onClick={() => setIsRecurring(v => !v)}
            className={`w-12 h-6 rounded-full transition-all relative ${
              isRecurring ? 'bg-[#22c55e]' : 'bg-[#3f3f46]'
            }`}
          >
            <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${
              isRecurring ? 'left-7' : 'left-1'
            }`} />
          </button>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-[#71717a] mb-1.5 block">Est. minutes</label>
            <input
              type="number"
              value={estimatedMinutes}
              onChange={e => setEstimatedMinutes(e.target.value)}
              placeholder="30"
              className="w-full bg-[#242428] rounded-xl px-3 py-3 text-[#f4f4f5] outline-none text-sm"
            />
          </div>
          <div>
            <label className="text-xs text-[#71717a] mb-1.5 block">Target date</label>
            <input
              type="date"
              value={targetDate}
              onChange={e => setTargetDate(e.target.value)}
              className="w-full bg-[#242428] rounded-xl px-3 py-3 text-[#f4f4f5] outline-none text-sm"
            />
          </div>
        </div>

        <Button fullWidth onClick={handleSave} disabled={!title.trim() || loading} size="lg">
          {loading ? 'Saving…' : 'Save Changes'}
        </Button>
      </div>
    </BottomSheet>
  )
}
