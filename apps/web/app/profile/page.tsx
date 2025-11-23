'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

interface Profile {
  id: string
  full_name: string
  bio: string
  location: string
  avatar_url: string | null
}

interface Connection {
  id: string
  user1_id: string
  user2_id: string
  status: string
}

export default function ProfilePage() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const [connections, setConnections] = useState<Connection[]>([])
  const [friendRequests, setFriendRequests] = useState<Connection[]>([])
  const [eventsCreated, setEventsCreated] = useState(0)
  const [eventsAttended, setEventsAttended] = useState(0)

  useEffect(() => {
    checkUser()
  }, [])

  const checkUser = async () => {
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      router.push('/auth/login')
      return
    }

    setUser(user)
    await fetchProfile(user.id)
    await fetchConnections(user.id)
    await fetchEvents(user.id)
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

  const fetchConnections = async (userId: string) => {
    // Fetch accepted connections
    const { data: accepted } = await supabase
      .from('connections')
      .select('*')
      .or(`user1_id.eq.${userId},user2_id.eq.${userId}`)
      .eq('status', 'accepted')

    if (accepted) {
      setConnections(accepted)
    }

    // Fetch pending requests where user is user2 (incoming requests)
    const { data: pending } = await supabase
      .from('connections')
      .select('*')
      .eq('user2_id', userId)
      .eq('status', 'pending')

    if (pending) {
      setFriendRequests(pending)
    }
  }

  const fetchEvents = async (userId: string) => {
    // Count events created
    const { count: created } = await supabase
      .from('events')
      .select('*', { count: 'exact', head: true })
      .eq('creator_id', userId)

    if (created !== null) {
      setEventsCreated(created)
    }

    // Count events attended
    const { count: attended } = await supabase
      .from('event_attendees')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)

    if (attended !== null) {
      setEventsAttended(attended)
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

  const getInitials = (name: string | null) => {
    if (!name) return '?'
    return name[0].toUpperCase()
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] pb-24">
      {/* Header with Gradient Background */}
      <header className="relative">
        {/* Gradient Background */}
        <div className="h-64 bg-gradient-to-br from-blue-500 via-blue-600 to-blue-700 relative">
          <div className="absolute inset-0 bg-gradient-to-b from-transparent to-[#0a0a0a]" />

          {/* Done Button */}
          <button
            onClick={() => router.push('/dashboard')}
            className="absolute top-4 right-4 w-10 h-10 bg-cyan-300 rounded-full flex items-center justify-center"
          >
            <svg className="w-6 h-6 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
            </svg>
          </button>
        </div>

        {/* Profile Avatar and Info */}
        <div className="relative -mt-32 px-6">
          <div className="flex flex-col items-center">
            {/* Avatar */}
            <div className="w-32 h-32 rounded-full bg-gradient-to-br from-pink-400 via-purple-500 to-blue-600 flex items-center justify-center text-white text-5xl font-bold shadow-2xl border-4 border-[#0a0a0a]">
              {profile?.avatar_url ? (
                <img
                  src={profile.avatar_url}
                  alt={profile.full_name || '?'}
                  className="w-full h-full rounded-full object-cover"
                />
              ) : (
                getInitials(profile?.full_name || null)
              )}
            </div>

            {/* Username */}
            <h1 className="text-3xl font-bold text-white mt-4">
              {profile?.full_name || 'Anonymous User'}
            </h1>

            {/* Edit Profile Button */}
            <button
              onClick={() => router.push('/profile/edit')}
              className="mt-4 px-6 py-2.5 bg-white/20 backdrop-blur-sm border border-white/30 text-white rounded-xl font-semibold hover:bg-white/30 transition-all"
            >
              Edit Profile
            </button>
          </div>
        </div>
      </header>

      <main className="px-6 mt-8">
        {/* Friends Section */}
        <section className="mb-6">
          <h2 className="text-2xl font-bold text-white mb-4">Friends</h2>

          <div className="space-y-3">
            {/* All Friends */}
            <button
              onClick={() => router.push('/profile/friends')}
              className="w-full bg-white/10 border border-white/20 rounded-2xl p-5 flex items-center gap-4 hover:bg-white/15 transition-all"
            >
              <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
                <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <div className="flex-1 text-left">
                <h3 className="text-lg font-semibold text-white">All Friends</h3>
                <p className="text-sm text-white/60">{connections.length} Total</p>
              </div>
              <svg className="w-6 h-6 text-white/40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>

            {/* Invite Friends */}
            <button className="w-full bg-white/10 border border-white/20 rounded-2xl p-5 flex items-center gap-4 hover:bg-white/15 transition-all">
              <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center relative">
                <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-green-500 rounded-full flex items-center justify-center">
                  <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 4v16m8-8H4" />
                  </svg>
                </div>
              </div>
              <div className="flex-1 text-left">
                <h3 className="text-lg font-semibold text-white">Invite Friends</h3>
              </div>
              <svg className="w-6 h-6 text-white/40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>

            {/* Friend Requests */}
            <button
              onClick={() => router.push('/profile/requests')}
              className="w-full bg-white/10 border border-white/20 rounded-2xl p-5 flex items-center gap-4 hover:bg-white/15 transition-all"
            >
              <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center relative">
                <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                <div className="absolute -top-1 -right-1 w-5 h-5 bg-white/30 rounded-full flex items-center justify-center">
                  <span className="text-xs text-white font-bold">?</span>
                </div>
              </div>
              <div className="flex-1 text-left">
                <h3 className="text-lg font-semibold text-white">Friend Requests</h3>
              </div>
              <svg className="w-6 h-6 text-white/40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        </section>

        {/* Overview Section */}
        <section className="mb-8">
          <h2 className="text-2xl font-bold text-white mb-4">Overview</h2>

          <div className="space-y-3">
            {/* Events Created */}
            <button className="w-full bg-white/10 border border-white/20 rounded-2xl p-5 flex items-center gap-4 hover:bg-white/15 transition-all">
              <div className="text-5xl">📅</div>
              <div className="flex-1 text-left">
                <h3 className="text-lg font-semibold text-white">Events Created</h3>
                <p className="text-sm text-white/60">{eventsCreated} Total</p>
              </div>
              <svg className="w-6 h-6 text-white/40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>

            {/* Events Attended */}
            <button className="w-full bg-white/10 border border-white/20 rounded-2xl p-5 flex items-center gap-4 hover:bg-white/15 transition-all">
              <div className="text-5xl">🎉</div>
              <div className="flex-1 text-left">
                <h3 className="text-lg font-semibold text-white">Events Attended</h3>
                <p className="text-sm text-white/60">{eventsAttended} Total</p>
              </div>
              <svg className="w-6 h-6 text-white/40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>

            {/* Connections */}
            <button className="w-full bg-white/10 border border-white/20 rounded-2xl p-5 flex items-center gap-4 hover:bg-white/15 transition-all">
              <div className="text-5xl">🤝</div>
              <div className="flex-1 text-left">
                <h3 className="text-lg font-semibold text-white">Connections Made</h3>
                <p className="text-sm text-white/60">{connections.length} Total</p>
              </div>
              <svg className="w-6 h-6 text-white/40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        </section>

        {/* Sign Out Button */}
        <button
          onClick={handleSignOut}
          className="w-full bg-red-500/20 border border-red-500/30 text-red-300 py-4 rounded-2xl font-semibold hover:bg-red-500/30 transition-all"
        >
          Sign Out
        </button>
      </main>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-black/60 backdrop-blur-xl border-t border-white/10 safe-area-bottom">
        <div className="max-w-2xl mx-auto px-6 py-3">
          <div className="flex items-center justify-between">
            <button
              onClick={() => router.push('/dashboard')}
              className="flex flex-col items-center gap-1 px-6 py-2"
            >
              <svg className="w-6 h-6 text-white/40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
              </svg>
              <span className="text-xs text-white/40">Home</span>
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
              <div className="w-6 h-6 bg-gradient-to-br from-pink-400 via-purple-500 to-blue-600 rounded-full flex items-center justify-center">
                <span className="text-xs text-white font-bold">{getInitials(profile?.full_name || null)}</span>
              </div>
            </button>
          </div>
        </div>
      </nav>
    </div>
  )
}
