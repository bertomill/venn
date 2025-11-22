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
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-lg text-gray-600">Finding your matches...</div>
      </div>
    )
  }

  const currentMatch = matches[currentIndex]

  if (!currentMatch) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-6">
        <div className="text-center max-w-md">
          <div className="text-6xl mb-4">🎉</div>
          <h2 className="text-2xl font-bold text-gray-900 mb-3">
            You've seen all matches!
          </h2>
          <p className="text-gray-600 mb-6">
            Check back later for new people to connect with
          </p>
          <button
            onClick={() => router.push('/dashboard')}
            className="px-6 py-3 bg-blue-600 text-white rounded-full font-semibold hover:bg-blue-700"
          >
            Go to Dashboard
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <button
            onClick={() => router.push('/dashboard')}
            className="text-blue-600 font-medium hover:text-blue-700"
          >
            ← Back
          </button>
          <h1 className="text-xl font-semibold text-gray-900">Discover</h1>
          <div className="w-16"></div>
        </div>
      </div>

      {/* Match Card */}
      <div className="max-w-md mx-auto px-6 py-12">
        <div className="bg-white rounded-3xl shadow-2xl overflow-hidden">
          {/* Avatar */}
          <div className="relative h-96 bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center">
            {currentMatch.avatar_url ? (
              <img
                src={currentMatch.avatar_url}
                alt={currentMatch.full_name}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="text-9xl font-bold text-white">
                {currentMatch.full_name?.[0] || '?'}
              </div>
            )}

            {/* Match Score Badge */}
            <div className="absolute top-6 right-6 bg-white rounded-full px-4 py-2 shadow-lg">
              <span className="text-2xl font-bold text-blue-600">
                {currentMatch.match_score}%
              </span>
              <span className="text-sm text-gray-600 ml-1">match</span>
            </div>
          </div>

          {/* Info */}
          <div className="p-8">
            <h2 className="text-3xl font-bold text-gray-900 mb-2">
              {currentMatch.full_name}
            </h2>

            {currentMatch.location && (
              <p className="text-gray-500 mb-4 flex items-center gap-2">
                <span>📍</span> {currentMatch.location}
              </p>
            )}

            {currentMatch.bio && (
              <p className="text-gray-700 mb-6 leading-relaxed">
                {currentMatch.bio}
              </p>
            )}

            {/* Shared Interests */}
            {currentMatch.shared_interests.length > 0 && (
              <div className="mb-6">
                <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
                  Shared Interests
                </h3>
                <div className="flex flex-wrap gap-2">
                  {currentMatch.shared_interests.map((interest, idx) => (
                    <span
                      key={idx}
                      className="px-4 py-2 bg-blue-100 text-blue-700 rounded-full text-sm font-medium"
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
            className="flex-1 py-4 bg-gray-100 text-gray-700 rounded-2xl font-semibold text-lg hover:bg-gray-200 transition-all"
          >
            Skip
          </button>
          <button
            onClick={() => handleConnect(currentMatch.id)}
            className="flex-1 py-4 bg-blue-600 text-white rounded-2xl font-semibold text-lg hover:bg-blue-700 transition-all shadow-lg hover:shadow-xl"
          >
            Connect
          </button>
        </div>

        {/* Progress */}
        <div className="text-center mt-6 text-gray-500 text-sm">
          {currentIndex + 1} of {matches.length} matches
        </div>
      </div>
    </div>
  )
}
