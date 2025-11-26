'use client'

import { useEffect, useState } from 'react'
import { createSupabaseBrowserClient } from '@/lib/supabase-browser'
import { useRouter } from 'next/navigation'
import NotificationBell from '@/components/NotificationBell'

interface Event {
  id: string
  title: string
  description: string
  start_date: string
  location: string
  event_type: string
  image_url: string | null
}

interface Profile {
  id: string
  full_name: string
  bio: string
  avatar_url: string
}

export default function DashboardPage() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [events, setEvents] = useState<Event[]>([])
  const [suggestedUsers, setSuggestedUsers] = useState<Profile[]>([])
  const [loading, setLoading] = useState(true)
  const [showProfileMenu, setShowProfileMenu] = useState(false)
  const [timezone, setTimezone] = useState('')
  const supabase = createSupabaseBrowserClient()

  useEffect(() => {
    checkUser()
    // Get user's timezone
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone
    setTimezone(tz)

    // Close dropdown when clicking outside
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement
      if (!target.closest('.profile-dropdown')) {
        setShowProfileMenu(false)
      }
    }

    document.addEventListener('click', handleClickOutside)
    return () => document.removeEventListener('click', handleClickOutside)
  }, [])

  const checkUser = async () => {
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      router.push('/auth/login')
      return
    }

    setUser(user)
    await fetchProfile(user.id)
    await fetchEvents()
    await fetchSuggestedUsers()
    setLoading(false)
  }

  const fetchProfile = async (userId: string) => {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single()

    if (data) {
      setProfile(data)
    }
  }

  const fetchEvents = async () => {
    const { data, error } = await supabase
      .from('events')
      .select('*')
      .gte('start_date', new Date().toISOString())
      .order('start_date', { ascending: true })
      .limit(6)

    if (data) {
      setEvents(data)
    }
  }

  const fetchSuggestedUsers = async () => {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, full_name, bio, avatar_url')
      .limit(4)

    if (data) {
      setSuggestedUsers(data)
    }
  }

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push('/')
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
        <div className="text-lg text-white/60">Loading...</div>
      </div>
    )
  }

  const formatTimezone = (tz: string) => {
    // Convert timezone to readable format (e.g., "America/Chicago" -> "GMT-5")
    const offset = new Date().getTimezoneOffset()
    const hours = Math.abs(Math.floor(offset / 60))
    const sign = offset > 0 ? '-' : '+'
    return `${hours}:${String(Math.abs(offset % 60)).padStart(2, '0')} ${sign.replace('-', 'am').replace('+', 'pm')} GMT${sign}${hours}`
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a]">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-black/40 backdrop-blur-xl border-b border-white/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            {/* Left side - Time and timezone */}
            <div className="flex items-center gap-4">
              <div className="text-white/60 text-sm">
                {new Date().toLocaleTimeString('en-US', {
                  hour: 'numeric',
                  minute: '2-digit',
                  hour12: true
                })} {timezone.split('/')[1]?.replace('_', ' ') || 'GMT'}
              </div>
            </div>

            {/* Right side - Icons and Profile */}
            <div className="flex items-center gap-4">
              {/* Search Icon */}
              <button className="text-white/60 hover:text-white transition-colors">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </button>

              {/* Notifications Icon */}
              <NotificationBell />

              {/* Profile Avatar with Dropdown */}
              <div className="relative profile-dropdown">
                <button
                  onClick={() => setShowProfileMenu(!showProfileMenu)}
                  className="w-10 h-10 bg-gradient-to-br from-pink-500 to-orange-400 rounded-full flex items-center justify-center text-white font-bold hover:opacity-80 transition-opacity"
                >
                  {profile?.avatar_url ? (
                    <img
                      src={profile.avatar_url}
                      alt={profile.full_name}
                      className="w-full h-full rounded-full object-cover"
                    />
                  ) : (
                    profile?.full_name?.[0]?.toUpperCase() || '?'
                  )}
                </button>

                {/* Dropdown Menu */}
                {showProfileMenu && (
                  <div className="absolute right-0 mt-2 w-64 bg-[#1a1a1a] border border-white/20 rounded-2xl overflow-hidden shadow-2xl">
                    {/* Profile Header */}
                    <div className="p-4 border-b border-white/10">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-gradient-to-br from-pink-500 to-orange-400 rounded-full flex items-center justify-center text-white font-bold">
                          {profile?.avatar_url ? (
                            <img
                              src={profile.avatar_url}
                              alt={profile.full_name}
                              className="w-full h-full rounded-full object-cover"
                            />
                          ) : (
                            profile?.full_name?.[0]?.toUpperCase() || '?'
                          )}
                        </div>
                        <div>
                          <div className="text-white font-semibold">{profile?.full_name || 'User'}</div>
                          <div className="text-white/60 text-sm">@{profile?.full_name?.toLowerCase().replace(/\s+/g, '') || 'user'}</div>
                        </div>
                      </div>
                    </div>

                    {/* Menu Items */}
                    <div className="py-2">
                      <button
                        onClick={() => {
                          router.push('/profile')
                          setShowProfileMenu(false)
                        }}
                        className="w-full px-4 py-3 text-left text-white hover:bg-white/10 transition-colors"
                      >
                        View Profile
                      </button>
                      <button
                        onClick={() => {
                          router.push('/settings')
                          setShowProfileMenu(false)
                        }}
                        className="w-full px-4 py-3 text-left text-white hover:bg-white/10 transition-colors"
                      >
                        Settings
                      </button>
                      <button
                        onClick={() => {
                          handleSignOut()
                          setShowProfileMenu(false)
                        }}
                        className="w-full px-4 py-3 text-left text-white hover:bg-white/10 transition-colors"
                      >
                        Sign Out
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Hero Card - Featured Content */}
        <div className="mb-8 relative overflow-hidden rounded-3xl bg-gradient-to-br from-pink-600/20 via-purple-600/20 to-orange-600/20 p-8 backdrop-blur-sm border border-white/10">
          <div className="relative z-10">
            <div className="flex items-center justify-center mb-6">
              <div className="text-8xl">🎊</div>
            </div>
            <p className="text-white/60 text-sm uppercase tracking-wider mb-2 text-center">HOW TO</p>
            <h2 className="text-4xl font-bold text-white mb-4 text-center">Connect with your community</h2>
            <p className="text-white/60 text-center mb-6">Discover events and people near you</p>
            <div className="flex justify-center">
              <button className="bg-white/10 hover:bg-white/20 backdrop-blur-sm text-white px-8 py-3 rounded-full font-medium transition-all">
                Read More
              </button>
            </div>
          </div>
          {/* Pagination dots */}
          <div className="flex justify-center gap-2 mt-6">
            {[...Array(8)].map((_, i) => (
              <div
                key={i}
                className={`w-2 h-2 rounded-full ${i === 2 ? 'bg-white w-8' : 'bg-white/30'}`}
              />
            ))}
          </div>
        </div>

        {/* Featured Event Card */}
        {events.length > 0 && (
          <section className="mb-8">
            <button
              onClick={() => router.push(`/events/${events[0].id}`)}
              className="w-full relative overflow-hidden rounded-3xl bg-white/5 border border-white/10 hover:border-white/20 transition-all text-left group"
            >
              {/* Event Gradient Background */}
              <div
                className="aspect-[2/1] md:aspect-[3/1] w-full relative"
                style={{ background: events[0].image_url || 'linear-gradient(135deg, #ff0080 0%, #ff8c00 50%, #ffed4e 100%)' }}
              >
                <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent" />

                {/* Event Info Overlay */}
                <div className="absolute bottom-0 left-0 right-0 p-8">
                  <div className="text-xs text-white/60 uppercase tracking-wider mb-2">
                    {events[0].event_type}
                  </div>
                  <h2 className="text-4xl md:text-5xl font-black text-white mb-3 drop-shadow-lg">
                    {events[0].title}
                  </h2>
                  <p className="text-white/80 text-sm md:text-base mb-4 max-w-2xl line-clamp-2">
                    {events[0].description}
                  </p>
                  <div className="flex items-center gap-4 text-sm text-white/60">
                    <span className="flex items-center gap-2">
                      📍 {events[0].location}
                    </span>
                    <span className="flex items-center gap-2">
                      📅 {new Date(events[0].start_date).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              </div>
            </button>
          </section>
        )}

        {/* Quick Actions */}
        <section className="mb-8">
          <h2 className="text-2xl font-bold text-white mb-4">Quick Actions</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <button
              onClick={() => router.push('/discover')}
              className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-blue-600/20 to-purple-600/20 border border-white/10 p-6 text-left hover:border-white/20 transition-all"
            >
              <div className="text-5xl mb-3">🔍</div>
              <h3 className="text-white font-bold text-lg mb-1">Discover People</h3>
              <p className="text-white/60 text-sm">Find your perfect matches</p>
            </button>

            <button
              onClick={() => router.push('/events/create')}
              className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-pink-600/20 to-orange-600/20 border border-white/10 p-6 text-left hover:border-white/20 transition-all"
            >
              <div className="text-5xl mb-3">📅</div>
              <h3 className="text-white font-bold text-lg mb-1">Create Event</h3>
              <p className="text-white/60 text-sm">Host a gathering</p>
            </button>

            <button className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-green-600/20 to-teal-600/20 border border-white/10 p-6 text-left hover:border-white/20 transition-all">
              <div className="text-5xl mb-3">🏘️</div>
              <h3 className="text-white font-bold text-lg mb-1">Communities</h3>
              <p className="text-white/60 text-sm">Find your tribe</p>
            </button>
          </div>
        </section>

        {/* Upcoming Events */}
        <section className="mb-8">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl font-bold text-white">Upcoming Events</h2>
            <button
              onClick={() => router.push('/events')}
              className="text-white/60 hover:text-white text-sm"
            >
              See All
            </button>
          </div>

          {events.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {events.map((event) => (
                <button
                  key={event.id}
                  className="group relative overflow-hidden rounded-2xl bg-white/10 border border-white/20 hover:border-white/30 transition-all text-left"
                >
                  {/* Event Image/Gradient */}
                  <div
                    className="aspect-video w-full"
                    style={{ background: event.image_url || 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}
                  >
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                  </div>

                  {/* Event Info */}
                  <div className="p-4">
                    <div className="text-xs text-white/50 uppercase tracking-wide mb-1">
                      {event.event_type}
                    </div>
                    <h3 className="text-white font-semibold mb-2 line-clamp-1">{event.title}</h3>
                    <p className="text-white/70 text-sm mb-3 line-clamp-2">{event.description}</p>
                    <div className="flex items-center gap-3 text-xs text-white/50">
                      <span>📍 {event.location}</span>
                      <span>📅 {new Date(event.start_date).toLocaleDateString()}</span>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <div className="text-center py-16 bg-white/5 rounded-2xl border border-white/10">
              <div className="text-5xl mb-4">📅</div>
              <p className="text-white/40">No upcoming events yet. Create one to get started!</p>
            </div>
          )}
        </section>

        {/* Friend Suggestions */}
        <section className="mb-20">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl font-bold text-white">People You May Know</h2>
            <button className="text-white/60 hover:text-white text-sm">See All</button>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {suggestedUsers.map((profile) => (
              <div
                key={profile.id}
                className="bg-white/5 border border-white/10 rounded-2xl p-4 text-center hover:border-white/20 transition-all"
              >
                <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full mx-auto mb-3 flex items-center justify-center text-white text-2xl font-bold">
                  {profile.full_name?.[0] || '?'}
                </div>
                <h3 className="text-white font-semibold mb-1 truncate">{profile.full_name || 'Anonymous'}</h3>
                <p className="text-white/40 text-xs mb-3 line-clamp-2 h-8">{profile.bio || 'No bio yet'}</p>
                <button className="w-full bg-white/10 hover:bg-white/20 text-white text-sm py-2 rounded-full font-medium transition-all">
                  Invite
                </button>
              </div>
            ))}
          </div>
        </section>
      </main>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-black/60 backdrop-blur-xl border-t border-white/10 safe-area-bottom">
        <div className="max-w-2xl mx-auto px-6 py-3">
          <div className="flex items-center justify-between">
            <button className="flex flex-col items-center gap-1 px-6 py-2 rounded-full bg-white/10">
              <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 20 20">
                <path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z" />
              </svg>
              <span className="text-xs text-white font-medium">Home</span>
            </button>

            <button
              onClick={() => router.push('/events')}
              className="flex flex-col items-center gap-1 px-6 py-2"
            >
              <svg className="w-6 h-6 text-white/40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <span className="text-xs text-white/40">Events</span>
            </button>

            <button
              onClick={() => router.push('/discover')}
              className="flex flex-col items-center gap-1 px-6 py-2"
            >
              <svg className="w-6 h-6 text-white/40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              <span className="text-xs text-white/40">Discover</span>
            </button>

            <button className="flex flex-col items-center gap-1 px-6 py-2">
              <svg className="w-6 h-6 text-white/40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
              <span className="text-xs text-white/40">Library</span>
            </button>

            <button className="flex flex-col items-center gap-1 px-4 py-2">
              <svg className="w-6 h-6 text-white/40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </button>
          </div>
        </div>
      </nav>
    </div>
  )
}
