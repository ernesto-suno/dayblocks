import { useState, useEffect, useRef } from 'react'
import { planningChat } from '../../lib/claude'
import { useTasks } from '../../hooks/useTasks'
import VisualScheduleSheet from '../shared/VisualScheduleSheet'

// Parse Claude's response for SUGGEST lines
function parseSuggestions(text) {
  const suggestions = []
  const regex = /SUGGEST:\s*[""]([^"""]+)["""]\s+at\s+([\d:]+(?:\s*[ap]m)?)\s+for\s+(\d+)\s*min/gi
  let match
  while ((match = regex.exec(text)) !== null) {
    suggestions.push({
      title: match[1].trim(),
      time: match[2].trim(),
      duration: parseInt(match[3]),
    })
  }
  return suggestions
}

// Render a message bubble, with suggestions highlighted
function MessageBubble({ msg, backlogTasks, onSchedule }) {
  const suggestions = msg.role === 'assistant' ? parseSuggestions(msg.content) : []

  // Split text around SUGGEST lines to render them as cards
  const parts = msg.content.split(/SUGGEST:.*?\d+\s*min/gi)

  return (
    <div className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} mb-3`}>
      {msg.role === 'assistant' && (
        <div className="w-7 h-7 rounded-full bg-[#a855f7]/20 flex items-center justify-center text-sm flex-shrink-0 mr-2 mt-1">
          ✦
        </div>
      )}
      <div className={`max-w-[85%] ${msg.role === 'user' ? 'items-end' : 'items-start'} flex flex-col gap-2`}>
        {/* Text content */}
        <div className={`rounded-2xl px-4 py-3 text-sm leading-relaxed ${
          msg.role === 'user'
            ? 'bg-[#3b82f6] text-white rounded-br-md'
            : 'bg-[#242428] text-[#f4f4f5] rounded-bl-md'
        }`}>
          {parts.map((part, i) => part.trim() && (
            <span key={i}>{part.trim()}{i < parts.length - 1 ? ' ' : ''}</span>
          ))}
        </div>

        {/* Suggestion cards */}
        {suggestions.map((s, i) => {
          const matchedTask = backlogTasks.find(t =>
            t.title.toLowerCase().includes(s.title.toLowerCase()) ||
            s.title.toLowerCase().includes(t.title.toLowerCase())
          )
          return (
            <div key={i} className="bg-[#1a1a1e] border border-[#3b82f6]/30 rounded-2xl p-3 w-full">
              <div className="flex items-start gap-2 mb-2">
                <span className="text-[#3b82f6] text-lg">📅</span>
                <div>
                  <p className="text-[#f4f4f5] text-sm font-semibold leading-snug">{s.title}</p>
                  <p className="text-[#71717a] text-xs mt-0.5">{s.time} · {s.duration} min</p>
                </div>
              </div>
              <button
                onClick={() => onSchedule(matchedTask || { title: s.title, estimated_minutes: s.duration }, s.time, s.duration)}
                className="w-full h-9 bg-[#3b82f6]/10 text-[#3b82f6] rounded-xl text-sm font-medium active:bg-[#3b82f6]/20"
              >
                + Add to Today
              </button>
            </div>
          )
        })}

        {msg.role === 'assistant' && msg.isLoading && (
          <div className="bg-[#242428] rounded-2xl rounded-bl-md px-4 py-3">
            <div className="flex gap-1">
              <div className="w-2 h-2 rounded-full bg-[#71717a] animate-bounce" style={{ animationDelay: '0ms' }} />
              <div className="w-2 h-2 rounded-full bg-[#71717a] animate-bounce" style={{ animationDelay: '150ms' }} />
              <div className="w-2 h-2 rounded-full bg-[#71717a] animate-bounce" style={{ animationDelay: '300ms' }} />
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default function AIPlanningChat({ onClose, freeMinutes, freeHours, calendarEvents, settings }) {
  const { tasks, scheduleTask } = useTasks()
  const [history, setHistory] = useState([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [scheduleTarget, setScheduleTarget] = useState(null)
  const [scheduleTime, setScheduleTime] = useState('')
  const [scheduleDuration, setScheduleDuration] = useState(30)
  const bottomRef = useRef(null)

  const backlogTasks = tasks.filter(t => t.status === 'backlog')

  const todayMeetings = (calendarEvents || []).filter(e => {
    const title = e.subject || ''
    return !title.startsWith('🟦') && !title.startsWith('✅') && !e.isAllDay
  }).map(e => ({
    subject: e.subject,
    duration: Math.round((new Date(e.end.dateTime) - new Date(e.start.dateTime)) / 60000),
  }))

  // Send opening message from AI on mount
  useEffect(() => {
    sendMessage('Good morning! What would you like to focus on today?', true)
  }, [])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [history])

  async function sendMessage(userMsg, isSystem = false) {
    const userEntry = { role: 'user', content: userMsg }
    const currentHistory = isSystem ? [] : [...history, userEntry]

    if (!isSystem) {
      setHistory(prev => [...prev, userEntry])
    }

    setLoading(true)

    const loadingEntry = { role: 'assistant', content: '', isLoading: true }
    setHistory(prev => [...prev, loadingEntry])

    try {
      const context = {
        freeMinutes: freeMinutes || 0,
        freeHours: freeHours || 0,
        backlogTasks: backlogTasks.slice(0, 20),
        todayMeetings,
        focusCategory: null,
      }

      const response = await planningChat(userMsg, context, currentHistory)

      setHistory(prev => {
        const withoutLoading = prev.filter(m => !m.isLoading)
        return [...withoutLoading, { role: 'assistant', content: response }]
      })
    } catch (err) {
      setHistory(prev => {
        const withoutLoading = prev.filter(m => !m.isLoading)
        return [...withoutLoading, { role: 'assistant', content: 'Something went wrong. Please try again.' }]
      })
    } finally {
      setLoading(false)
    }
  }

  function handleSend() {
    if (!input.trim() || loading) return
    const msg = input.trim()
    setInput('')
    sendMessage(msg)
  }

  function handleScheduleFromChat(task, suggestedTime, suggestedDuration) {
    // Pre-fill schedule sheet with suggested time
    setScheduleTime(suggestedTime)
    setScheduleDuration(suggestedDuration)
    setScheduleTarget(task)
  }

  // Build a dummy task object if no match found
  function buildScheduleTask(task) {
    if (task.id) return task
    return {
      ...task,
      id: null,
      scheduled_start_time: scheduleTime,
      estimated_minutes: scheduleDuration,
    }
  }

  return (
    <div className="fixed inset-0 bg-[#111113] z-50 flex flex-col">
      {/* Header */}
      <div className="px-5 pt-safe pt-4 pb-3 border-b border-[#1a1a1e] flex-shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-[#a855f7]/20 flex items-center justify-center text-base">✦</div>
            <div>
              <p className="text-[#f4f4f5] font-semibold text-sm">AI Planning Coach</p>
              <p className="text-[#71717a] text-xs">{freeHours}h free · {todayMeetings.length} meetings</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-[#242428] flex items-center justify-center text-[#71717a] active:bg-[#2e2e34]"
          >
            ✕
          </button>
        </div>
      </div>

      {/* Context chips */}
      <div className="px-5 py-2 flex gap-2 overflow-x-auto no-scrollbar flex-shrink-0 border-b border-[#1a1a1e]">
        <div className="px-3 h-7 bg-[#22c55e]/10 text-[#22c55e] rounded-full text-xs flex items-center gap-1 flex-shrink-0">
          ⏱ {freeHours}h free
        </div>
        {todayMeetings.slice(0, 3).map((m, i) => (
          <div key={i} className="px-3 h-7 bg-[#1a1a1e] text-[#71717a] rounded-full text-xs flex items-center gap-1 flex-shrink-0 whitespace-nowrap">
            📅 {m.subject?.slice(0, 20)}{m.subject?.length > 20 ? '…' : ''}
          </div>
        ))}
        <div className="px-3 h-7 bg-[#3b82f6]/10 text-[#3b82f6] rounded-full text-xs flex items-center gap-1 flex-shrink-0">
          📋 {backlogTasks.length} backlog
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 min-h-0 overflow-y-auto px-4 py-4">
        {history.map((msg, i) => (
          <MessageBubble
            key={i}
            msg={msg}
            backlogTasks={backlogTasks}
            onSchedule={handleScheduleFromChat}
          />
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Quick replies */}
      {!loading && history.length > 0 && (
        <div className="px-4 pb-2 flex gap-2 overflow-x-auto no-scrollbar flex-shrink-0">
          {[
            "Let's focus on Sales today",
            "I want to do hiring tasks",
            "Schedule my top 3 priorities",
            "What fits in a 30 min gap?",
          ].map(q => (
            <button
              key={q}
              onClick={() => { setInput(q); }}
              className="px-3 h-8 bg-[#1a1a1e] text-[#71717a] rounded-full text-xs whitespace-nowrap flex-shrink-0 active:bg-[#242428]"
            >
              {q}
            </button>
          ))}
        </div>
      )}

      {/* Input */}
      <div className="px-4 pb-safe pb-4 pt-2 border-t border-[#1a1a1e] flex-shrink-0">
        <div className="flex gap-2">
          <input
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleSend()}
            placeholder="What do you want to focus on today?"
            disabled={loading}
            className="flex-1 bg-[#242428] rounded-2xl px-4 py-3 text-[#f4f4f5] placeholder-[#71717a] outline-none text-sm disabled:opacity-50"
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || loading}
            className="w-11 h-11 bg-[#3b82f6] rounded-2xl flex items-center justify-center active:bg-[#2563eb] disabled:opacity-40 flex-shrink-0"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <path d="M22 2L11 13M22 2L15 22l-4-9-9-4 20-7z" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </div>
      </div>

      {/* Schedule sheet from chat suggestion */}
      <VisualScheduleSheet
        isOpen={!!scheduleTarget}
        onClose={() => setScheduleTarget(null)}
        task={scheduleTarget ? { ...scheduleTarget, scheduled_start_time: scheduleTime } : null}
      />
    </div>
  )
}
