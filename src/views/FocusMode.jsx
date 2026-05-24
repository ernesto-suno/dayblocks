import { useState, useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useTasks } from '../hooks/useTasks'
import { useApp } from '../store/AppContext'
import { focusCheckIn } from '../lib/claude'

export default function FocusMode({ task, onExit }) {
  const { completeTask, updateTask } = useTasks()
  const { state } = useApp()
  const [elapsed, setElapsed] = useState(0)      // seconds
  const [running, setRunning] = useState(true)
  const [subtasks, setSubtasks] = useState(task.subtasks || [])
  const [checkIn, setCheckIn] = useState(null)   // { minute, question, response, loading }
  const [checkInInput, setCheckInInput] = useState('')
  const [done, setDone] = useState(false)         // celebration shown
  const [exiting, setExiting] = useState(false)
  const intervalRef = useRef(null)
  const checkInFiredAt = useRef(new Set())

  const interval = state.settings.focusCheckInInterval // in minutes, 0 = off

  // Timer
  useEffect(() => {
    if (running) {
      intervalRef.current = setInterval(() => setElapsed(e => e + 1), 1000)
    } else {
      clearInterval(intervalRef.current)
    }
    return () => clearInterval(intervalRef.current)
  }, [running])

  // Check-in triggers
  useEffect(() => {
    if (!interval || interval === 0) return
    const elapsedMin = Math.floor(elapsed / 60)

    // Fire at N, 2N, etc.
    const checkPoints = [interval, interval * 2]
    for (const cp of checkPoints) {
      if (elapsedMin >= cp && !checkInFiredAt.current.has(cp)) {
        checkInFiredAt.current.add(cp)
        setCheckIn({
          minute: cp,
          question: cp === interval
            ? `Still working on this? Quick check-in — what's done so far?`
            : `You've been at this ${cp} min. How's it going? Need to adjust the plan?`,
          response: null,
          loading: false,
        })
        break
      }
    }
  }, [elapsed, interval])

  async function sendCheckIn() {
    if (!checkInInput.trim()) { setCheckIn(null); setCheckInInput(''); return }
    setCheckIn(c => ({ ...c, loading: true }))
    try {
      const reply = await focusCheckIn(task.title, Math.floor(elapsed / 60), checkInInput)
      setCheckIn(c => ({ ...c, response: reply, loading: false }))
    } catch {
      setCheckIn(c => ({ ...c, response: 'Keep going — you\'re doing great.', loading: false }))
    }
    setCheckInInput('')
  }

  function dismissCheckIn() {
    setCheckIn(null)
    setCheckInInput('')
  }

  function toggleSubtask(id) {
    const updated = subtasks.map(s => s.id === id ? { ...s, completed: !s.completed } : s)
    setSubtasks(updated)
    updateTask(task.id, { subtasks: updated }).catch(console.error)
  }

  async function handleDone() {
    setRunning(false)
    const minutes = Math.ceil(elapsed / 60)
    await completeTask(task, minutes)
    setDone(true)
  }

  function handlePause() {
    setRunning(v => !v)
  }

  async function handleExit() {
    setExiting(true)
    setRunning(false)
    // Save elapsed time as partial
    const minutes = Math.ceil(elapsed / 60)
    if (minutes > 0) {
      await updateTask(task.id, { actual_minutes: minutes }).catch(console.error)
    }
    onExit()
  }

  const formatElapsed = (secs) => {
    const m = Math.floor(secs / 60)
    const s = secs % 60
    return `${m}:${s.toString().padStart(2, '0')}`
  }

  const completedCount = subtasks.filter(s => s.completed).length

  // Celebration screen
  if (done) {
    const actualMin = Math.ceil(elapsed / 60)
    const estimated = task.estimated_minutes
    const diff = estimated ? actualMin - estimated : null

    return (
      <motion.div
        className="fixed inset-0 bg-[#111113] flex flex-col items-center justify-center px-6 z-50"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
      >
        <div className="text-6xl mb-6">✅</div>
        <h2 className="text-2xl font-bold text-[#f4f4f5] text-center mb-2">{task.title}</h2>
        <p className="text-[#a1a1aa] text-center mb-6">
          {estimated
            ? `That took ${actualMin} min vs your ${estimated} min estimate.${
                diff === 0 ? ' Spot on.' : diff < 0 ? ' Faster than expected.' : ' A little longer, but done is done.'
              }`
            : `That took ${actualMin} minutes. Done!`
          }
        </p>
        <button
          onClick={onExit}
          className="h-14 px-8 bg-[#22c55e] text-white rounded-2xl font-semibold text-lg active:bg-[#16a34a] touch-target"
        >
          Back to Today
        </button>
      </motion.div>
    )
  }

  return (
    <motion.div
      className="fixed inset-0 bg-[#111113] flex flex-col z-50 safe-top"
      initial={{ y: '100%' }}
      animate={{ y: 0 }}
      exit={{ y: '100%' }}
      transition={{ type: 'spring', damping: 30, stiffness: 300 }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-5 pt-4 pb-3">
        <button
          onClick={handleExit}
          className="text-[#71717a] text-sm active:text-[#f4f4f5] touch-target"
        >
          ← Exit
        </button>
        <span className="text-xs text-[#3b82f6] font-medium uppercase tracking-wider">Focus</span>
        <button
          onClick={handlePause}
          className="text-[#71717a] text-sm active:text-[#f4f4f5] touch-target"
        >
          {running ? 'Pause' : 'Resume'}
        </button>
      </div>

      {/* Task title */}
      <div className="px-5 pt-4 flex-shrink-0">
        <h1 className="text-2xl font-bold text-[#f4f4f5] leading-tight">{task.title}</h1>
        {task.notes && (
          <p className="text-[#71717a] text-sm mt-1">{task.notes}</p>
        )}
      </div>

      {/* Timer */}
      <div className="flex items-center justify-center py-8 flex-shrink-0">
        <div className="text-center">
          <div className={`text-6xl font-mono font-bold tabular-nums ${running ? 'text-[#f4f4f5]' : 'text-[#71717a]'}`}>
            {formatElapsed(elapsed)}
          </div>
          {!running && (
            <div className="text-[#eab308] text-sm mt-2 animate-pulse-gentle">Paused</div>
          )}
        </div>
      </div>

      {/* Subtasks */}
      {subtasks.length > 0 && (
        <div className="px-5 flex-1 overflow-y-auto">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs text-[#71717a] font-medium uppercase tracking-wider">Subtasks</span>
            <span className="text-xs text-[#71717a]">{completedCount}/{subtasks.length}</span>
          </div>
          <div className="space-y-2">
            {subtasks.map(sub => (
              <button
                key={sub.id}
                onClick={() => toggleSubtask(sub.id)}
                className="w-full bg-[#1a1a1e] rounded-xl p-4 flex items-center gap-3 active:bg-[#242428] touch-target"
              >
                <div className={`w-5 h-5 rounded-md border flex items-center justify-center flex-shrink-0 ${
                  sub.completed ? 'bg-[#22c55e] border-[#22c55e]' : 'border-[#3f3f46]'
                }`}>
                  {sub.completed && <span className="text-white text-xs">✓</span>}
                </div>
                <span className={`text-sm text-left ${sub.completed ? 'line-through text-[#71717a]' : 'text-[#f4f4f5]'}`}>
                  {sub.title}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="px-5 pb-safe pt-4 flex-shrink-0">
        <button
          onClick={handleDone}
          className="w-full h-14 bg-[#22c55e] text-white rounded-2xl font-semibold text-lg active:bg-[#16a34a] touch-target"
        >
          Done ✓
        </button>
      </div>

      {/* Check-in banner */}
      <AnimatePresence>
        {checkIn && (
          <motion.div
            className="absolute inset-x-0 top-0 bg-[#1a1a1e] border-b border-[#242428] px-5 py-4 safe-top z-10"
            initial={{ y: '-100%' }}
            animate={{ y: 0 }}
            exit={{ y: '-100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
          >
            <div className="flex items-start justify-between gap-3 mb-3">
              <p className="text-[#f4f4f5] text-sm font-medium">{checkIn.question}</p>
              <button onClick={dismissCheckIn} className="text-[#71717a] text-xs flex-shrink-0">Dismiss</button>
            </div>

            {checkIn.response ? (
              <div className="bg-[#242428] rounded-xl p-3 mb-3">
                <p className="text-[#a1a1aa] text-sm">✦ {checkIn.response}</p>
              </div>
            ) : (
              <div className="flex gap-2">
                <input
                  value={checkInInput}
                  onChange={e => setCheckInInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && sendCheckIn()}
                  placeholder="How's it going?"
                  className="flex-1 bg-[#242428] rounded-xl px-3 py-2.5 text-[#f4f4f5] text-sm outline-none placeholder-[#71717a]"
                />
                <button
                  onClick={sendCheckIn}
                  disabled={checkIn.loading}
                  className="h-10 px-4 bg-[#3b82f6] text-white rounded-xl text-sm active:bg-[#2563eb]"
                >
                  {checkIn.loading ? '…' : 'Send'}
                </button>
              </div>
            )}

            {checkIn.response && (
              <button onClick={dismissCheckIn} className="w-full text-center text-xs text-[#71717a] mt-2 py-1">
                Thanks, keep going →
              </button>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}
