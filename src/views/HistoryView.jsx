import { useState, useEffect } from 'react'
import { format, parseISO, startOfWeek, isThisWeek, isThisMonth } from 'date-fns'
import { supabase } from '../lib/supabase'
import LoadingSpinner from '../components/shared/LoadingSpinner'

export default function HistoryView() {
  const [completed, setCompleted] = useState([])
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState(null)

  useEffect(() => {
    loadHistory()
  }, [])

  async function loadHistory() {
    setLoading(true)
    const { data, error } = await supabase
      .from('tasks')
      .select('*')
      .eq('status', 'completed')
      .order('completed_at', { ascending: false })
      .limit(100)

    if (!error) {
      setCompleted(data)
      computeStats(data)
    }
    setLoading(false)
  }

  function computeStats(tasks) {
    const withTime = tasks.filter(t => t.estimated_minutes && t.actual_minutes)
    const accuracy = withTime.length
      ? withTime.reduce((sum, t) => {
          const ratio = Math.min(t.estimated_minutes, t.actual_minutes) / Math.max(t.estimated_minutes, t.actual_minutes)
          return sum + ratio
        }, 0) / withTime.length * 100
      : null

    const thisWeek = tasks.filter(t => t.completed_at && isThisWeek(parseISO(t.completed_at)))
    const thisMonth = tasks.filter(t => t.completed_at && isThisMonth(parseISO(t.completed_at)))

    const totalMinutes = tasks
      .filter(t => t.actual_minutes)
      .reduce((sum, t) => sum + t.actual_minutes, 0)

    setStats({
      accuracy: accuracy ? Math.round(accuracy) : null,
      thisWeek: thisWeek.length,
      thisMonth: thisMonth.length,
      totalMinutes,
      total: tasks.length,
    })
  }

  function getTimeColor(estimated, actual) {
    if (!estimated || !actual) return 'text-[#a1a1aa]'
    const ratio = actual / estimated
    if (ratio <= 1) return 'text-[#22c55e]'
    if (ratio <= 1.25) return 'text-[#eab308]'
    return 'text-[#ef4444]'
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <LoadingSpinner size={32} />
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      <div className="px-5 pt-4 pb-3 flex-shrink-0">
        <h1 className="text-2xl font-bold text-[#f4f4f5]">History</h1>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto px-5 pb-28 space-y-6">
        {/* Stats cards */}
        {stats && (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-[#1a1a1e] rounded-2xl p-4">
                <div className="text-xs text-[#71717a] mb-1">Estimation accuracy</div>
                <div className="text-2xl font-bold text-[#f4f4f5]">
                  {stats.accuracy !== null ? `${stats.accuracy}%` : '—'}
                </div>
              </div>
              <div className="bg-[#1a1a1e] rounded-2xl p-4">
                <div className="text-xs text-[#71717a] mb-1">Focused time</div>
                <div className="text-2xl font-bold text-[#f4f4f5]">
                  {Math.round(stats.totalMinutes / 60 * 10) / 10}h
                </div>
              </div>
            </div>

            {/* Weekly summary */}
            <div className="bg-[#1a1a1e] rounded-2xl p-4">
              <div className="text-sm font-medium text-[#f4f4f5] mb-2">This week</div>
              <div className="flex justify-between">
                <div className="text-center">
                  <div className="text-2xl font-bold text-[#22c55e]">{stats.thisWeek}</div>
                  <div className="text-xs text-[#71717a]">completed</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-[#f4f4f5]">{stats.thisMonth}</div>
                  <div className="text-xs text-[#71717a]">this month</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-[#f4f4f5]">{stats.total}</div>
                  <div className="text-xs text-[#71717a]">total</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Completion log */}
        <div>
          <h2 className="text-xs text-[#71717a] font-semibold uppercase tracking-wider mb-3">
            Completion Log
          </h2>

          {completed.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-4xl mb-3">📋</div>
              <p className="text-[#f4f4f5] font-medium">No completed tasks yet</p>
              <p className="text-[#71717a] text-sm mt-1">They'll show up here when you complete them.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {completed.map(task => {
                const completedDate = task.completed_at ? parseISO(task.completed_at) : null
                return (
                  <div key={task.id} className="bg-[#1a1a1e] rounded-2xl p-4">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="text-[#f4f4f5] text-sm font-medium leading-snug">{task.title}</p>
                        {completedDate && (
                          <p className="text-[#71717a] text-xs mt-0.5">
                            {format(completedDate, 'MMM d, h:mma')}
                          </p>
                        )}
                      </div>

                      {/* Time comparison */}
                      {task.estimated_minutes && (
                        <div className="text-right flex-shrink-0">
                          <div className={`text-sm font-medium ${getTimeColor(task.estimated_minutes, task.actual_minutes)}`}>
                            {task.actual_minutes ? `${task.actual_minutes} min` : '—'}
                          </div>
                          <div className="text-[10px] text-[#71717a]">
                            est {task.estimated_minutes} min
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
