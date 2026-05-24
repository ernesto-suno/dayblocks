import { supabase } from './supabase'

// All Claude calls go through a Supabase Edge Function to keep the API key server-side.

async function callClaude(prompt, systemPrompt, maxTokens = 500) {
  const { data, error } = await supabase.functions.invoke('claude-proxy', {
    body: { prompt, systemPrompt, maxTokens },
  })
  if (error) throw new Error(error.message)
  return data.content
}

// ─── AI Tools ─────────────────────────────────────────────────────────────

export async function breakDownTask(title, notes) {
  const system = `You are a focus coach for someone with an ADHD-style brain.
Break this task into ridiculously small steps that each take under 1 minute.
Be extremely concrete and physical — tell them exactly what to do with their hands first.
Return as a numbered list, max 8 steps. No intro, no outro — just the steps.`

  const prompt = `Task: ${title}${notes ? `\nNotes: ${notes}` : ''}`
  const content = await callClaude(prompt, system, 400)

  // Parse numbered list into subtask objects
  const lines = content
    .split('\n')
    .filter(l => /^\d+\./.test(l.trim()))
    .map((l, i) => ({
      id: `sub-${Date.now()}-${i}`,
      title: l.replace(/^\d+\.\s*/, '').trim(),
      completed: false,
    }))

  return lines
}

export async function findQuickWin(gapMinutes, backlogTasks) {
  const system = `The user has a ${gapMinutes} minute gap in their schedule and an ADHD-style brain that needs a win.
Pick the single best task from this backlog that fits the time and will give them a satisfying sense of completion.
Be decisive — give one recommendation with one sentence of why.
Format: Task: [title]\nWhy: [one sentence]`

  const taskList = backlogTasks
    .slice(0, 15)
    .map(t => `- "${t.title}" (${t.estimated_minutes || '?'} min, priority: ${t.priority})`)
    .join('\n')

  const prompt = `Available gap: ${gapMinutes} minutes\n\nBacklog:\n${taskList}`
  const content = await callClaude(prompt, system, 200)

  const titleMatch = content.match(/Task:\s*(.+)/i)
  const whyMatch = content.match(/Why:\s*(.+)/i)

  return {
    raw: content,
    taskTitle: titleMatch?.[1]?.replace(/["""]/g, '').trim() || null,
    why: whyMatch?.[1]?.trim() || null,
  }
}

export async function estimateTime(title, notes, userEstimate, estimationAccuracy) {
  const system = `You are helping someone with an ADHD-style brain estimate how long a task will take.
They tend to underestimate. Based on the task description and their history, give a realistic estimate.
Format your response exactly as:
Suggested: [N] minutes
They'll think: [N] minutes
The catch: [one specific reason it usually takes longer]`

  const accuracyNote = estimationAccuracy
    ? `Their estimation accuracy: ${estimationAccuracy}% (they tend to ${estimationAccuracy < 80 ? 'underestimate' : 'estimate well'}).`
    : 'No estimation history yet.'

  const prompt = `Task: ${title}
${notes ? `Notes: ${notes}` : ''}
Their estimate: ${userEstimate ? `${userEstimate} minutes` : 'not given'}
${accuracyNote}`

  const content = await callClaude(prompt, system, 200)

  const suggestedMatch = content.match(/Suggested:\s*(\d+)/i)
  const thinkMatch = content.match(/They'll think:\s*(\d+)/i)
  const catchMatch = content.match(/The catch:\s*(.+)/i)

  return {
    raw: content,
    suggested: suggestedMatch ? parseInt(suggestedMatch[1]) : null,
    theyThink: thinkMatch ? parseInt(thinkMatch[1]) : null,
    theCatch: catchMatch?.[1]?.trim() || null,
  }
}

// ─── Focus Mode check-ins ─────────────────────────────────────────────────

export async function focusCheckIn(taskTitle, minutesElapsed, userNote) {
  const system = `You are a warm, brief focus coach. The user is in a focus session.
Respond in 1-2 sentences max. Be encouraging and direct. No fluff.`

  const prompt = `Task: "${taskTitle}"
Time elapsed: ${minutesElapsed} minutes
User says: ${userNote || '(no response — just checking in)'}`

  return callClaude(prompt, system, 150)
}
