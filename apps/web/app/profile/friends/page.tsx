'use client'

import { useEffect, useState } from 'react'
import { createSupabaseBrowserClient } from '@/lib/supabase-browser'
import { useRouter } from 'next/navigation'

interface Friend {
  id: string
  full_name: string | null
  avatar_url: string | null
  bio: string | null
  about_me: string | null
}

interface Connection {
  id: string
  user1_id: string
  user2_id: string
  status: string
  created_at: string
}

export default function FriendsPage() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [friends, setFriends] = useState<Friend[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const supabase = createSupabaseBrowserClient()

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
    await fetchFriends(user.id)
    setLoading(false)
  }

  const fetchFriends = async (userId: string) => {
    // Fetch accepted connections
    const { data: connections, error: connError } = await supabase
      .from('connections')
      .select('*')
      .or(`user1_id.eq.${userId},user2_id.eq.${userId}`)
      .eq('status', 'accepted')

    if (connError || !connections) {
      console.error('Error fetching connections:', connError)
      return
    }

    // Get friend IDs (the other user in each connection)
    const friendIds = connections.map((conn: Connection) =>
      conn.user1_id === userId ? conn.user2_id : conn.user1_id
    )

    if (friendIds.length === 0) {
      setFriends([])
      return
    }

    // Fetch friend profiles
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('id, full_name, avatar_url, bio, about_me')
      .in('id', friendIds)

    if (profilesError) {
      console.error('Error fetching profiles:', profilesError)
      return
    }

    setFriends(profiles || [])
  }

  const removeFriend = async (friendId: string) => {
    if (!user) return

    const confirmed = window.confirm('Are you sure you want to remove this friend?')
    if (!confirmed) return

    // Delete the connection (could be in either direction)
    const { error } = await supabase
      .from('connections')
      .delete()
      .or(`and(user1_id.eq.${user.id},user2_id.eq.${friendId}),and(user1_id.eq.${friendId},user2_id.eq.${user.id})`)

    if (error) {
      console.error('Error removing friend:', error)
      return
    }

    // Update local state
    setFriends(prev => prev.filter(f => f.id !== friendId))
  }

  const getInitials = (name: string | null) => {
    if (!name) return '?'
    return name[0].toUpperCase()
  }

  const filteredFriends = friends.filter(friend =>
    friend.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    friend.about_me?.toLowerCase().includes(searchQuery.toLowerCase())
  )

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
        <div className="text-lg text-white/60">Loading...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] pb-24">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-[#0a0a0a]/80 backdrop-blur-xl border-b border-white/10">
        <div className="px-4 py-4 flex items-center gap-4">
          <button
            onClick={() => router.back()}
            className="p-2 text-white/60 hover:text-white transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <h1 className="text-xl font-bold text-white">Friends</h1>
          <span className="text-white/40 text-sm">({friends.length})</span>
        </div>

        {/* Search */}
        <div className="px-4 pb-4">
          <div className="relative">
            <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              placeholder="Search friends..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-4 py-3 bg-white/5 border border-white/10 text-white placeholder-white/40 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500/50"
            />
          </div>
        </div>
      </header>

      <main className="px-4 py-4">
        {filteredFriends.length === 0 ? (
          <div className="text-center py-16">
            {friends.length === 0 ? (
              <>
                <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-10 h-10 text-white/20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                </div>
                <h2 className="text-xl font-semibold text-white mb-2">No Friends Yet</h2>
                <p className="text-white/60 mb-6">Connect with people to grow your network</p>
                <button
                  onClick={() => router.push('/discover')}
                  className="px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-xl font-semibold hover:opacity-90 transition-all"
                >
                  Discover People
                </button>
              </>
            ) : (
              <>
                <p className="text-white/60">No friends match "{searchQuery}"</p>
              </>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {filteredFriends.map((friend) => (
              <div
                key={friend.id}
                className="bg-white/5 border border-white/10 rounded-2xl p-4 flex items-center gap-4"
              >
                {/* Avatar */}
                <div
                  onClick={() => router.push(`/user/${friend.id}`)}
                  className="w-14 h-14 rounded-full bg-gradient-to-br from-pink-400 via-purple-500 to-blue-600 flex items-center justify-center text-white text-xl font-bold cursor-pointer overflow-hidden flex-shrink-0"
                >
                  {friend.avatar_url ? (
                    <img
                      src={friend.avatar_url}
                      alt={friend.full_name || '?'}
                      className="w-full h-full rounded-full object-cover"
                    />
                  ) : (
                    getInitials(friend.full_name)
                  )}
                </div>

                {/* Info */}
                <div
                  onClick={() => router.push(`/user/${friend.id}`)}
                  className="flex-1 min-w-0 cursor-pointer"
                >
                  <h3 className="text-lg font-semibold text-white truncate">
                    {friend.full_name || 'Anonymous'}
                  </h3>
                  {friend.about_me && (
                    <p className="text-sm text-white/60 truncate">{friend.about_me}</p>
                  )}
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => router.push(`/user/${friend.id}`)}
                    className="p-2 bg-white/10 rounded-xl text-white/60 hover:text-white hover:bg-white/20 transition-all"
                    title="View Profile"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  </button>
                  <button
                    onClick={() => removeFriend(friend.id)}
                    className="p-2 bg-red-500/10 rounded-xl text-red-400 hover:text-red-300 hover:bg-red-500/20 transition-all"
                    title="Remove Friend"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7a4 4 0 11-8 0 4 4 0 018 0zM9 14a6 6 0 00-6 6v1h12v-1a6 6 0 00-6-6zM21 12h-6" />
                    </svg>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
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

            <button
              onClick={() => router.push('/profile')}
              className="flex flex-col items-center gap-1 px-6 py-2"
            >
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
              <span className="text-xs text-white">Profile</span>
            </button>
          </div>
        </div>
      </nav>
    </div>
  )
}
