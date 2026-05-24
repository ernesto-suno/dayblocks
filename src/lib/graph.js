import { msalInstance, loginRequest } from './msalConfig'

const GRAPH_BASE = 'https://graph.microsoft.com/v1.0'

// Get timezone from settings stored in localStorage, fallback to browser timezone
function getTimezone() {
  try {
    const raw = localStorage.getItem('dayblocks_settings')
    if (raw) {
      const s = JSON.parse(raw)
      if (s.timezone) return s.timezone
    }
  } catch {}
  return Intl.DateTimeFormat().resolvedOptions().timeZone || 'America/New_York'
}

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
  const tz = getTimezone()

  const res = await fetch(`${GRAPH_BASE}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      // This tells Microsoft Graph to return all datetimes in your local timezone
      'Prefer': `outlook.timezone="${tz}"`,
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

export async function getCalendarEvents(date, timezone) {
  const tz = timezone || getTimezone()

  // Build start/end in local time by formatting the date string directly
  // so we don't get UTC-shifted times
  const dateStr = date instanceof Date
    ? date.toLocaleDateString('en-CA') // gives YYYY-MM-DD in local time
    : date

  const startDateTime = `${dateStr}T00:00:00`
  const endDateTime = `${dateStr}T23:59:59`

  const params = new URLSearchParams({
    startDateTime,
    endDateTime,
    $select: 'id,subject,start,end,isAllDay,showAs,categories',
    $orderby: 'start/dateTime',
    $top: '50',
  })

  const data = await graphFetch(`/me/calendarView?${params}`)
  return data.value || []
}

// ─── Calendar writes ───────────────────────────────────────────────────────

export async function createCalendarEvent({ title, notes, startTime, durationMinutes, date }) {
  const tz = getTimezone()

  // Build datetime strings in local time — Graph will interpret them in the
  // timezone we specify, so no UTC conversion needed
  const startDateTime = `${date}T${startTime}:00`
  const [sh, sm] = startTime.split(':').map(Number)
  const totalMins = sh * 60 + sm + durationMinutes
  const eh = Math.floor(totalMins / 60) % 24
  const em = totalMins % 60
  const endDateTime = `${date}T${eh.toString().padStart(2, '0')}:${em.toString().padStart(2, '0')}:00`

  const event = {
    subject: `🟦 ${title}`,
    body: {
      contentType: 'text',
      content: notes ? `${notes}\n\nCreated by DayBlocks` : 'Created by DayBlocks',
    },
    start: { dateTime: startDateTime, timeZone: tz },
    end: { dateTime: endDateTime, timeZone: tz },
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
