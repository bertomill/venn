'use client'

import { useEffect, useState } from 'react'
import { createSupabaseBrowserClient } from '@/lib/supabase-browser'
import { useRouter } from 'next/navigation'
import AppShell from '@/components/AppShell'
import Image from 'next/image'

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

const USE_MOCK = true
const PAGE_SIZE = 20
const MAX_PAGES = 5
const FETCH_LIMIT = PAGE_SIZE * MAX_PAGES

const MOCK_NAMES = [
  'Ava Thompson',
  'Liam Patel',
  'Noah Kim',
  'Emma Garcia',
  'Olivia Brown',
  'Sophia Nguyen',
  'Mason Wright',
  'Ethan Clark',
  'Isabella Diaz',
  'Mia Wilson',
  'Lucas Baker',
  'Amelia Lewis',
  'James Hall',
  'Benjamin Young',
  'Charlotte King',
  'Harper Scott',
  'Elijah Green',
  'Aria Adams',
  'Evelyn Turner',
  'Henry Rivera',
  'Jack Torres',
  'Leo Perez',
  'Chloe Bennett',
  'Zoe Ross',
  'Layla Foster',
  'Nora Howard',
  'Abigail Ward',
  'Hazel Murphy',
  'Caleb Stone',
  'Maya Brooks',
  'Miles Cooper',
  'Scarlett Reed',
  'Penelope Hayes',
  'Wyatt Ellis',
  'Ellie Fisher',
  'Ruby Hart',
  'Parker James',
  'Audrey Lane',
  'Julian Price'
]

const MOCK_INTERESTS = [
  'Running',
  'Yoga',
  'Photography',
  'Cooking',
  'Hiking',
  'Startups',
  'Design',
  'Music',
  'Books',
  'Tech',
  'Art',
  'Meditation',
  'Volunteering',
  'Investing',
  'Board Games',
  'Cycling',
  'Baking',
  'Travel',
  'Film',
  'Gardening'
]

const MOCK_VIBES = ['professional', 'social', 'creative', 'wellness', 'learning']
const MOCK_SIZES = ['Intimate', 'Medium', 'Large', 'Any']

function sample<T>(arr: T[], n: number) {
  const copy = [...arr]
  const out: T[] = []
  while (out.length < n && copy.length) {
    const idx = Math.floor(Math.random() * copy.length)
    out.push(copy.splice(idx, 1)[0])
  }
  return out
}

const getRandom = <T,>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)]

const generateMockUsers = (count: number): SimilarUser[] => {
  return Array.from({ length: count }, (_, index) => {
    const similarity = 0.5 + Math.random() * 0.45
    return {
      id: `mock-${index + 1}`,
      full_name: MOCK_NAMES[index % MOCK_NAMES.length],
      bio: null,
      location: 'Toronto',
      avatar_url: null,
      about_me: `I love ${getRandom(MOCK_INTERESTS).toLowerCase()} meetups around the city.`,
      looking_for: `Looking to meet people into ${getRandom(MOCK_INTERESTS).toLowerCase()}.`,
      event_size_preference: MOCK_SIZES[index % MOCK_SIZES.length],
      event_vibe: sample(MOCK_VIBES, Math.random() > 0.5 ? 2 : 1),
      interests: sample(MOCK_INTERESTS, 4),
      matchScore: Math.round(similarity * 100),
      similarity
    }
  }).sort((a, b) => b.similarity - a.similarity)
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
  const [page, setPage] = useState(1)
  const supabase = createSupabaseBrowserClient()

  const totalPages = Math.max(
    1,
    Math.min(MAX_PAGES, Math.ceil(filteredUsers.length / PAGE_SIZE))
  )
  const currentPageUsers = filteredUsers.slice(
    (page - 1) * PAGE_SIZE,
    page * PAGE_SIZE
  )
  const canConnect = !USE_MOCK

  useEffect(() => {
    if (USE_MOCK) {
      const mock = generateMockUsers(FETCH_LIMIT)
      setUsers(mock)
      setFilteredUsers(mock)
      setLoading(false)
      return
    }

    checkUser()
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
    setPage(1)
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
    if (!canConnect) return
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
          <div className="space-y-2">
            {currentPageUsers.map((person) => {
              const status = canConnect ? getConnectionStatus(person.id) : 'none'
              const topInterests = (person.interests || []).slice(0, 3)
              const topVibes = (person.event_vibe || []).slice(0, 2)

              return (
                <div
                  key={person.id}
                  className="flex flex-col gap-4 bg-white/5 border border-white/10 rounded-2xl p-4 hover:border-white/20 transition-all md:flex-row md:items-center"
                >
                  <div className="flex items-center gap-4 flex-1 min-w-0">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center overflow-hidden text-white font-bold flex-shrink-0">
                      {person.avatar_url ? (
                        <Image
                          src={person.avatar_url}
                          alt={person.full_name || '?'}
                          width={48}
                          height={48}
                          className="w-full h-full rounded-full object-cover"
                          sizes="48px"
                        />
                      ) : (
                        <span>{person.full_name?.[0]?.toUpperCase() || '?'}</span>
                      )}
                    </div>

                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-3">
                        <span className="text-white font-semibold truncate">{person.full_name}</span>
                        {typeof person.matchScore === 'number' && (
                          <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-white/10 text-white/70">
                            {person.matchScore}% match
                          </span>
                        )}
                      </div>
                      <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-white/60">
                        {person.location && <span>📍 {person.location}</span>}
                        {topInterests.map((interest, idx) => (
                          <span key={idx} className="px-2 py-0.5 rounded-full bg-white/10 text-white/70">
                            {interest}
                          </span>
                        ))}
                        {topVibes.map((vibe) => (
                          <span
                            key={vibe}
                            className="px-2 py-0.5 rounded-full bg-green-500/20 border border-green-500/30 text-green-300 capitalize"
                          >
                            {vibe}
                          </span>
                        ))}
                      </div>
                      {person.about_me && (
                        <p className="text-xs text-white/50 mt-2 line-clamp-2">{person.about_me}</p>
                      )}
                    </div>
                  </div>

                  <div className="w-full md:w-40 flex-shrink-0">
                    {canConnect ? (
                      status === 'connected' ? (
                        <button
                          disabled
                          className="w-full py-2 bg-green-500/20 border border-green-500/30 text-green-300 rounded-xl text-sm"
                        >
                          Connected
                        </button>
                      ) : status === 'pending' ? (
                        <button
                          disabled
                          className="w-full py-2 bg-white/10 border border-white/10 text-white/60 rounded-xl text-sm"
                        >
                          Pending
                        </button>
                      ) : (
                        <button
                          onClick={() => handleConnect(person.id)}
                          className="w-full py-2 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-xl text-sm hover:opacity-90"
                        >
                          Connect
                        </button>
                      )
                    ) : (
                      <button
                        disabled
                        className="w-full py-2 bg-white/10 border border-white/10 text-white/60 rounded-xl text-sm cursor-not-allowed"
                        title="Mock data"
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

        {filteredUsers.length > PAGE_SIZE && (
          <div className="mt-6 flex items-center justify-center gap-2 flex-wrap">
            <button
              onClick={() => setPage((prev) => Math.max(1, prev - 1))}
              disabled={page === 1}
              className="px-3 py-1 rounded-lg bg-white/10 text-white/80 disabled:opacity-40"
            >
              Prev
            </button>

            {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNumber) => (
              <button
                key={pageNumber}
                onClick={() => setPage(pageNumber)}
                className={`px-3 py-1 rounded-lg ${
                  pageNumber === page ? 'bg-white text-black' : 'bg-white/10 text-white/80'
                }`}
              >
                {pageNumber}
              </button>
            ))}

            <button
              onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
              disabled={page === totalPages}
              className="px-3 py-1 rounded-lg bg-white/10 text-white/80 disabled:opacity-40"
            >
              Next
            </button>
          </div>
        )}
      </main>
    </AppShell>
  )
}
