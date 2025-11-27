'use client'

import { useState, useEffect } from 'react'
import { createSupabaseBrowserClient } from '@/lib/supabase-browser'
import { useRouter } from 'next/navigation'
import LocationAutocomplete from '@/components/LocationAutocomplete'

const THEMES = [
  { name: 'Sunset', gradient: 'linear-gradient(135deg, #ff0080 0%, #ff8c00 50%, #ffed4e 100%)' },
  { name: 'Ocean', gradient: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' },
  { name: 'Forest', gradient: 'linear-gradient(135deg, #0ba360 0%, #3cba92 100%)' },
  { name: 'Candy', gradient: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)' },
  { name: 'Sky', gradient: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)' },
  { name: 'Fire', gradient: 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)' },
]

const EVENT_TYPES = [
  { name: 'Social', icon: '🎉' },
  { name: 'Sports', icon: '⚽' },
  { name: 'Food & Drink', icon: '🍔' },
  { name: 'Arts & Culture', icon: '🎨' },
  { name: 'Outdoor', icon: '🏕️' },
  { name: 'Learning', icon: '📚' },
  { name: 'Professional', icon: '💼' },
  { name: 'Other', icon: '✨' }
]

export default function CreateEventPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [showDescriptionModal, setShowDescriptionModal] = useState(false)
  const [showAuthModal, setShowAuthModal] = useState(false)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [selectedTheme, setSelectedTheme] = useState(0)
  const [email, setEmail] = useState('')
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    event_type: 'Social',
    start_date: '',
    start_time: '',
    end_date: '',
    end_time: '',
    location: '',
    latitude: null as number | null,
    longitude: null as number | null,
    max_attendees: ''
  })
  const supabase = createSupabaseBrowserClient()

  useEffect(() => {
    checkAuth()
  }, [])

  const checkAuth = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      setIsAuthenticated(true)
    } else {
      // Show auth modal after a brief delay to let page render
      setTimeout(() => setShowAuthModal(true), 500)
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  const handleLocationChange = (location: string, coordinates: { lat: number; lng: number } | null) => {
    setFormData(prev => ({
      ...prev,
      location,
      latitude: coordinates?.lat ?? null,
      longitude: coordinates?.lng ?? null
    }))
  }

  const shuffleTheme = () => {
    setSelectedTheme(Math.floor(Math.random() * THEMES.length))
  }

  const handleEmailSignup = () => {
    // Save event data to localStorage so user can continue after signup
    localStorage.setItem('pendingEvent', JSON.stringify(formData))
    router.push(`/auth/signup?email=${encodeURIComponent(email)}`)
  }

  const handleGoogleSignIn = async () => {
    // Save event data to localStorage so user can continue after signup
    localStorage.setItem('pendingEvent', JSON.stringify(formData))

    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      })

      if (error) throw error
    } catch (err: any) {
      console.error('Google sign in error:', err.message)
    }
  }

  const formatDateTime = (date: string, time: string) => {
    if (!date || !time) return ''
    return `${date}T${time}:00`
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser()

      if (userError || !user) {
        alert('You must be logged in to create an event')
        router.push('/auth/login')
        return
      }

      const startDateTime = formatDateTime(formData.start_date, formData.start_time)
      const endDateTime = formData.end_date && formData.end_time
        ? formatDateTime(formData.end_date, formData.end_time)
        : null

      const { error } = await supabase
        .from('events')
        .insert({
          creator_id: user.id,
          title: formData.title,
          description: formData.description,
          event_type: formData.event_type,
          start_date: startDateTime,
          end_date: endDateTime,
          location: formData.location,
          latitude: formData.latitude,
          longitude: formData.longitude,
          max_attendees: formData.max_attendees ? parseInt(formData.max_attendees) : null,
          image_url: THEMES[selectedTheme].gradient
        } as never)
        .select()

      if (error) {
        console.error('Error creating event:', error)
        alert('Failed to create event. Please try again.')
        return
      }

      alert('Event created successfully!')
      router.push('/dashboard')
    } catch (error) {
      console.error('Error:', error)
      alert('An unexpected error occurred')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#1a1a1a] relative">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-black/40 backdrop-blur-xl border-b border-white/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <button
              onClick={() => router.push('/dashboard')}
              className="text-white/60 hover:text-white text-sm flex items-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Back
            </button>
            <h1 className="text-xl font-bold text-white">Create Event</h1>
            <button
              onClick={() => router.push('/dashboard')}
              className="text-white/60 hover:text-white text-sm"
            >
              Cancel
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pb-24">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Left Column - Theme Preview */}
          <div className="space-y-4">
            <div className="relative aspect-square rounded-3xl overflow-hidden shadow-2xl border border-white/10" style={{ background: THEMES[selectedTheme].gradient }}>
              <div className="absolute inset-0 flex items-center justify-center p-12">
                <h2 className="text-5xl font-black text-white text-center break-words drop-shadow-lg">
                  {formData.title || 'Event Name'}
                </h2>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="flex-1 bg-white/5 border border-white/10 backdrop-blur-sm rounded-xl p-3 flex items-center gap-3">
                <span className="text-white/40 text-sm">Theme</span>
                <span className="text-white font-medium">{THEMES[selectedTheme].name}</span>
              </div>
              <button
                type="button"
                onClick={shuffleTheme}
                className="bg-white/5 border border-white/10 hover:bg-white/10 hover:border-white/20 backdrop-blur-sm p-3 rounded-xl transition-all"
                title="Shuffle theme"
              >
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              </button>
            </div>
          </div>

          {/* Right Column - Form */}
          <div className="bg-white/5 border border-white/10 backdrop-blur-md rounded-3xl p-8">
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Event Name */}
              <div>
                <input
                  type="text"
                  name="title"
                  required
                  value={formData.title}
                  onChange={handleChange}
                  className="w-full bg-transparent border-none text-3xl font-bold text-white placeholder-white/30 focus:outline-none focus:ring-0"
                  placeholder="Event Name"
                />
              </div>

              {/* Event Type Pills */}
              <div>
                <label className="block text-white/40 text-sm mb-3">Event Type</label>
                <div className="flex flex-wrap gap-2">
                  {EVENT_TYPES.map((type) => (
                    <button
                      key={type.name}
                      type="button"
                      onClick={() => setFormData(prev => ({ ...prev, event_type: type.name }))}
                      className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                        formData.event_type === type.name
                          ? 'bg-white text-black'
                          : 'bg-white/10 border border-white/10 text-white hover:bg-white/20 hover:border-white/20'
                      }`}
                    >
                      {type.icon} {type.name}
                    </button>
                  ))}
                </div>
              </div>

              {/* Start Date & Time */}
              <div>
                <label className="block text-white/40 text-sm mb-2">⏱ Start</label>
                <div className="grid grid-cols-2 gap-3">
                  <input
                    type="date"
                    name="start_date"
                    required
                    value={formData.start_date}
                    onChange={handleChange}
                    className="bg-white/5 border border-white/10 text-white placeholder-white/30 px-4 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-white/20 focus:border-white/20 [color-scheme:dark]"
                  />
                  <input
                    type="time"
                    name="start_time"
                    required
                    value={formData.start_time}
                    onChange={handleChange}
                    className="bg-white/5 border border-white/10 text-white placeholder-white/30 px-4 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-white/20 focus:border-white/20 [color-scheme:dark]"
                  />
                </div>
              </div>

              {/* End Date & Time */}
              <div>
                <label className="block text-white/40 text-sm mb-2">⏰ End</label>
                <div className="grid grid-cols-2 gap-3">
                  <input
                    type="date"
                    name="end_date"
                    value={formData.end_date}
                    onChange={handleChange}
                    className="bg-white/5 border border-white/10 text-white placeholder-white/30 px-4 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-white/20 focus:border-white/20 [color-scheme:dark]"
                  />
                  <input
                    type="time"
                    name="end_time"
                    value={formData.end_time}
                    onChange={handleChange}
                    className="bg-white/5 border border-white/10 text-white placeholder-white/30 px-4 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-white/20 focus:border-white/20 [color-scheme:dark]"
                  />
                </div>
              </div>

              {/* Location */}
              <div>
                <label className="block text-white/40 text-sm mb-2">📍 Add Event Location</label>
                <LocationAutocomplete
                  value={formData.location}
                  onChange={handleLocationChange}
                  placeholder="Search for a location..."
                  className="w-full bg-white/5 border border-white/10 text-white placeholder-white/30 px-4 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-white/20 focus:border-white/20"
                />
                {formData.latitude && formData.longitude && (
                  <p className="text-white/30 text-xs mt-1 flex items-center gap-1">
                    <span className="text-green-400">✓</span> Location coordinates saved
                  </p>
                )}
              </div>

              {/* Description Button */}
              <button
                type="button"
                onClick={() => setShowDescriptionModal(true)}
                className="w-full bg-white/5 border border-white/10 text-white/60 hover:text-white px-4 py-3 rounded-xl text-left flex items-center gap-2 hover:bg-white/10 hover:border-white/20 transition-all"
              >
                📝 {formData.description ? 'Edit Description' : 'Add Description'}
                {formData.description && <span className="text-white/30 ml-auto text-sm">✓</span>}
              </button>

              {/* Event Options */}
              <div className="space-y-3 pt-4 border-t border-white/10">
                <div className="flex items-center justify-between">
                  <span className="text-white/60 text-sm">🎫 Capacity</span>
                  <input
                    type="number"
                    name="max_attendees"
                    min="1"
                    value={formData.max_attendees}
                    onChange={handleChange}
                    className="w-32 bg-white/5 border border-white/10 text-white placeholder-white/30 px-3 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-white/20 focus:border-white/20 text-right"
                    placeholder="Unlimited"
                  />
                </div>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-white text-black py-4 rounded-xl font-semibold text-lg hover:bg-white/90 transition-all disabled:opacity-50 disabled:cursor-not-allowed mt-8"
              >
                {loading ? 'Creating...' : 'Create Event'}
              </button>
            </form>
          </div>
        </div>
      </main>

      {/* Description Modal */}
      {showDescriptionModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-[#1a1a1a] border border-white/10 rounded-3xl p-8 max-w-2xl w-full">
            <h3 className="text-2xl font-bold text-white mb-4">Event Description</h3>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleChange}
              rows={8}
              className="w-full bg-white/5 border border-white/10 text-white placeholder-white/30 px-4 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-white/20 resize-none"
              placeholder="Tell people what your event is about..."
            />
            <div className="flex gap-3 mt-6">
              <button
                type="button"
                onClick={() => setShowDescriptionModal(false)}
                className="flex-1 bg-white text-black py-3 rounded-xl font-medium hover:bg-white/90 transition-colors"
              >
                Save
              </button>
              <button
                type="button"
                onClick={() => {
                  setFormData(prev => ({ ...prev, description: '' }))
                  setShowDescriptionModal(false)
                }}
                className="px-6 py-3 bg-white/5 border border-white/10 rounded-xl font-medium text-white hover:bg-white/10 hover:border-white/20 transition-all"
              >
                Clear
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Auth Modal - Luma Style */}
      {showAuthModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setShowAuthModal(false)}
          />

          {/* Modal */}
          <div className="relative bg-[#2a2a2a] rounded-2xl p-8 w-full max-w-md mx-4 shadow-2xl border border-white/10">
            {/* Icon */}
            <div className="w-16 h-16 bg-gradient-to-br from-blue-400 via-purple-500 to-pink-500 rounded-2xl flex items-center justify-center mb-6 mx-auto">
              <span className="text-white font-bold text-3xl">V</span>
            </div>

            {/* Title */}
            <h2 className="text-2xl font-bold text-white text-center mb-2">
              Welcome to Venn
            </h2>
            <p className="text-white/50 text-center mb-6">
              Please sign in or sign up below.
            </p>

            {/* Email Input */}
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-white/70 mb-2">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@email.com"
                  className="w-full px-4 py-3 bg-[#1a1a1a] border border-white/10 text-white placeholder-white/30 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
              </div>

              <button
                onClick={handleEmailSignup}
                disabled={!email}
                className="w-full py-3 bg-white text-black rounded-xl font-semibold hover:bg-white/90 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Continue with Email
              </button>

              {/* Divider */}
              <div className="relative my-6">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-white/10"></div>
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-4 bg-[#2a2a2a] text-white/40">or</span>
                </div>
              </div>

              {/* Social Sign In Options */}
              <button
                onClick={handleGoogleSignIn}
                className="w-full py-3 bg-white/10 border border-white/10 text-white rounded-xl font-medium hover:bg-white/20 transition-all flex items-center justify-center gap-2"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                </svg>
                Sign in with Google
              </button>

              {/* Already have account */}
              <div className="text-center text-sm text-white/50 mt-6">
                Already have an account?{' '}
                <button
                  onClick={() => router.push('/auth/login')}
                  className="text-white hover:text-white/80 font-medium transition-colors"
                >
                  Sign in
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
