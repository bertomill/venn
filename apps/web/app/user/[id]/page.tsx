'use client'

import { useEffect, useState } from 'react'
import { createSupabaseBrowserClient } from '@/lib/supabase-browser'
import { useRouter, useParams } from 'next/navigation'

interface Profile {
  id: string
  full_name: string | null
  bio: string | null
  location: string | null
  avatar_url: string | null
  about_me: string | null
  looking_for: string | null
  event_size_preference: string[] | null
  event_vibe: string[] | null
  twitter_handle: string | null
  linkedin_url: string | null
  instagram_handle: string | null
  website_url: string | null
}

interface Interest {
  id: string
  name: string
  category: string
}

type ConnectionStatus = 'none' | 'pending_sent' | 'pending_received' | 'accepted'

export default function UserProfilePage() {
  const router = useRouter()
  const params = useParams()
  const userId = params.id as string

  const [currentUser, setCurrentUser] = useState<any>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [interests, setInterests] = useState<Interest[]>([])
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('none')
  const [connectionId, setConnectionId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(false)
  const [mutualFriendsCount, setMutualFriendsCount] = useState(0)
  const supabase = createSupabaseBrowserClient()

  useEffect(() => {
    if (userId) {
      checkCurrentUser()
    }
  }, [userId])

  const checkCurrentUser = async () => {
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      router.push('/auth/login')
      return
    }

    // Redirect if viewing own profile
    if (user.id === userId) {
      router.push('/profile')
      return
    }

    setCurrentUser(user)
    await Promise.all([
      fetchProfile(),
      fetchInterests(),
      fetchConnectionStatus(user.id),
      fetchMutualFriends(user.id)
    ])
    setLoading(false)
  }

  const fetchProfile = async () => {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single()

    if (error) {
      console.error('Error fetching profile:', error)
      return
    }

    setProfile(data)
  }

  const fetchInterests = async () => {
    const { data, error } = await supabase
      .from('user_interests')
      .select('interest_id, interests(id, name, category)')
      .eq('user_id', userId)

    if (error) {
      console.error('Error fetching interests:', error)
      return
    }

    const userInterests = data
      ?.map((item: any) => item.interests)
      .filter(Boolean) as Interest[]
    setInterests(userInterests || [])
  }

  const fetchConnectionStatus = async (currentUserId: string) => {
    // Check if there's a connection between current user and this profile
    const { data, error } = await supabase
      .from('connections')
      .select('*')
      .or(`and(user1_id.eq.${currentUserId},user2_id.eq.${userId}),and(user1_id.eq.${userId},user2_id.eq.${currentUserId})`)
      .single()

    if (error && error.code !== 'PGRST116') {
      console.error('Error fetching connection:', error)
      return
    }

    if (data) {
      const typedData = data as { id: string; status: string; user1_id: string; user2_id: string }
      setConnectionId(typedData.id)
      if (typedData.status === 'accepted') {
        setConnectionStatus('accepted')
      } else if (typedData.status === 'pending') {
        if (typedData.user1_id === currentUserId) {
          setConnectionStatus('pending_sent')
        } else {
          setConnectionStatus('pending_received')
        }
      }
    } else {
      setConnectionStatus('none')
    }
  }

  const fetchMutualFriends = async (currentUserId: string) => {
    // Get current user's friends
    const { data: myConnections } = await supabase
      .from('connections')
      .select('user1_id, user2_id')
      .or(`user1_id.eq.${currentUserId},user2_id.eq.${currentUserId}`)
      .eq('status', 'accepted')

    // Get profile user's friends
    const { data: theirConnections } = await supabase
      .from('connections')
      .select('user1_id, user2_id')
      .or(`user1_id.eq.${userId},user2_id.eq.${userId}`)
      .eq('status', 'accepted')

    if (!myConnections || !theirConnections) return

    type Connection = { user1_id: string; user2_id: string }
    const typedMyConnections = myConnections as Connection[]
    const typedTheirConnections = theirConnections as Connection[]

    const myFriends = new Set(
      typedMyConnections.map(c => c.user1_id === currentUserId ? c.user2_id : c.user1_id)
    )
    const theirFriends = new Set(
      typedTheirConnections.map(c => c.user1_id === userId ? c.user2_id : c.user1_id)
    )

    // Count mutual friends
    let mutual = 0
    myFriends.forEach(id => {
      if (theirFriends.has(id)) mutual++
    })
    setMutualFriendsCount(mutual)
  }

  const sendFriendRequest = async () => {
    if (!currentUser) return
    setActionLoading(true)

    const { data, error } = await supabase
      .from('connections')
      .insert({
        user1_id: currentUser.id,
        user2_id: userId,
        status: 'pending'
      } as never)
      .select()
      .single()

    if (error) {
      console.error('Error sending friend request:', error)
      setActionLoading(false)
      return
    }

    const typedData = data as { id: string }
    setConnectionId(typedData.id)
    setConnectionStatus('pending_sent')
    setActionLoading(false)
  }

  const cancelFriendRequest = async () => {
    if (!connectionId) return
    setActionLoading(true)

    const { error } = await supabase
      .from('connections')
      .delete()
      .eq('id', connectionId)

    if (error) {
      console.error('Error canceling request:', error)
      setActionLoading(false)
      return
    }

    setConnectionId(null)
    setConnectionStatus('none')
    setActionLoading(false)
  }

  const acceptFriendRequest = async () => {
    if (!connectionId) return
    setActionLoading(true)

    const { error } = await supabase
      .from('connections')
      .update({ status: 'accepted' } as never)
      .eq('id', connectionId)

    if (error) {
      console.error('Error accepting request:', error)
      setActionLoading(false)
      return
    }

    setConnectionStatus('accepted')
    setActionLoading(false)
  }

  const declineFriendRequest = async () => {
    if (!connectionId) return
    setActionLoading(true)

    const { error } = await supabase
      .from('connections')
      .delete()
      .eq('id', connectionId)

    if (error) {
      console.error('Error declining request:', error)
      setActionLoading(false)
      return
    }

    setConnectionId(null)
    setConnectionStatus('none')
    setActionLoading(false)
  }

  const removeFriend = async () => {
    if (!connectionId) return

    const confirmed = window.confirm('Are you sure you want to remove this friend?')
    if (!confirmed) return

    setActionLoading(true)

    const { error } = await supabase
      .from('connections')
      .delete()
      .eq('id', connectionId)

    if (error) {
      console.error('Error removing friend:', error)
      setActionLoading(false)
      return
    }

    setConnectionId(null)
    setConnectionStatus('none')
    setActionLoading(false)
  }

  const getInitials = (name: string | null) => {
    if (!name) return '?'
    return name[0].toUpperCase()
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
        <div className="text-lg text-white/60">Loading...</div>
      </div>
    )
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex flex-col items-center justify-center">
        <div className="text-xl text-white mb-4">User not found</div>
        <button
          onClick={() => router.back()}
          className="text-purple-400 hover:text-purple-300"
        >
          Go back
        </button>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] pb-24">
      {/* Header with Gradient Background */}
      <header className="relative">
        {/* Gradient Background */}
        <div className="h-48 bg-gradient-to-br from-purple-500 via-pink-500 to-orange-500 relative">
          <div className="absolute inset-0 bg-gradient-to-b from-transparent to-[#0a0a0a]" />

          {/* Back Button */}
          <button
            onClick={() => router.back()}
            className="absolute top-4 left-4 w-10 h-10 bg-black/30 backdrop-blur-sm rounded-full flex items-center justify-center text-white"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
        </div>

        {/* Profile Avatar and Info */}
        <div className="relative -mt-20 px-6">
          <div className="flex flex-col items-center">
            {/* Avatar */}
            <div className="w-32 h-32 rounded-full bg-gradient-to-br from-pink-400 via-purple-500 to-blue-600 flex items-center justify-center text-white text-5xl font-bold shadow-2xl border-4 border-[#0a0a0a] overflow-hidden">
              {profile.avatar_url ? (
                <img
                  src={profile.avatar_url}
                  alt={profile.full_name || '?'}
                  className="w-full h-full rounded-full object-cover"
                />
              ) : (
                getInitials(profile.full_name)
              )}
            </div>

            {/* Name */}
            <h1 className="text-3xl font-bold text-white mt-4">
              {profile.full_name || 'Anonymous User'}
            </h1>

            {/* Mutual Friends */}
            {mutualFriendsCount > 0 && (
              <p className="text-white/60 mt-1">
                {mutualFriendsCount} mutual friend{mutualFriendsCount !== 1 ? 's' : ''}
              </p>
            )}

            {/* Connection Button */}
            <div className="mt-4 flex gap-3">
              {connectionStatus === 'none' && (
                <button
                  onClick={sendFriendRequest}
                  disabled={actionLoading}
                  className="px-6 py-2.5 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-xl font-semibold hover:opacity-90 transition-all disabled:opacity-50 flex items-center gap-2"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                  </svg>
                  {actionLoading ? 'Sending...' : 'Add Friend'}
                </button>
              )}

              {connectionStatus === 'pending_sent' && (
                <button
                  onClick={cancelFriendRequest}
                  disabled={actionLoading}
                  className="px-6 py-2.5 bg-white/10 border border-white/20 text-white rounded-xl font-semibold hover:bg-white/20 transition-all disabled:opacity-50 flex items-center gap-2"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  {actionLoading ? 'Canceling...' : 'Request Sent'}
                </button>
              )}

              {connectionStatus === 'pending_received' && (
                <>
                  <button
                    onClick={acceptFriendRequest}
                    disabled={actionLoading}
                    className="px-6 py-2.5 bg-green-500 text-white rounded-xl font-semibold hover:bg-green-600 transition-all disabled:opacity-50"
                  >
                    {actionLoading ? 'Accepting...' : 'Accept'}
                  </button>
                  <button
                    onClick={declineFriendRequest}
                    disabled={actionLoading}
                    className="px-6 py-2.5 bg-white/10 border border-white/20 text-white rounded-xl font-semibold hover:bg-white/20 transition-all disabled:opacity-50"
                  >
                    Decline
                  </button>
                </>
              )}

              {connectionStatus === 'accepted' && (
                <>
                  <button
                    onClick={() => router.push(`/messages/${userId}`)}
                    className="px-6 py-2.5 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-xl font-semibold hover:opacity-90 transition-all flex items-center gap-2"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                    </svg>
                    Message
                  </button>
                  <button
                    onClick={removeFriend}
                    disabled={actionLoading}
                    className="px-6 py-2.5 bg-white/10 border border-white/20 text-white rounded-xl font-semibold hover:bg-white/20 transition-all disabled:opacity-50 flex items-center gap-2"
                  >
                    <svg className="w-5 h-5 text-green-400" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Friends
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="px-6 mt-8">
        {/* About Section */}
        <section className="mb-6">
          <h2 className="text-2xl font-bold text-white mb-4">About</h2>

          <div className="bg-white/5 border border-white/10 rounded-2xl p-5 space-y-5">
            {/* About Me */}
            {profile.about_me && (
              <div>
                <h3 className="text-sm font-semibold text-white/60 mb-2">About</h3>
                <p className="text-white/90">{profile.about_me}</p>
              </div>
            )}

            {/* Looking For */}
            {profile.looking_for && (
              <div>
                <h3 className="text-sm font-semibold text-white/60 mb-2">Looking to meet</h3>
                <p className="text-white/90">{profile.looking_for}</p>
              </div>
            )}

            {/* Interests */}
            {interests.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold text-white/60 mb-2">Interests</h3>
                <div className="flex flex-wrap gap-2">
                  {interests.map((interest) => (
                    <span
                      key={interest.id}
                      className="px-3 py-1 bg-purple-500/20 border border-purple-500/30 text-purple-300 rounded-full text-sm"
                    >
                      {interest.name}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Event Preferences */}
            {(profile.event_size_preference?.length || profile.event_vibe?.length) && (
              <div>
                <h3 className="text-sm font-semibold text-white/60 mb-2">Event Preferences</h3>
                <div className="flex flex-wrap gap-2">
                  {profile.event_size_preference?.map((size) => (
                    <span
                      key={size}
                      className="px-3 py-1 bg-blue-500/20 border border-blue-500/30 text-blue-300 rounded-full text-sm capitalize"
                    >
                      {size} events
                    </span>
                  ))}
                  {profile.event_vibe?.map((vibe) => (
                    <span
                      key={vibe}
                      className="px-3 py-1 bg-green-500/20 border border-green-500/30 text-green-300 rounded-full text-sm capitalize"
                    >
                      {vibe}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Empty state */}
            {!profile.about_me && !profile.looking_for && interests.length === 0 && !profile.event_size_preference?.length && !profile.event_vibe?.length && (
              <p className="text-white/40 italic">No information available</p>
            )}
          </div>
        </section>

        {/* Socials Section */}
        {(profile.twitter_handle || profile.linkedin_url || profile.instagram_handle || profile.website_url) && (
          <section className="mb-6">
            <h2 className="text-2xl font-bold text-white mb-4">Socials</h2>

            <div className="grid grid-cols-2 gap-3">
              {profile.twitter_handle && (
                <a
                  href={`https://twitter.com/${profile.twitter_handle}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="bg-white/5 border border-white/10 rounded-xl p-4 flex items-center gap-3 hover:bg-white/10 transition-all"
                >
                  <div className="w-10 h-10 bg-black rounded-lg flex items-center justify-center">
                    <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                    </svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-white/60">Twitter</p>
                    <p className="text-white font-medium truncate">@{profile.twitter_handle}</p>
                  </div>
                </a>
              )}

              {profile.linkedin_url && (
                <a
                  href={profile.linkedin_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="bg-white/5 border border-white/10 rounded-xl p-4 flex items-center gap-3 hover:bg-white/10 transition-all"
                >
                  <div className="w-10 h-10 bg-[#0A66C2] rounded-lg flex items-center justify-center">
                    <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
                    </svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-white/60">LinkedIn</p>
                    <p className="text-white font-medium truncate">Profile</p>
                  </div>
                </a>
              )}

              {profile.instagram_handle && (
                <a
                  href={`https://instagram.com/${profile.instagram_handle}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="bg-white/5 border border-white/10 rounded-xl p-4 flex items-center gap-3 hover:bg-white/10 transition-all"
                >
                  <div className="w-10 h-10 bg-gradient-to-br from-purple-600 via-pink-500 to-orange-400 rounded-lg flex items-center justify-center">
                    <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
                    </svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-white/60">Instagram</p>
                    <p className="text-white font-medium truncate">@{profile.instagram_handle}</p>
                  </div>
                </a>
              )}

              {profile.website_url && (
                <a
                  href={profile.website_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="bg-white/5 border border-white/10 rounded-xl p-4 flex items-center gap-3 hover:bg-white/10 transition-all"
                >
                  <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
                    </svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-white/60">Website</p>
                    <p className="text-white font-medium truncate">{profile.website_url.replace(/^https?:\/\//, '')}</p>
                  </div>
                </a>
              )}
            </div>
          </section>
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
              <svg className="w-6 h-6 text-white/40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
              <span className="text-xs text-white/40">Profile</span>
            </button>
          </div>
        </div>
      </nav>
    </div>
  )
}
