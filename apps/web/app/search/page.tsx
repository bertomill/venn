'use client'

import { useEffect, useState, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { createSupabaseBrowserClient } from '@/lib/supabase-browser'
import AppShell from '@/components/AppShell'

interface AppShellProfile {
  id: string
  full_name: string
  avatar_url?: string
}

interface SearchProfile {
  id: string
  full_name: string | null
  avatar_url: string | null
  about_me: string | null
  looking_for: string | null
  hobbies: string[] | null
  professional_background: string | null
}

interface Event {
  id: string
  title: string
  description: string | null
  start_date: string
  location: string | null
  image_url: string | null
  creator: SearchProfile | null
}

interface SearchResult {
  type: 'person' | 'event'
  data: SearchProfile | Event
  relevance: number
}

function SearchContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const query = searchParams.get('q') || ''

  const [results, setResults] = useState<SearchResult[]>([])
  const [loading, setLoading] = useState(true)
  const [profile, setProfile] = useState<AppShellProfile | null>(null)
  const [searchType, setSearchType] = useState<'all' | 'people' | 'events'>('all')
  const supabase = createSupabaseBrowserClient()

  useEffect(() => {
    checkUser()
  }, [])

  useEffect(() => {
    if (query) {
      performSearch()
    }
  }, [query, searchType])

  const checkUser = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      router.push('/auth/login')
      return
    }

    const { data } = await supabase
      .from('profiles')
      .select('id, full_name, avatar_url')
      .eq('id', user.id)
      .single()

    if (data) {
      setProfile({
        id: data.id,
        full_name: data.full_name || 'User',
        avatar_url: data.avatar_url || undefined
      })
    }
  }

  const performSearch = async () => {
    setLoading(true)
    const searchResults: SearchResult[] = []
    const searchTerms = query.toLowerCase().split(' ').filter(t => t.length > 2)

    // Search people
    if (searchType === 'all' || searchType === 'people') {
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url, about_me, looking_for, hobbies, professional_background')
        .limit(20)

      if (profiles) {
        profiles.forEach((p: SearchProfile) => {
          const searchableText = [
            p.full_name,
            p.about_me,
            p.looking_for,
            p.professional_background,
            ...(p.hobbies || [])
          ].filter(Boolean).join(' ').toLowerCase()

          const relevance = searchTerms.reduce((score, term) => {
            return score + (searchableText.includes(term) ? 1 : 0)
          }, 0)

          if (relevance > 0 || searchTerms.length === 0) {
            searchResults.push({
              type: 'person',
              data: p,
              relevance
            })
          }
        })
      }
    }

    // Search events
    if (searchType === 'all' || searchType === 'events') {
      const { data: events } = await supabase
        .from('events')
        .select(`
          id, title, description, start_date, location, image_url,
          creator:profiles!events_creator_id_fkey(id, full_name, avatar_url)
        `)
        .gte('start_date', new Date().toISOString())
        .limit(20)

      if (events) {
        events.forEach((e: any) => {
          const searchableText = [
            e.title,
            e.description,
            e.location
          ].filter(Boolean).join(' ').toLowerCase()

          const relevance = searchTerms.reduce((score, term) => {
            return score + (searchableText.includes(term) ? 1 : 0)
          }, 0)

          if (relevance > 0 || searchTerms.length === 0) {
            searchResults.push({
              type: 'event',
              data: e,
              relevance
            })
          }
        })
      }
    }

    // Sort by relevance
    searchResults.sort((a, b) => b.relevance - a.relevance)
    setResults(searchResults)
    setLoading(false)
  }

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push('/')
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit'
    })
  }

  const getInitials = (name: string | null) => {
    if (!name) return '?'
    return name[0].toUpperCase()
  }

  const peopleResults = results.filter(r => r.type === 'person')
  const eventResults = results.filter(r => r.type === 'event')

  return (
    <AppShell profile={profile} onSignOut={handleSignOut}>
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Search Header */}
        <div className="mb-8">
          <button
            onClick={() => router.push('/dashboard')}
            className="flex items-center gap-2 text-white/60 hover:text-white mb-4 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            <span>Back to Dashboard</span>
          </button>

          <h1 className="text-3xl font-bold text-white mb-2">Search Results</h1>
          <p className="text-white/60">
            Showing results for: <span className="text-white">&quot;{query}&quot;</span>
          </p>
        </div>

        {/* Filter Tabs */}
        <div className="flex gap-2 mb-8">
          {(['all', 'people', 'events'] as const).map((type) => (
            <button
              key={type}
              onClick={() => setSearchType(type)}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                searchType === type
                  ? 'bg-white text-black'
                  : 'bg-white/5 text-white/60 hover:bg-white/10 hover:text-white'
              }`}
            >
              {type === 'all' ? 'All' : type === 'people' ? `People (${peopleResults.length})` : `Events (${eventResults.length})`}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="flex items-center gap-3 text-white/60">
              <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              <span>Searching...</span>
            </div>
          </div>
        ) : results.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-10 h-10 text-white/20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <h2 className="text-xl font-semibold text-white mb-2">No results found</h2>
            <p className="text-white/60">Try adjusting your search terms</p>
          </div>
        ) : (
          <div className="space-y-8">
            {/* People Results */}
            {(searchType === 'all' || searchType === 'people') && peopleResults.length > 0 && (
              <div>
                {searchType === 'all' && (
                  <h2 className="text-lg font-semibold text-white mb-4">People</h2>
                )}
                <div className="grid gap-4 sm:grid-cols-2">
                  {peopleResults.map((result) => {
                    const person = result.data as SearchProfile
                    return (
                      <button
                        key={person.id}
                        onClick={() => router.push(`/user/${person.id}`)}
                        className="bg-white/5 border border-white/10 rounded-2xl p-5 text-left hover:bg-white/[0.07] hover:border-white/20 transition-all"
                      >
                        <div className="flex items-start gap-4">
                          <div className="w-14 h-14 rounded-full bg-gradient-to-br from-pink-500 to-orange-400 flex items-center justify-center text-white font-bold text-lg flex-shrink-0 overflow-hidden">
                            {person.avatar_url ? (
                              <img
                                src={person.avatar_url}
                                alt={person.full_name || ''}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              getInitials(person.full_name)
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <h3 className="font-semibold text-white truncate">
                              {person.full_name || 'Anonymous'}
                            </h3>
                            {person.professional_background && (
                              <p className="text-white/50 text-sm truncate mt-0.5">
                                {person.professional_background}
                              </p>
                            )}
                            {person.about_me && (
                              <p className="text-white/60 text-sm mt-2 line-clamp-2">
                                {person.about_me}
                              </p>
                            )}
                            {person.hobbies && person.hobbies.length > 0 && (
                              <div className="flex flex-wrap gap-1.5 mt-3">
                                {person.hobbies.slice(0, 3).map((hobby, i) => (
                                  <span
                                    key={i}
                                    className="px-2 py-0.5 bg-blue-500/20 text-blue-300 rounded-full text-xs"
                                  >
                                    {hobby}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      </button>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Events Results */}
            {(searchType === 'all' || searchType === 'events') && eventResults.length > 0 && (
              <div>
                {searchType === 'all' && (
                  <h2 className="text-lg font-semibold text-white mb-4">Events</h2>
                )}
                <div className="grid gap-4 sm:grid-cols-2">
                  {eventResults.map((result) => {
                    const event = result.data as Event
                    return (
                      <button
                        key={event.id}
                        onClick={() => router.push(`/events/${event.id}`)}
                        className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden text-left hover:bg-white/[0.07] hover:border-white/20 transition-all"
                      >
                        {event.image_url && (
                          <div className="h-32 bg-white/5">
                            <img
                              src={event.image_url}
                              alt={event.title}
                              className="w-full h-full object-cover"
                            />
                          </div>
                        )}
                        <div className="p-5">
                          <div className="flex items-center gap-2 text-white/50 text-sm mb-2">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                            <span>{formatDate(event.start_date)}</span>
                          </div>
                          <h3 className="font-semibold text-white mb-1">{event.title}</h3>
                          {event.location && (
                            <p className="text-white/50 text-sm flex items-center gap-1.5">
                              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                              </svg>
                              {event.location}
                            </p>
                          )}
                          {event.description && (
                            <p className="text-white/60 text-sm mt-2 line-clamp-2">
                              {event.description}
                            </p>
                          )}
                        </div>
                      </button>
                    )
                  })}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </AppShell>
  )
}

export default function SearchPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
        <div className="text-lg text-white/60">Loading...</div>
      </div>
    }>
      <SearchContent />
    </Suspense>
  )
}
