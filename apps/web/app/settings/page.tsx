'use client'

import { useEffect, useState } from 'react'
import { createSupabaseBrowserClient } from '@/lib/supabase-browser'
import { useRouter } from 'next/navigation'

interface UserSettings {
  email: string
  full_name: string
  email_notifications: boolean
  push_notifications: boolean
  notify_friend_requests: boolean
  notify_messages: boolean
  notify_event_updates: boolean
  notify_post_interactions: boolean
  profile_visibility: 'public' | 'connections' | 'private'
  show_online_status: boolean
  allow_messages_from: 'everyone' | 'connections' | 'nobody'
}

type SettingsSection = 'account' | 'notifications' | 'privacy' | 'appearance' | 'danger'

export default function SettingsPage() {
  const router = useRouter()
  const supabase = createSupabaseBrowserClient()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [activeSection, setActiveSection] = useState<SettingsSection>('account')
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [deleteConfirmText, setDeleteConfirmText] = useState('')
  const [settings, setSettings] = useState<UserSettings>({
    email: '',
    full_name: '',
    email_notifications: true,
    push_notifications: true,
    notify_friend_requests: true,
    notify_messages: true,
    notify_event_updates: true,
    notify_post_interactions: true,
    profile_visibility: 'public',
    show_online_status: true,
    allow_messages_from: 'everyone'
  })
  const [theme, setTheme] = useState<'dark' | 'light' | 'system'>('dark')

  useEffect(() => {
    loadSettings()
  }, [])

  const loadSettings = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/auth/login')
        return
      }

      // Get profile data
      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', user.id)
        .single()

      // Get user settings from localStorage (or could be from a settings table)
      const savedSettings = localStorage.getItem('venn_settings')
      const parsedSettings = savedSettings ? JSON.parse(savedSettings) : {}

      setSettings({
        email: user.email || '',
        full_name: profile?.full_name || '',
        email_notifications: parsedSettings.email_notifications ?? true,
        push_notifications: parsedSettings.push_notifications ?? true,
        notify_friend_requests: parsedSettings.notify_friend_requests ?? true,
        notify_messages: parsedSettings.notify_messages ?? true,
        notify_event_updates: parsedSettings.notify_event_updates ?? true,
        notify_post_interactions: parsedSettings.notify_post_interactions ?? true,
        profile_visibility: parsedSettings.profile_visibility ?? 'public',
        show_online_status: parsedSettings.show_online_status ?? true,
        allow_messages_from: parsedSettings.allow_messages_from ?? 'everyone'
      })

      setTheme(parsedSettings.theme ?? 'dark')
    } catch (error) {
      console.error('Error loading settings:', error)
    } finally {
      setLoading(false)
    }
  }

  const saveSettings = async () => {
    setSaving(true)
    try {
      // Save to localStorage
      localStorage.setItem('venn_settings', JSON.stringify({
        email_notifications: settings.email_notifications,
        push_notifications: settings.push_notifications,
        notify_friend_requests: settings.notify_friend_requests,
        notify_messages: settings.notify_messages,
        notify_event_updates: settings.notify_event_updates,
        notify_post_interactions: settings.notify_post_interactions,
        profile_visibility: settings.profile_visibility,
        show_online_status: settings.show_online_status,
        allow_messages_from: settings.allow_messages_from,
        theme
      }))

      // Show success feedback
      alert('Settings saved successfully!')
    } catch (error) {
      console.error('Error saving settings:', error)
      alert('Failed to save settings')
    } finally {
      setSaving(false)
    }
  }

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push('/')
  }

  const handleDeleteAccount = async () => {
    if (deleteConfirmText !== 'DELETE') return

    try {
      // In a real app, you'd call an API endpoint that handles account deletion
      // This would delete the user's data and auth account
      alert('Account deletion would be processed here. Contact support for now.')
      setShowDeleteModal(false)
    } catch (error) {
      console.error('Error deleting account:', error)
    }
  }

  const updateSetting = <K extends keyof UserSettings>(key: K, value: UserSettings[K]) => {
    setSettings(prev => ({ ...prev, [key]: value }))
  }

  const sections = [
    { id: 'account' as const, label: 'Account', icon: '👤' },
    { id: 'notifications' as const, label: 'Notifications', icon: '🔔' },
    { id: 'privacy' as const, label: 'Privacy', icon: '🔒' },
    { id: 'appearance' as const, label: 'Appearance', icon: '🎨' },
    { id: 'danger' as const, label: 'Danger Zone', icon: '⚠️' }
  ]

  if (loading) {
    return (
      <div className="min-h-screen bg-[#1a1a1a] flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-white"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#1a1a1a] pb-24">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-black/40 backdrop-blur-xl border-b border-white/5">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <button
              onClick={() => router.back()}
              className="text-white/60 hover:text-white text-sm flex items-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Back
            </button>
            <h1 className="text-xl font-bold text-white">Settings</h1>
            <button
              onClick={saveSettings}
              disabled={saving}
              className="text-pink-400 hover:text-pink-300 text-sm font-medium disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Save'}
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex flex-col md:flex-row gap-6">
          {/* Sidebar Navigation */}
          <nav className="md:w-56 flex-shrink-0">
            <div className="flex md:flex-col gap-2 overflow-x-auto md:overflow-visible pb-2 md:pb-0">
              {sections.map((section) => (
                <button
                  key={section.id}
                  onClick={() => setActiveSection(section.id)}
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl text-left whitespace-nowrap transition-all ${
                    activeSection === section.id
                      ? 'bg-white/10 text-white'
                      : 'text-white/60 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <span>{section.icon}</span>
                  <span className="font-medium">{section.label}</span>
                </button>
              ))}
            </div>
          </nav>

          {/* Content */}
          <div className="flex-1">
            <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
              {/* Account Section */}
              {activeSection === 'account' && (
                <div className="space-y-6">
                  <div>
                    <h2 className="text-lg font-semibold text-white mb-4">Account Information</h2>

                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm text-white/60 mb-2">Email</label>
                        <input
                          type="email"
                          value={settings.email}
                          disabled
                          className="w-full bg-white/5 border border-white/10 text-white/60 px-4 py-3 rounded-xl cursor-not-allowed"
                        />
                        <p className="text-xs text-white/40 mt-1">Email cannot be changed</p>
                      </div>

                      <div>
                        <label className="block text-sm text-white/60 mb-2">Display Name</label>
                        <input
                          type="text"
                          value={settings.full_name}
                          onChange={(e) => updateSetting('full_name', e.target.value)}
                          className="w-full bg-white/5 border border-white/10 text-white px-4 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-white/20"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="border-t border-white/10 pt-6">
                    <h3 className="text-md font-medium text-white mb-4">Password</h3>
                    <button
                      onClick={() => {
                        // Trigger password reset email
                        supabase.auth.resetPasswordForEmail(settings.email)
                        alert('Password reset email sent!')
                      }}
                      className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-xl transition-colors"
                    >
                      Send Password Reset Email
                    </button>
                  </div>

                  <div className="border-t border-white/10 pt-6">
                    <h3 className="text-md font-medium text-white mb-4">Session</h3>
                    <button
                      onClick={handleSignOut}
                      className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-xl transition-colors"
                    >
                      Sign Out
                    </button>
                  </div>
                </div>
              )}

              {/* Notifications Section */}
              {activeSection === 'notifications' && (
                <div className="space-y-6">
                  <div>
                    <h2 className="text-lg font-semibold text-white mb-4">Notification Preferences</h2>

                    <div className="space-y-4">
                      <ToggleSetting
                        label="Email Notifications"
                        description="Receive notifications via email"
                        checked={settings.email_notifications}
                        onChange={(v) => updateSetting('email_notifications', v)}
                      />

                      <ToggleSetting
                        label="Push Notifications"
                        description="Receive push notifications on your device"
                        checked={settings.push_notifications}
                        onChange={(v) => updateSetting('push_notifications', v)}
                      />
                    </div>
                  </div>

                  <div className="border-t border-white/10 pt-6">
                    <h3 className="text-md font-medium text-white mb-4">Notification Types</h3>

                    <div className="space-y-4">
                      <ToggleSetting
                        label="Friend Requests"
                        description="When someone sends you a connection request"
                        checked={settings.notify_friend_requests}
                        onChange={(v) => updateSetting('notify_friend_requests', v)}
                      />

                      <ToggleSetting
                        label="Messages"
                        description="When you receive a new message"
                        checked={settings.notify_messages}
                        onChange={(v) => updateSetting('notify_messages', v)}
                      />

                      <ToggleSetting
                        label="Event Updates"
                        description="Updates about events you're attending"
                        checked={settings.notify_event_updates}
                        onChange={(v) => updateSetting('notify_event_updates', v)}
                      />

                      <ToggleSetting
                        label="Post Interactions"
                        description="Likes, comments, and saves on your posts"
                        checked={settings.notify_post_interactions}
                        onChange={(v) => updateSetting('notify_post_interactions', v)}
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Privacy Section */}
              {activeSection === 'privacy' && (
                <div className="space-y-6">
                  <div>
                    <h2 className="text-lg font-semibold text-white mb-4">Privacy Settings</h2>

                    <div className="space-y-6">
                      <div>
                        <label className="block text-sm text-white/60 mb-2">Profile Visibility</label>
                        <select
                          value={settings.profile_visibility}
                          onChange={(e) => updateSetting('profile_visibility', e.target.value as UserSettings['profile_visibility'])}
                          className="w-full bg-white/5 border border-white/10 text-white px-4 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-white/20 [&>option]:bg-[#2a2a2a]"
                        >
                          <option value="public">Public - Anyone can see your profile</option>
                          <option value="connections">Connections Only - Only your connections can see</option>
                          <option value="private">Private - Only you can see</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm text-white/60 mb-2">Who Can Message You</label>
                        <select
                          value={settings.allow_messages_from}
                          onChange={(e) => updateSetting('allow_messages_from', e.target.value as UserSettings['allow_messages_from'])}
                          className="w-full bg-white/5 border border-white/10 text-white px-4 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-white/20 [&>option]:bg-[#2a2a2a]"
                        >
                          <option value="everyone">Everyone</option>
                          <option value="connections">Connections Only</option>
                          <option value="nobody">Nobody</option>
                        </select>
                      </div>

                      <ToggleSetting
                        label="Show Online Status"
                        description="Let others see when you're online"
                        checked={settings.show_online_status}
                        onChange={(v) => updateSetting('show_online_status', v)}
                      />
                    </div>
                  </div>

                  <div className="border-t border-white/10 pt-6">
                    <h3 className="text-md font-medium text-white mb-4">Data & Privacy</h3>

                    <div className="space-y-3">
                      <button
                        onClick={() => alert('Data export feature coming soon!')}
                        className="w-full text-left px-4 py-3 bg-white/5 hover:bg-white/10 text-white rounded-xl transition-colors flex items-center justify-between"
                      >
                        <span>Download My Data</span>
                        <svg className="w-5 h-5 text-white/40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Appearance Section */}
              {activeSection === 'appearance' && (
                <div className="space-y-6">
                  <div>
                    <h2 className="text-lg font-semibold text-white mb-4">Appearance</h2>

                    <div>
                      <label className="block text-sm text-white/60 mb-3">Theme</label>
                      <div className="grid grid-cols-3 gap-3">
                        {[
                          { value: 'dark', label: 'Dark', icon: '🌙' },
                          { value: 'light', label: 'Light', icon: '☀️' },
                          { value: 'system', label: 'System', icon: '💻' }
                        ].map((option) => (
                          <button
                            key={option.value}
                            onClick={() => setTheme(option.value as typeof theme)}
                            className={`p-4 rounded-xl border transition-all ${
                              theme === option.value
                                ? 'bg-white/10 border-white/30'
                                : 'bg-white/5 border-white/10 hover:border-white/20'
                            }`}
                          >
                            <div className="text-2xl mb-2">{option.icon}</div>
                            <div className="text-sm text-white">{option.label}</div>
                          </button>
                        ))}
                      </div>
                      <p className="text-xs text-white/40 mt-3">
                        Note: Light mode coming soon. Currently using dark theme.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Danger Zone */}
              {activeSection === 'danger' && (
                <div className="space-y-6">
                  <div>
                    <h2 className="text-lg font-semibold text-red-400 mb-4">Danger Zone</h2>
                    <p className="text-white/60 text-sm mb-6">
                      These actions are irreversible. Please proceed with caution.
                    </p>

                    <div className="space-y-4">
                      <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl">
                        <h3 className="text-white font-medium mb-2">Delete Account</h3>
                        <p className="text-white/60 text-sm mb-4">
                          Permanently delete your account and all associated data. This cannot be undone.
                        </p>
                        <button
                          onClick={() => setShowDeleteModal(true)}
                          className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-xl transition-colors"
                        >
                          Delete My Account
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      {/* Delete Account Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-[#1a1a1a] border border-white/10 rounded-2xl p-6 max-w-md w-full">
            <h3 className="text-xl font-bold text-white mb-2">Delete Account</h3>
            <p className="text-white/60 mb-4">
              This action is permanent and cannot be undone. All your data, posts, connections, and messages will be deleted.
            </p>

            <div className="mb-4">
              <label className="block text-sm text-white/60 mb-2">
                Type DELETE to confirm
              </label>
              <input
                type="text"
                value={deleteConfirmText}
                onChange={(e) => setDeleteConfirmText(e.target.value)}
                className="w-full bg-white/5 border border-white/10 text-white px-4 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500/50"
                placeholder="DELETE"
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowDeleteModal(false)
                  setDeleteConfirmText('')
                }}
                className="flex-1 px-4 py-3 bg-white/10 hover:bg-white/20 text-white rounded-xl transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteAccount}
                disabled={deleteConfirmText !== 'DELETE'}
                className="flex-1 px-4 py-3 bg-red-500 hover:bg-red-600 text-white rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Delete Account
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// Toggle Setting Component
function ToggleSetting({
  label,
  description,
  checked,
  onChange
}: {
  label: string
  description: string
  checked: boolean
  onChange: (value: boolean) => void
}) {
  return (
    <div className="flex items-center justify-between py-2">
      <div>
        <div className="text-white font-medium">{label}</div>
        <div className="text-white/40 text-sm">{description}</div>
      </div>
      <button
        onClick={() => onChange(!checked)}
        className={`relative w-12 h-7 rounded-full transition-colors ${
          checked ? 'bg-pink-500' : 'bg-white/20'
        }`}
      >
        <div
          className={`absolute top-1 w-5 h-5 bg-white rounded-full transition-transform ${
            checked ? 'translate-x-6' : 'translate-x-1'
          }`}
        />
      </button>
    </div>
  )
}
