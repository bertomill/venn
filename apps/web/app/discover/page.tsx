'use client'

import { useEffect, useState } from 'react'
import { createSupabaseBrowserClient } from '@/lib/supabase-browser'
import { useRouter } from 'next/navigation'
import AppShell from '@/components/AppShell'

interface SimilarUser {
  id: string
  full_name: string
  bio: string | null
  location: string | null
  avatar_url: string | null
  about_me: string | null
  looking_for: string | null
  event_size_preference: string | null
  event_vibe: string[] | null
  interests: string[]
  matchScore: number
  similarity: number
}

export default function DiscoverPage() {
  const router = useRouter()
  const [users, setUsers] = useState<SimilarUser[]>([])
  const [filteredUsers, setFilteredUsers] = useState<SimilarUser[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [user, setUser] = useState<{ id: string } | null>(null)
  const [connectedIds, setConnectedIds] = useState<Set<string>>(new Set())
  const [pendingIds, setPendingIds] = useState<Set<string>>(new Set())
  const supabase = createSupabaseBrowserClient()

  useEffect(() => {
    checkUser()
  }, [])

  useEffect(() => {
    // Filter users based on search query
    if (!searchQuery.trim()) {
      setFilteredUsers(users)
    } else {
      const query = searchQuery.toLowerCase()
      setFilteredUsers(users.filter(u =>
        u.full_name?.toLowerCase().includes(query) ||
        u.about_me?.toLowerCase().includes(query) ||
        u.looking_for?.toLowerCase().includes(query) ||
        u.interests?.some(i => i.toLowerCase().includes(query))
      ))
    }
  }, [searchQuery, users])

  const checkUser = async () => {
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      router.push('/auth/login')
      return
    }

    setUser(user)
    await Promise.all([
      findSimilarUsers(user.id),
      fetchConnections(user.id)
    ])
  }

  const fetchConnections = async (userId: string) => {
    const { data: connections } = await supabase
      .from('connections')
      .select('user1_id, user2_id, status')
      .or(`user1_id.eq.${userId},user2_id.eq.${userId}`)

    const connected = new Set<string>()
    const pending = new Set<string>()

    connections?.forEach((c: { user1_id: string; user2_id: string; status: string }) => {
      const otherId = c.user1_id === userId ? c.user2_id : c.user1_id
      if (c.status === 'accepted') {
        connected.add(otherId)
      } else if (c.status === 'pending') {
        pending.add(otherId)
      }
    })

    setConnectedIds(connected)
    setPendingIds(pending)
  }

  const findSimilarUsers = async (userId: string) => {
    try {
      const response = await fetch('/api/users/similar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, limit: 50 })
      })

      const data = await response.json()

      if (data.users) {
        setUsers(data.users)
        setFilteredUsers(data.users)
      }

      setLoading(false)
    } catch (error) {
      console.error('Error finding similar users:', error)
      setLoading(false)
    }
  }

  const handleConnect = async (targetUserId: string) => {
    if (!user) return

    try {
      await supabase
        .from('connections')
        .insert({
          user1_id: user.id,
          user2_id: targetUserId,
          status: 'pending'
        } as never)

      setPendingIds(prev => new Set([...prev, targetUserId]))
    } catch (error) {
      console.error('Error connecting:', error)
    }
  }

  const getConnectionStatus = (userId: string) => {
    if (connectedIds.has(userId)) return 'connected'
    if (pendingIds.has(userId)) return 'pending'
    return 'none'
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0a0a0a]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-purple-500 mx-auto mb-4"></div>
          <div className="text-lg text-white/60">Finding people...</div>
        </div>
      </div>
    )
  }

  return (
    <AppShell showHeader={false}>
      {/* Page Header */}
      <header className="sticky top-0 z-40 bg-black/40 backdrop-blur-xl border-b border-white/5 lg:static lg:bg-transparent lg:border-0">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-2xl font-bold text-white">Discover People</h1>
            <span className="text-sm text-white/40">{filteredUsers.length} people</span>
          </div>

          {/* Search */}
          <div className="relative">
            <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by name, interests, or what they're looking for..."
              className="w-full pl-12 pr-4 py-3 bg-white/5 border border-white/10 text-white placeholder-white/40 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500/50"
            />
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {filteredUsers.length === 0 ? (
          <div className="text-center py-16">
            <div className="text-5xl mb-4">🔍</div>
            <p className="text-white/60">
              {searchQuery ? 'No people match your search' : 'No people to discover yet'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredUsers.map((person) => {
              const status = getConnectionStatus(person.id)

              return (
                <div
                  key={person.id}
                  className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden hover:border-white/20 transition-all cursor-pointer"
                  onClick={() => router.push(`/user/${person.id}`)}
                >
                  {/* Header with avatar and match score */}
                  <div className="p-5">
                    <div className="flex items-start gap-4">
                      {/* Avatar */}
                      <div className="w-16 h-16 rounded-full bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center flex-shrink-0">
                        {person.avatar_url ? (
                          <img
                            src={person.avatar_url}
                            alt={person.full_name}
                            className="w-full h-full rounded-full object-cover"
                          />
                        ) : (
                          <span className="text-2xl font-bold text-white">
                            {person.full_name?.[0]?.toUpperCase() || '?'}
                          </span>
                        )}
                      </div>

                      {/* Name and match score */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <h3 className="text-lg font-semibold text-white truncate">
                            {person.full_name}
                          </h3>
                          <span className={`text-sm font-medium px-2 py-0.5 rounded-full ${
                            person.matchScore >= 70
                              ? 'bg-green-500/20 text-green-300'
                              : person.matchScore >= 50
                              ? 'bg-blue-500/20 text-blue-300'
                              : 'bg-white/10 text-white/60'
                          }`}>
                            {person.matchScore}% match
                          </span>
                        </div>

                        {person.location && (
                          <p className="text-sm text-white/50 flex items-center gap-1 mt-1">
                            <span>📍</span> {person.location}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* About */}
                    {person.about_me && (
                      <p className="text-sm text-white/70 mt-4 line-clamp-2">
                        {person.about_me}
                      </p>
                    )}

                    {/* Looking for */}
                    {person.looking_for && (
                      <div className="mt-3">
                        <p className="text-xs text-white/40 mb-1">Looking to meet</p>
                        <p className="text-sm text-white/60 line-clamp-1">
                          {person.looking_for}
                        </p>
                      </div>
                    )}

                    {/* Interests */}
                    {person.interests?.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mt-4">
                        {person.interests.slice(0, 4).map((interest, idx) => (
                          <span
                            key={idx}
                            className="px-2 py-0.5 bg-white/10 text-white/70 rounded-full text-xs"
                          >
                            {interest}
                          </span>
                        ))}
                        {person.interests.length > 4 && (
                          <span className="px-2 py-0.5 text-white/40 text-xs">
                            +{person.interests.length - 4} more
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Action buttons */}
                  <div className="px-5 pb-5 flex justify-end gap-2">
                    {/* Message button - always visible */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        router.push(`/messages/${person.id}`)
                      }}
                      className="px-4 py-1.5 bg-gradient-to-r from-blue-500 to-purple-500 hover:opacity-90 text-white rounded-full font-medium text-sm transition-all"
                    >
                      Message
                    </button>

                    {/* Connection status button */}
                    {status === 'connected' ? (
                      <button
                        onClick={(e) => e.stopPropagation()}
                        className="px-4 py-1.5 bg-white/10 text-white/60 rounded-full font-medium text-sm flex items-center gap-1"
                      >
                        <svg className="w-3.5 h-3.5 text-green-400" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        Connected
                      </button>
                    ) : status === 'pending' ? (
                      <button
                        onClick={(e) => e.stopPropagation()}
                        className="px-4 py-1.5 bg-white/10 text-white/40 rounded-full font-medium text-sm"
                      >
                        Pending
                      </button>
                    ) : (
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          handleConnect(person.id)
                        }}
                        className="px-4 py-1.5 bg-white/10 hover:bg-white/20 text-white/80 rounded-full font-medium text-sm transition-colors"
                      >
                        Connect
                      </button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </main>
    </AppShell>
  )
}
