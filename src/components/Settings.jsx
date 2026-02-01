import { useState, useEffect } from 'react'
import { useAuth } from '../lib/auth'
import { getScoutNotificationPrefs, updateScoutNotificationPrefs } from '../lib/supabase'
import {
  Bell,
  UserPlus,
  RefreshCw,
  Trophy,
  DollarSign,
  FolderPlus,
  Smartphone,
  Check,
  Loader2
} from 'lucide-react'

// Notification type configuration
const notificationTypes = [
  {
    key: 'new_lead',
    label: 'New lead signs up',
    description: 'Get notified when someone uses your referral link',
    icon: UserPlus,
  },
  {
    key: 'lead_status_change',
    label: 'Lead status changes',
    description: 'Track progress as leads move through the pipeline',
    icon: RefreshCw,
  },
  {
    key: 'athlete_placed',
    label: 'Athlete placed',
    description: 'Celebrate when your referrals get placed',
    icon: Trophy,
  },
  {
    key: 'commission_paid',
    label: 'Commission paid',
    description: 'Know when your earnings are processed',
    icon: DollarSign,
  },
  {
    key: 'new_resources',
    label: 'New resources',
    description: 'Stay updated on new marketing materials',
    icon: FolderPlus,
  },
]

function Toggle({ enabled, onChange, disabled }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={enabled}
      disabled={disabled}
      onClick={() => onChange(!enabled)}
      className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-[var(--ausa-red)] focus:ring-offset-2 ${
        enabled ? 'bg-[var(--ausa-red)]' : 'bg-gray-200'
      } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
    >
      <span
        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
          enabled ? 'translate-x-5' : 'translate-x-0'
        }`}
      />
    </button>
  )
}

export default function Settings() {
  const { user } = useAuth()
  const [prefs, setPrefs] = useState({
    new_lead: true,
    lead_status_change: true,
    athlete_placed: true,
    commission_paid: true,
    new_resources: false,
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState(null)
  const [hasChanges, setHasChanges] = useState(false)
  const [originalPrefs, setOriginalPrefs] = useState(null)

  useEffect(() => {
    if (user?.id) {
      loadPreferences()
    }
  }, [user?.id])

  async function loadPreferences() {
    try {
      setLoading(true)
      setError(null)
      const data = await getScoutNotificationPrefs(user.id)
      if (data) {
        const loadedPrefs = {
          new_lead: data.new_lead ?? true,
          lead_status_change: data.lead_status_change ?? true,
          athlete_placed: data.athlete_placed ?? true,
          commission_paid: data.commission_paid ?? true,
          new_resources: data.new_resources ?? false,
        }
        setPrefs(loadedPrefs)
        setOriginalPrefs(loadedPrefs)
      } else {
        // Use defaults if no prefs exist
        setOriginalPrefs(prefs)
      }
    } catch (err) {
      console.error('Failed to load preferences:', err)
      setError('Failed to load preferences')
    } finally {
      setLoading(false)
    }
  }

  function handleToggle(key, value) {
    const newPrefs = { ...prefs, [key]: value }
    setPrefs(newPrefs)
    setSaved(false)

    // Check if there are changes from original
    const changed = Object.keys(newPrefs).some(
      k => newPrefs[k] !== originalPrefs?.[k]
    )
    setHasChanges(changed)
  }

  async function handleSave() {
    try {
      setSaving(true)
      setError(null)
      await updateScoutNotificationPrefs(user.id, prefs)
      setOriginalPrefs(prefs)
      setHasChanges(false)
      setSaved(true)

      // Clear saved message after 3 seconds
      setTimeout(() => setSaved(false), 3000)
    } catch (err) {
      console.error('Failed to save preferences:', err)
      setError('Failed to save preferences')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--ausa-red)]"></div>
      </div>
    )
  }

  return (
    <div className="px-4 py-6 space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="text-sm text-gray-500">Manage your notification preferences</p>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 text-red-600 p-4 rounded-xl text-center">
          {error}
        </div>
      )}

      {/* Email Notifications */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-100 flex items-center gap-2">
          <Bell className="w-5 h-5 text-gray-600" />
          <h2 className="font-semibold text-gray-900">Email Notifications</h2>
        </div>

        <div className="divide-y divide-gray-100">
          {notificationTypes.map((type) => {
            const Icon = type.icon
            return (
              <div key={type.key} className="px-4 py-4 flex items-start gap-3">
                <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0">
                  <Icon className="w-5 h-5 text-gray-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-900">{type.label}</p>
                  <p className="text-sm text-gray-500">{type.description}</p>
                </div>
                <Toggle
                  enabled={prefs[type.key]}
                  onChange={(value) => handleToggle(type.key, value)}
                />
              </div>
            )
          })}
        </div>
      </div>

      {/* Push Notifications (Coming Soon) */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden opacity-60">
        <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Smartphone className="w-5 h-5 text-gray-600" />
            <h2 className="font-semibold text-gray-900">Push Notifications</h2>
          </div>
          <span className="px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
            Coming soon
          </span>
        </div>
        <div className="px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-gray-500">Enable push notifications</p>
              <p className="text-sm text-gray-400">Get real-time updates on your device</p>
            </div>
            <Toggle enabled={false} onChange={() => {}} disabled />
          </div>
        </div>
      </div>

      {/* Save Button */}
      <div className="sticky bottom-20 pt-4">
        <button
          onClick={handleSave}
          disabled={saving || !hasChanges}
          className={`w-full py-3 px-4 rounded-xl font-semibold text-white transition-all flex items-center justify-center gap-2 ${
            hasChanges
              ? 'bg-[var(--ausa-red)] hover:bg-[#c12e39] shadow-lg'
              : 'bg-gray-300 cursor-not-allowed'
          } ${saving ? 'opacity-80' : ''}`}
        >
          {saving ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Saving...
            </>
          ) : saved ? (
            <>
              <Check className="w-5 h-5" />
              Saved!
            </>
          ) : (
            'Save Changes'
          )}
        </button>
      </div>
    </div>
  )
}
