import { useState, useEffect } from 'react'
import BottomSheet from '../shared/BottomSheet'
import Button from '../shared/Button'
import { useTasks } from '../../hooks/useTasks'

export default function EditTaskSheet({ isOpen, onClose, task }) {
  const { updateTask } = useTasks()
  const [title, setTitle] = useState('')
  const [notes, setNotes] = useState('')
  const [priority, setPriority] = useState('medium')
  const [estimatedMinutes, setEstimatedMinutes] = useState('')
  const [targetDate, setTargetDate] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (task) {
      setTitle(task.title || '')
      setNotes(task.notes || '')
      setPriority(task.priority || 'medium')
      setEstimatedMinutes(task.estimated_minutes?.toString() || '')
      setTargetDate(task.scheduled_date || '')
    }
  }, [task])

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
