import { useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useApp } from '../store/AppContext'
import { format } from 'date-fns'
import {
  createCalendarEvent,
  updateCalendarEvent,
  markCalendarEventComplete,
  deleteCalendarEvent,
} from '../lib/graph'

export function useTasks() {
  const { state, dispatch } = useApp()

  const loadTasks = useCallback(async () => {
    dispatch({ type: 'SET_TASKS_LOADING', payload: true })
    const { data, error } = await supabase
      .from('tasks')
      .select('*')
      .neq('status', 'completed')
      .order('created_at', { ascending: false })
    if (error) { console.error(error); return }
    dispatch({ type: 'SET_TASKS', payload: data })
  }, [dispatch])

  const loadAllTasks = useCallback(async () => {
    const { data, error } = await supabase
      .from('tasks')
      .select('*')
      .order('created_at', { ascending: false })
    if (error) { console.error(error); return [] }
    return data
  }, [])

  const addTask = useCallback(async (fields) => {
    const { data, error } = await supabase
      .from('tasks')
      .insert([{
        title: fields.title,
        notes: fields.notes || null,
        status: 'backlog',
        priority: fields.priority || 'medium',
        estimated_minutes: fields.estimated_minutes || null,
        scheduled_date: fields.scheduled_date || null,
        subtasks: null,
      }])
      .select()
      .single()

    if (error) throw error
    dispatch({ type: 'ADD_TASK', payload: data })
    return data
  }, [dispatch])

  const scheduleTask = useCallback(async (task, { date, startTime, durationMinutes }) => {
    let calendarEventId = task.calendar_event_id

    try {
      if (calendarEventId) {
        await updateCalendarEvent(calendarEventId, {
          subject: `🟦 ${task.title}`,
          start: {
            dateTime: new Date(`${date}T${startTime}`).toISOString(),
            timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          },
          end: {
            dateTime: new Date(
              new Date(`${date}T${startTime}`).getTime() + durationMinutes * 60000
            ).toISOString(),
            timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          },
        })
      } else {
        const event = await createCalendarEvent({
          title: task.title,
          notes: task.notes,
          startTime,
          durationMinutes,
          date,
        })
        calendarEventId = event.id
      }
    } catch (err) {
      console.warn('Calendar sync failed (continuing without it):', err.message)
    }

    const updates = {
      status: 'scheduled',
      scheduled_date: date,
      scheduled_start_time: startTime,
      estimated_minutes: durationMinutes,
      calendar_event_id: calendarEventId,
    }

    const { data, error } = await supabase
      .from('tasks')
      .update(updates)
      .eq('id', task.id)
      .select()
      .single()

    if (error) throw error
    dispatch({ type: 'UPDATE_TASK', payload: data })
    return data
  }, [dispatch])

  const completeTask = useCallback(async (task, actualMinutes) => {
    const now = new Date()

    try {
      if (task.calendar_event_id) {
        await markCalendarEventComplete(task.calendar_event_id, task.title)
      }
    } catch (err) {
      console.warn('Calendar update failed:', err.message)
    }

    const { data, error } = await supabase
      .from('tasks')
      .update({
        status: 'completed',
        completed_at: now.toISOString(),
        actual_minutes: actualMinutes || null,
      })
      .eq('id', task.id)
      .select()
      .single()

    if (error) throw error

    if (actualMinutes) {
      await supabase.from('time_entries').insert([{
        task_id: task.id,
        started_at: new Date(now.getTime() - actualMinutes * 60000).toISOString(),
        ended_at: now.toISOString(),
        duration_minutes: actualMinutes,
      }])
    }

    dispatch({ type: 'UPDATE_TASK', payload: data })
    return data
  }, [dispatch])

  const unscheduleTask = useCallback(async (task) => {
    try {
      if (task.calendar_event_id) {
        await deleteCalendarEvent(task.calendar_event_id)
      }
    } catch (err) {
      console.warn('Calendar delete failed:', err.message)
    }

    const { data, error } = await supabase
      .from('tasks')
      .update({
        status: 'backlog',
        scheduled_date: null,
        scheduled_start_time: null,
        calendar_event_id: null,
      })
      .eq('id', task.id)
      .select()
      .single()

    if (error) throw error
    dispatch({ type: 'UPDATE_TASK', payload: data })
    return data
  }, [dispatch])

  const updateTask = useCallback(async (id, fields) => {
    const { data, error } = await supabase
      .from('tasks')
      .update(fields)
      .eq('id', id)
      .select()
      .single()
    if (error) throw error
    dispatch({ type: 'UPDATE_TASK', payload: data })
    return data
  }, [dispatch])

  const deleteTask = useCallback(async (task) => {
    try {
      if (task.calendar_event_id) await deleteCalendarEvent(task.calendar_event_id)
    } catch {}
    const { error } = await supabase.from('tasks').delete().eq('id', task.id)
    if (error) throw error
    dispatch({ type: 'REMOVE_TASK', payload: task.id })
  }, [dispatch])

  const runCarryForward = useCallback(async () => {
    const yesterday = new Date()
    yesterday.setDate(yesterday.getDate() - 1)
    const yesterdayStr = format(yesterday, 'yyyy-MM-dd')

    const { data: staleTasks, error } = await supabase
      .from('tasks')
      .select('*')
      .eq('status', 'scheduled')
      .eq('scheduled_date', yesterdayStr)

    if (error || !staleTasks?.length) return

    for (const task of staleTasks) {
      try {
        if (task.calendar_event_id) await deleteCalendarEvent(task.calendar_event_id)
      } catch {}

      await supabase
        .from('tasks')
        .update({
          status: 'backlog',
          scheduled_date: null,
          scheduled_start_time: null,
          calendar_event_id: null,
          rollover_count: (task.rollover_count || 0) + 1,
        })
        .eq('id', task.id)
    }

    dispatch({ type: 'SET_ROLLOVER_TASKS', payload: staleTasks })
    await loadTasks()
  }, [dispatch, loadTasks])

  return {
    tasks: state.tasks,
    tasksLoading: state.tasksLoading,
    loadTasks,
    loadAllTasks,
    addTask,
    scheduleTask,
    completeTask,
    unscheduleTask,
    updateTask,
    deleteTask,
    runCarryForward,
  }
}
