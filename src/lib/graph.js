import { msalInstance, loginRequest } from './msalConfig'

const GRAPH_BASE = 'https://graph.microsoft.com/v1.0'

async function getAccessToken() {
  const accounts = msalInstance.getAllAccounts()
  if (!accounts.length) throw new Error('Not authenticated')

  const request = { ...loginRequest, account: accounts[0] }

  try {
    const response = await msalInstance.acquireTokenSilent(request)
    return response.accessToken
  } catch {
    const response = await msalInstance.acquireTokenPopup(request)
    return response.accessToken
  }
}

async function graphFetch(path, options = {}) {
  const token = await getAccessToken()
  const res = await fetch(`${GRAPH_BASE}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...options.headers,
    },
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.error?.message || `Graph API error ${res.status}`)
  }
  if (res.status === 204) return null
  return res.json()
}

// ─── Calendar reads ────────────────────────────────────────────────────────

export async function getCalendarEvents(date) {
  const startOfDay = new Date(date)
  startOfDay.setHours(0, 0, 0, 0)
  const endOfDay = new Date(date)
  endOfDay.setHours(23, 59, 59, 999)

  const params = new URLSearchParams({
    startDateTime: startOfDay.toISOString(),
    endDateTime: endOfDay.toISOString(),
    $select: 'id,subject,start,end,isAllDay,showAs,categories',
    $orderby: 'start/dateTime',
    $top: '50',
  })

  const data = await graphFetch(`/me/calendarView?${params}`)
  return data.value || []
}

// ─── Calendar writes ───────────────────────────────────────────────────────

export async function createCalendarEvent({ title, notes, startTime, durationMinutes, date }) {
  const start = new Date(`${date}T${startTime}`)
  const end = new Date(start.getTime() + durationMinutes * 60 * 1000)

  const event = {
    subject: `🟦 ${title}`,
    body: {
      contentType: 'text',
      content: notes ? `${notes}\n\nCreated by DayBlocks` : 'Created by DayBlocks',
    },
    start: {
      dateTime: start.toISOString(),
      timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    },
    end: {
      dateTime: end.toISOString(),
      timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    },
    showAs: 'tentative',
  }

  return graphFetch('/me/events', {
    method: 'POST',
    body: JSON.stringify(event),
  })
}

export async function updateCalendarEvent(eventId, updates) {
  return graphFetch(`/me/events/${eventId}`, {
    method: 'PATCH',
    body: JSON.stringify(updates),
  })
}

export async function markCalendarEventComplete(eventId, title) {
  return graphFetch(`/me/events/${eventId}`, {
    method: 'PATCH',
    body: JSON.stringify({ subject: `✅ ${title}` }),
  })
}

export async function deleteCalendarEvent(eventId) {
  return graphFetch(`/me/events/${eventId}`, { method: 'DELETE' })
}

// ─── User profile ─────────────────────────────────────────────────────────

export async function getMe() {
  return graphFetch('/me?$select=displayName,mail,userPrincipalName')
}
