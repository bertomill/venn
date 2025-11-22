'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

interface Event {
  id: string
  title: string
  description: string
  start_date: string
  location: string
  event_type: string
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
  const [events, setEvents] = useState<Event[]>([])
  const [suggestedUsers, setSuggestedUsers] = useState<Profile[]>([])
  const [loading, setLoading] = useState(true)

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
    await fetchEvents()
    await fetchSuggestedUsers()
    setLoading(false)
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
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">Loading...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <h1 className="text-2xl font-bold text-gray-900">Venn</h1>
            <div className="flex items-center gap-4">
              <span className="text-sm text-gray-600">
                Welcome, {user?.user_metadata?.full_name || 'there'}!
              </span>
              <button
                onClick={handleSignOut}
                className="text-sm text-gray-600 hover:text-gray-900"
              >
                Sign out
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <button
            onClick={() => router.push('/discover')}
            className="bg-gradient-to-br from-blue-500 to-purple-600 p-8 rounded-2xl shadow-lg hover:shadow-xl transition-all text-left group"
          >
            <div className="text-5xl mb-3">🔍</div>
            <h3 className="font-bold text-white text-xl mb-2 group-hover:scale-105 transition-transform">Discover People</h3>
            <p className="text-blue-100">Find your perfect matches</p>
          </button>
          <button className="bg-white p-8 rounded-2xl shadow-sm hover:shadow-md transition-shadow text-left border border-gray-200">
            <div className="text-5xl mb-3">📅</div>
            <h3 className="font-bold text-gray-900 text-xl mb-2">Create Event</h3>
            <p className="text-gray-600">Host a gathering</p>
          </button>
          <button className="bg-white p-8 rounded-2xl shadow-sm hover:shadow-md transition-shadow text-left border border-gray-200">
            <div className="text-5xl mb-3">🏘️</div>
            <h3 className="font-bold text-gray-900 text-xl mb-2">Communities</h3>
            <p className="text-gray-600">Find your tribe</p>
          </button>
        </div>

        {/* Upcoming Events */}
        <section className="mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Upcoming Events</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {events.length > 0 ? (
              events.map((event) => (
                <div key={event.id} className="bg-white rounded-lg shadow-sm p-6 hover:shadow-md transition-shadow">
                  <div className="text-sm text-primary-600 font-medium mb-2">
                    {event.event_type}
                  </div>
                  <h3 className="font-semibold text-gray-900 mb-2">{event.title}</h3>
                  <p className="text-sm text-gray-600 mb-3 line-clamp-2">{event.description}</p>
                  <div className="text-xs text-gray-500">
                    <div>📍 {event.location}</div>
                    <div>📅 {new Date(event.start_date).toLocaleDateString()}</div>
                  </div>
                </div>
              ))
            ) : (
              <div className="col-span-3 text-center py-12 bg-white rounded-lg">
                <p className="text-gray-500">No upcoming events yet. Create one to get started!</p>
              </div>
            )}
          </div>
        </section>

        {/* Suggested Connections */}
        <section>
          <h2 className="text-xl font-semibold text-gray-900 mb-4">People You May Know</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {suggestedUsers.map((profile) => (
              <div key={profile.id} className="bg-white rounded-lg shadow-sm p-6 text-center hover:shadow-md transition-shadow">
                <div className="w-16 h-16 bg-gradient-to-br from-primary-400 to-primary-600 rounded-full mx-auto mb-3 flex items-center justify-center text-white text-xl font-bold">
                  {profile.full_name?.[0] || '?'}
                </div>
                <h3 className="font-semibold text-gray-900 mb-1">{profile.full_name || 'Anonymous'}</h3>
                <p className="text-xs text-gray-600 mb-3 line-clamp-2">{profile.bio || 'No bio yet'}</p>
                <button className="text-sm text-primary-600 hover:text-primary-700 font-medium">
                  Connect
                </button>
              </div>
            ))}
          </div>
        </section>
      </main>
    </div>
  )
}
