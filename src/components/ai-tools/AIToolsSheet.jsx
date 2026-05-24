import { useState } from 'react'
import BottomSheet from '../shared/BottomSheet'
import Button from '../shared/Button'
import LoadingSpinner from '../shared/LoadingSpinner'
import { breakDownTask, findQuickWin, estimateTime } from '../../lib/claude'
import { useTasks } from '../../hooks/useTasks'
import { useCalendar } from '../../hooks/useCalendar'
import { useApp } from '../../store/AppContext'

const TOOLS = [
  {
    id: 'break-down',
    icon: '🧩',
    title: 'Break It Down',
    desc: 'Shatter task paralysis — get tiny, concrete first steps',
    color: '#a855f7',
  },
  {
    id: 'quick-win',
    icon: '⚡',
    title: 'Find a Quick Win',
    desc: 'Pick the best task for a gap in your schedule',
    color: '#eab308',
  },
  {
    id: 'time-audit',
    icon: '⏱',
    title: 'Time Auditor',
    desc: 'Get a realistic estimate based on your patterns',
    color: '#3b82f6',
  },
]

export default function AIToolsSheet({ isOpen, onClose, task }) {
  const { updateTask, tasks } = useTasks()
  const { findGaps } = useCalendar()
  const { state, openSheet } = useApp()
  const [activeTool, setActiveTool] = useState(null)
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(null)

  if (!task) return null

  async function runBreakDown() {
    setLoading(true)
    try {
      const subtasks = await breakDownTask(task.title, task.notes)
      setResult({ tool: 'break-down', subtasks })
    } catch (err) {
      setResult({ tool: 'break-down', error: err.message })
    } finally {
      setLoading(false)
    }
  }

  async function runQuickWin() {
    const gaps = findGaps(15, new Date(), state.settings)
    const backlog = tasks.filter(t => t.status === 'backlog' && t.id !== task.id)

    if (!gaps.length) {
      setResult({ tool: 'quick-win', error: 'No gaps of 15+ minutes found in today\'s schedule.' })
      return
    }

    setLoading(true)
    const largestGap = gaps.reduce((a, b) => a.minutes > b.minutes ? a : b)
    try {
      const win = await findQuickWin(largestGap.minutes, backlog)
      setResult({ tool: 'quick-win', win, gapMinutes: largestGap.minutes })
    } catch (err) {
      setResult({ tool: 'quick-win', error: err.message })
    } finally {
      setLoading(false)
    }
  }

  async function runTimeAudit() {
    setLoading(true)
    try {
      const estimate = await estimateTime(
        task.title,
        task.notes,
        task.estimated_minutes,
        null // TODO: pass actual estimation accuracy from history
      )
      setResult({ tool: 'time-audit', estimate })
    } catch (err) {
      setResult({ tool: 'time-audit', error: err.message })
    } finally {
      setLoading(false)
    }
  }

  function handleToolSelect(toolId) {
    setActiveTool(toolId)
    setResult(null)
    if (toolId === 'break-down') runBreakDown()
    else if (toolId === 'quick-win') runQuickWin()
    else if (toolId === 'time-audit') runTimeAudit()
  }

  async function saveSubtasks(subtasks) {
    await updateTask(task.id, { subtasks })
    onClose()
  }

  async function acceptTimeEstimate(minutes) {
    await updateTask(task.id, { estimated_minutes: minutes })
    onClose()
  }

  function scheduleQuickWin(taskTitle) {
    const found = tasks.find(t => t.title.toLowerCase().includes(taskTitle?.toLowerCase()))
    if (found) {
      onClose()
      setTimeout(() => openSheet('schedule', found), 300)
    }
  }

  return (
    <BottomSheet isOpen={isOpen} onClose={() => { setActiveTool(null); setResult(null); onClose() }} title="AI Tools" fullHeight>
      <div className="px-5 pb-4">
        {/* Task context */}
        <div className="bg-[#242428] rounded-2xl p-3 mb-5 flex items-center gap-2">
          <span className="text-[#a855f7] text-lg">✦</span>
          <span className="text-[#f4f4f5] text-sm font-medium">{task.title}</span>
        </div>

        {/* Tool selector */}
        {!activeTool && (
          <div className="space-y-3">
            {TOOLS.map(tool => (
              <button
                key={tool.id}
                onClick={() => handleToolSelect(tool.id)}
                className="w-full bg-[#242428] rounded-2xl p-4 text-left active:bg-[#2e2e34] transition-colors"
              >
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{tool.icon}</span>
                  <div>
                    <div className="text-[#f4f4f5] font-medium text-sm">{tool.title}</div>
                    <div className="text-[#71717a] text-xs mt-0.5">{tool.desc}</div>
                  </div>
                  <svg className="ml-auto text-[#3f3f46]" width="16" height="16" viewBox="0 0 16 16" fill="none">
                    <path d="M6 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                  </svg>
                </div>
              </button>
            ))}
          </div>
        )}

        {/* Loading state */}
        {activeTool && loading && (
          <div className="flex flex-col items-center justify-center py-12 gap-4">
            <LoadingSpinner size={32} />
            <p className="text-[#71717a] text-sm">Claude is thinking…</p>
          </div>
        )}

        {/* Results */}
        {result && !loading && (
          <div className="animate-fade-up">
            <button
              onClick={() => { setActiveTool(null); setResult(null) }}
              className="flex items-center gap-1.5 text-[#71717a] text-sm mb-4 active:text-[#f4f4f5]"
            >
              ← Back
            </button>

            {result.error && (
              <div className="bg-[#ef4444]/10 text-[#ef4444] rounded-2xl p-4 text-sm">
                {result.error}
              </div>
            )}

            {result.tool === 'break-down' && result.subtasks && (
              <BreakDownResult subtasks={result.subtasks} onSave={saveSubtasks} />
            )}

            {result.tool === 'quick-win' && result.win && (
              <QuickWinResult win={result.win} gapMinutes={result.gapMinutes} onSchedule={scheduleQuickWin} />
            )}

            {result.tool === 'time-audit' && result.estimate && (
              <TimeAuditResult estimate={result.estimate} onAccept={acceptTimeEstimate} />
            )}
          </div>
        )}
      </div>
    </BottomSheet>
  )
}

function BreakDownResult({ subtasks, onSave }) {
  const [items, setItems] = useState(subtasks)

  function toggle(id) {
    setItems(items.map(s => s.id === id ? { ...s, completed: !s.completed } : s))
  }

  return (
    <div>
      <h3 className="text-[#a855f7] font-semibold mb-3">🧩 Your first steps</h3>
      <div className="space-y-2 mb-5">
        {items.map((sub, i) => (
          <div key={sub.id} className="bg-[#242428] rounded-xl p-3 flex items-start gap-3">
            <span className="text-[#71717a] text-xs mt-0.5 w-4">{i + 1}.</span>
            <span className="text-[#f4f4f5] text-sm flex-1">{sub.title}</span>
          </div>
        ))}
      </div>
      <Button fullWidth onClick={() => onSave(items)} size="lg">
        Save as Subtasks
      </Button>
    </div>
  )
}

function QuickWinResult({ win, gapMinutes, onSchedule }) {
  return (
    <div>
      <h3 className="text-[#eab308] font-semibold mb-3">⚡ Your quick win</h3>
      <div className="bg-[#eab308]/10 rounded-2xl p-4 mb-4">
        <p className="text-[#f4f4f5] font-medium mb-1">"{win.taskTitle}"</p>
        <p className="text-[#a1a1aa] text-sm">{win.why}</p>
        <p className="text-[#71717a] text-xs mt-2">Fits in your {gapMinutes}-min gap</p>
      </div>
      <Button fullWidth onClick={() => onSchedule(win.taskTitle)} size="lg">
        Schedule It
      </Button>
    </div>
  )
}

function TimeAuditResult({ estimate, onAccept }) {
  return (
    <div>
      <h3 className="text-[#3b82f6] font-semibold mb-3">⏱ Time reality check</h3>
      <div className="space-y-3 mb-5">
        <div className="bg-[#242428] rounded-2xl p-4">
          <div className="text-xs text-[#71717a] mb-1">You'd probably guess</div>
          <div className="text-[#f4f4f5] text-2xl font-bold">{estimate.theyThink ?? '?'} min</div>
        </div>
        <div className="bg-[#3b82f6]/10 rounded-2xl p-4 border border-[#3b82f6]/20">
          <div className="text-xs text-[#3b82f6] mb-1">Claude's realistic estimate</div>
          <div className="text-[#f4f4f5] text-2xl font-bold">{estimate.suggested ?? '?'} min</div>
        </div>
        {estimate.theCatch && (
          <div className="bg-[#242428] rounded-2xl p-4">
            <div className="text-xs text-[#71717a] mb-1">The catch</div>
            <div className="text-[#a1a1aa] text-sm">{estimate.theCatch}</div>
          </div>
        )}
      </div>
      {estimate.suggested && (
        <Button fullWidth onClick={() => onAccept(estimate.suggested)} size="lg">
          Use {estimate.suggested} min estimate
        </Button>
      )}
    </div>
  )
}
