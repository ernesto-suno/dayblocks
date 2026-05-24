import { useCallback } from 'react'
import { useApp } from '../store/AppContext'
import { getCalendarEvents } from '../lib/graph'
import { format } from 'date-fns'

export function useCalendar() {
  const { state, dispatch } = useApp()

  const loadCalendarEvents = useCallback(async (date = new Date()) => {
    dispatch({ type: 'SET_CALENDAR_LOADING', payload: true })
    try {
      const events = await getCalendarEvents(date)
      dispatch({ type: 'SET_CALENDAR_EVENTS', payload: events })
      return events
    } catch (err) {
      console.warn('Calendar load failed:', err.message)
      dispatch({ type: 'SET_CALENDAR_EVENTS', payload: [] })
      return []
    }
  }, [dispatch])

  // Calculate free time slots between workDayStart and workDayEnd
  const getFreeSlots = useCallback((date = new Date(), settings = {}) => {
    const { workDayStart = '07:00', workDayEnd = '22:00' } = settings
    const dateStr = format(date, 'yyyy-MM-dd')

    const [endH, endM] = workDayEnd.split(':').map(Number)

    const configuredStart = new Date(`${dateStr}T${workDayStart}:00`)
    const dayEnd = new Date(`${dateStr}T${workDayEnd}:00`)

    // For today, never count time that has already passed
    const now = new Date()
    const isToday = dateStr === format(now, 'yyyy-MM-dd')
    const dayStart = isToday && now > configuredStart ? now : configuredStart

    const totalMinutes = Math.max(0, Math.floor((dayEnd - dayStart) / 60000))

    // Only look at non-DayBlocks events
    const realEvents = state.calendarEvents.filter(e => {
      const title = e.subject || ''
      return !title.startsWith('🟦') && !title.startsWith('✅') && e.showAs !== 'free'
    })

    const busyMinutes = realEvents.reduce((acc, event) => {
      if (event.isAllDay) return acc
      const start = new Date(event.start.dateTime)
      const end = new Date(event.end.dateTime)
      const overlap = Math.max(0,
        Math.min(end, dayEnd) - Math.max(start, dayStart)
      )
      return acc + Math.floor(overlap / 60000)
    }, 0)

    const freeMinutes = Math.max(0, totalMinutes - busyMinutes)

    return {
      totalMinutes,
      busyMinutes,
      freeMinutes,
      freeHours: Math.round((freeMinutes / 60) * 10) / 10,
    }
  }, [state.calendarEvents])

  // Find gaps of N+ minutes in today's schedule
  const findGaps = useCallback((minGapMinutes = 15, date = new Date(), settings = {}) => {
    const { workDayStart = '07:00', workDayEnd = '22:00' } = settings
    const dateStr = format(date, 'yyyy-MM-dd')

    const dayStart = new Date(`${dateStr}T${workDayStart}:00`)
    const dayEnd = new Date(`${dateStr}T${workDayEnd}:00`)

    const busy = state.calendarEvents
      .filter(e => !e.isAllDay)
      .map(e => ({
        start: new Date(e.start.dateTime),
        end: new Date(e.end.dateTime),
      }))
      .filter(e => e.end > dayStart && e.start < dayEnd)
      .sort((a, b) => a.start - b.start)

    const gaps = []
    let cursor = dayStart

    for (const event of busy) {
      if (event.start > cursor) {
        const gapMinutes = Math.floor((event.start - cursor) / 60000)
        if (gapMinutes >= minGapMinutes) {
          gaps.push({
            start: new Date(cursor),
            end: new Date(event.start),
            minutes: gapMinutes,
          })
        }
      }
      if (event.end > cursor) cursor = event.end
    }

    // Final gap to end of day
    if (dayEnd > cursor) {
      const gapMinutes = Math.floor((dayEnd - cursor) / 60000)
      if (gapMinutes >= minGapMinutes) {
        gaps.push({ start: new Date(cursor), end: new Date(dayEnd), minutes: gapMinutes })
      }
    }

    return gaps
  }, [state.calendarEvents])

  return {
    calendarEvents: state.calendarEvents,
    calendarLoading: state.calendarLoading,
    loadCalendarEvents,
    getFreeSlots,
    findGaps,
  }
}
