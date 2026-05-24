import { useState } from 'react'
import { useApp } from '../store/AppContext'
import { useMsal } from '@azure/msal-react'
import { supabase } from '../lib/supabase'
import Button from '../components/shared/Button'

export default function SettingsView() {
  const { state, dispatch } = useApp()
  const { instance, accounts } = useMsal()
  const [clearConfirm, setClearConfirm] = useState(false)
  const [clearing, setClearing] = useState(false)
  const [saved, setSaved] = useState(false)

  const s = state.settings

  function update(key, value) {
    dispatch({ type: 'UPDATE_SETTINGS', payload: { [key]: value } })
  }

  async function clearCompleted() {
    setClearing(true)
    await supabase.from('tasks').delete().eq('status', 'completed')
    setClearConfirm(false)
    setClearing(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const msAccount = accounts[0]

  return (
    <div className="flex flex-col h-full">
      <div className="px-5 pt-4 pb-3 flex-shrink-0">
        <h1 className="text-2xl font-bold text-[#f4f4f5]">Settings</h1>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto px-5 pb-28 space-y-6">
        {/* Account */}
        <Section title="Account">
          <div className="bg-[#1a1a1e] rounded-2xl p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[#f4f4f5] text-sm font-medium">{msAccount?.name || 'Not signed in'}</p>
                <p className="text-[#71717a] text-xs">{msAccount?.username || ''}</p>
              </div>
              <button
                onClick={() => instance.logoutPopup()}
                className="text-[#ef4444] text-sm active:opacity-70"
              >
                Sign out
              </button>
            </div>
          </div>
        </Section>

        {/* Calendar */}
        <Section title="Calendar">
          <div className="bg-[#1a1a1e] rounded-2xl p-4">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-[#22c55e]" />
              <span className="text-[#f4f4f5] text-sm">Outlook connected</span>
            </div>
            <p className="text-[#71717a] text-xs mt-1 ml-4">{msAccount?.username}</p>
          </div>
        </Section>

        {/* Work hours */}
        <Section title="Work Hours">
          <div className="bg-[#1a1a1e] rounded-2xl p-4 space-y-4">
            <Row label="Day starts">
              <input
                type="time"
                value={s.workDayStart}
                onChange={e => update('workDayStart', e.target.value)}
                className="bg-[#242428] rounded-xl px-3 py-2 text-[#f4f4f5] outline-none text-sm"
              />
            </Row>
            <Row label="Day ends">
              <input
                type="time"
                value={s.workDayEnd}
                onChange={e => update('workDayEnd', e.target.value)}
                className="bg-[#242428] rounded-xl px-3 py-2 text-[#f4f4f5] outline-none text-sm"
              />
            </Row>
          </div>
        </Section>

        {/* Defaults */}
        <Section title="Defaults">
          <div className="bg-[#1a1a1e] rounded-2xl p-4 space-y-4">
            <Row label="Default task duration">
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  value={s.defaultTaskDuration}
                  onChange={e => update('defaultTaskDuration', parseInt(e.target.value) || 30)}
                  className="w-20 bg-[#242428] rounded-xl px-3 py-2 text-[#f4f4f5] outline-none text-sm text-center"
                />
                <span className="text-[#71717a] text-sm">min</span>
              </div>
            </Row>

            <Row label="Focus check-in">
              <select
                value={s.focusCheckInInterval}
                onChange={e => update('focusCheckInInterval', parseInt(e.target.value))}
                className="bg-[#242428] rounded-xl px-3 py-2 text-[#f4f4f5] outline-none text-sm"
              >
                <option value={0}>Off</option>
                <option value={10}>Every 10 min</option>
                <option value={15}>Every 15 min</option>
                <option value={20}>Every 20 min</option>
              </select>
            </Row>

            <Row label="Morning reminder">
              <input
                type="time"
                value={s.planningReminderTime}
                onChange={e => update('planningReminderTime', e.target.value)}
                className="bg-[#242428] rounded-xl px-3 py-2 text-[#f4f4f5] outline-none text-sm"
              />
            </Row>
          </div>
        </Section>

        {/* Danger zone */}
        <Section title="Data">
          {!clearConfirm ? (
            <button
              onClick={() => setClearConfirm(true)}
              className="w-full h-12 bg-[#ef4444]/10 text-[#ef4444] rounded-2xl text-sm font-medium active:bg-[#ef4444]/20"
            >
              Clear all completed tasks
            </button>
          ) : (
            <div className="bg-[#ef4444]/10 border border-[#ef4444]/20 rounded-2xl p-4 space-y-3">
              <p className="text-[#f4f4f5] text-sm">
                This will permanently delete all completed tasks. Are you sure?
              </p>
              <div className="flex gap-2">
                <Button variant="danger" fullWidth onClick={clearCompleted} disabled={clearing}>
                  {clearing ? 'Clearing…' : 'Yes, clear them'}
                </Button>
                <Button variant="secondary" fullWidth onClick={() => setClearConfirm(false)}>
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </Section>

        {saved && (
          <p className="text-center text-[#22c55e] text-sm animate-fade-up">Done ✓</p>
        )}
      </div>
    </div>
  )
}

function Section({ title, children }) {
  return (
    <div>
      <h2 className="text-xs text-[#71717a] font-semibold uppercase tracking-wider mb-3">{title}</h2>
      {children}
    </div>
  )
}

function Row({ label, children }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-[#a1a1aa] text-sm">{label}</span>
      {children}
    </div>
  )
}
