'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

interface UserMatch {
  id: string
  full_name: string
  bio: string
  location: string
  avatar_url: string | null
  shared_interests: string[]
  match_score: number
}

export default function DiscoverPage() {
  const router = useRouter()
  const [matches, setMatches] = useState<UserMatch[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<any>(null)

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
    await fetchMatches(user.id)
  }

  const fetchMatches = async (userId: string) => {
    try {
      // Get user's interests
      const { data: userInterests } = await supabase
        .from('user_interests')
        .select('interest_id, interests(name)')
        .eq('user_id', userId)

      const userInterestIds = userInterests?.map(ui => ui.interest_id) || []

      // Get all other users with their interests
      const { data: otherUsers } = await supabase
        .from('profiles')
        .select(`
          id,
          full_name,
          bio,
          location,
          avatar_url
        `)
        .neq('id', userId)
        .not('full_name', 'is', null)

      if (!otherUsers) {
        setLoading(false)
        return
      }

      // For each user, get their interests and calculate match score
      const matchPromises = otherUsers.map(async (otherUser) => {
        const { data: theirInterests } = await supabase
          .from('user_interests')
          .select('interest_id, interests(name)')
          .eq('user_id', otherUser.id)

        const theirInterestIds = theirInterests?.map(ui => ui.interest_id) || []

        // Find shared interests
        const shared = userInterestIds.filter(id => theirInterestIds.includes(id))
        const sharedInterestNames = theirInterests
          ?.filter(ti => shared.includes(ti.interest_id))
          .map(ti => (ti.interests as any)?.name || '') || []

        // Calculate match score (0-100)
        const matchScore = shared.length > 0
          ? Math.round((shared.length / Math.max(userInterestIds.length, theirInterestIds.length)) * 100)
          : 0

        return {
          ...otherUser,
          shared_interests: sharedInterestNames,
          match_score: matchScore
        }
      })

      const allMatches = await Promise.all(matchPromises)

      // Sort by match score and filter out users with no shared interests
      const sortedMatches = allMatches
        .filter(m => m.match_score > 0)
        .sort((a, b) => b.match_score - a.match_score)

      setMatches(sortedMatches)
      setLoading(false)
    } catch (error) {
      console.error('Error fetching matches:', error)
      setLoading(false)
    }
  }

  const handleConnect = async (matchId: string) => {
    if (!user) return

    try {
      await supabase
        .from('connections')
        .insert({
          user1_id: user.id,
          user2_id: matchId,
          status: 'pending'
        })

      // Move to next match
      setCurrentIndex(prev => prev + 1)
    } catch (error) {
      console.error('Error connecting:', error)
    }
  }

  const handleSkip = () => {
    setCurrentIndex(prev => prev + 1)
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0a0a0a]">
        <div className="text-lg text-white/60">Finding your matches...</div>
      </div>
    )
  }

  const currentMatch = matches[currentIndex]

  if (!currentMatch) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0a0a0a] px-6">
        <div className="text-center max-w-md">
          <div className="text-6xl mb-4">🎉</div>
          <h2 className="text-2xl font-bold text-white mb-3">
            You've seen all matches!
          </h2>
          <p className="text-white/60 mb-6">
            Check back later for new people to connect with
          </p>
          <button
            onClick={() => router.push('/dashboard')}
            className="px-6 py-3 bg-white text-black rounded-full font-semibold hover:bg-white/90 transition-all"
          >
            Go to Dashboard
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] pb-24">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-black/40 backdrop-blur-xl border-b border-white/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <button
              onClick={() => router.push('/dashboard')}
              className="text-white/60 hover:text-white text-sm flex items-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Back
            </button>
            <h1 className="text-xl font-bold text-white">Discover</h1>
            <div className="w-16"></div>
          </div>
        </div>
      </header>

      {/* Match Card */}
      <div className="max-w-md mx-auto px-6 py-12">
        <div className="bg-white/10 border border-white/20 backdrop-blur-md rounded-3xl overflow-hidden shadow-2xl">
          {/* Avatar */}
          <div className="relative aspect-[3/4] bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 flex items-center justify-center">
            {currentMatch.avatar_url ? (
              <img
                src={currentMatch.avatar_url}
                alt={currentMatch.full_name}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="text-9xl font-bold text-white drop-shadow-lg">
                {currentMatch.full_name?.[0]?.toLowerCase() || '?'}
              </div>
            )}

            {/* Match Score Badge */}
            <div className="absolute top-6 right-6 bg-white rounded-full px-4 py-2 shadow-lg">
              <span className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                {currentMatch.match_score}%
              </span>
              <span className="text-sm text-gray-600 ml-1">match</span>
            </div>
          </div>

          {/* Info */}
          <div className="p-6">
            <h2 className="text-3xl font-bold text-white mb-2">
              {currentMatch.full_name}
            </h2>

            {currentMatch.location && (
              <p className="text-white/60 mb-4 flex items-center gap-2">
                <span>📍</span> {currentMatch.location}
              </p>
            )}

            {currentMatch.bio && (
              <p className="text-white/70 mb-6 leading-relaxed">
                {currentMatch.bio}
              </p>
            )}

            {/* Shared Interests */}
            {currentMatch.shared_interests.length > 0 && (
              <div className="mb-4">
                <h3 className="text-sm font-semibold text-white/50 uppercase tracking-wide mb-3">
                  Shared Interests
                </h3>
                <div className="flex flex-wrap gap-2">
                  {currentMatch.shared_interests.map((interest, idx) => (
                    <span
                      key={idx}
                      className="px-3 py-1.5 bg-blue-500/20 border border-blue-500/30 text-blue-300 rounded-full text-sm font-medium"
                    >
                      {interest}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-4 mt-8">
          <button
            onClick={handleSkip}
            className="flex-1 py-4 bg-white/10 border border-white/20 text-white rounded-2xl font-semibold text-lg hover:bg-white/20 hover:border-white/30 transition-all"
          >
            Skip
          </button>
          <button
            onClick={() => handleConnect(currentMatch.id)}
            className="flex-1 py-4 bg-white text-black rounded-2xl font-semibold text-lg hover:bg-white/90 transition-all shadow-lg"
          >
            Connect
          </button>
        </div>

        {/* Progress */}
        <div className="text-center mt-6 text-white/40 text-sm">
          {currentIndex + 1} of {matches.length}
        </div>
      </div>

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

            <button className="flex flex-col items-center gap-1 px-6 py-2 rounded-full bg-white/10">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              <span className="text-xs text-white font-medium">Discover</span>
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
