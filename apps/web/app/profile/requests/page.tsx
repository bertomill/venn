'use client'

import { useEffect, useState } from 'react'
import { createSupabaseBrowserClient } from '@/lib/supabase-browser'
import { useRouter } from 'next/navigation'

interface Profile {
  id: string
  full_name: string | null
  avatar_url: string | null
  about_me: string | null
}

interface ConnectionRequest {
  id: string
  user1_id: string
  user2_id: string
  status: string
  created_at: string
  profile: Profile
}

export default function FriendRequestsPage() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [incomingRequests, setIncomingRequests] = useState<ConnectionRequest[]>([])
  const [outgoingRequests, setOutgoingRequests] = useState<ConnectionRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'incoming' | 'outgoing'>('incoming')
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
    await fetchRequests(user.id)
    setLoading(false)
  }

  const fetchRequests = async (userId: string) => {
    // Fetch incoming requests (where current user is user2_id and status is pending)
    const { data: incoming, error: incomingError } = await supabase
      .from('connections')
      .select('*')
      .eq('user2_id', userId)
      .eq('status', 'pending')

    if (incomingError) {
      console.error('Error fetching incoming requests:', incomingError)
    }

    // Fetch outgoing requests (where current user is user1_id and status is pending)
    const { data: outgoing, error: outgoingError } = await supabase
      .from('connections')
      .select('*')
      .eq('user1_id', userId)
      .eq('status', 'pending')

    if (outgoingError) {
      console.error('Error fetching outgoing requests:', outgoingError)
    }

    // Get profiles for incoming requests
    if (incoming && incoming.length > 0) {
      const incomingUserIds = incoming.map(r => r.user1_id)
      const { data: incomingProfiles } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url, about_me')
        .in('id', incomingUserIds)

      const incomingWithProfiles = incoming.map(request => ({
        ...request,
        profile: incomingProfiles?.find(p => p.id === request.user1_id) || {
          id: request.user1_id,
          full_name: null,
          avatar_url: null,
          about_me: null
        }
      }))
      setIncomingRequests(incomingWithProfiles)
    }

    // Get profiles for outgoing requests
    if (outgoing && outgoing.length > 0) {
      const outgoingUserIds = outgoing.map(r => r.user2_id)
      const { data: outgoingProfiles } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url, about_me')
        .in('id', outgoingUserIds)

      const outgoingWithProfiles = outgoing.map(request => ({
        ...request,
        profile: outgoingProfiles?.find(p => p.id === request.user2_id) || {
          id: request.user2_id,
          full_name: null,
          avatar_url: null,
          about_me: null
        }
      }))
      setOutgoingRequests(outgoingWithProfiles)
    }
  }

  const acceptRequest = async (request: ConnectionRequest) => {
    const { error } = await supabase
      .from('connections')
      .update({ status: 'accepted' })
      .eq('id', request.id)

    if (error) {
      console.error('Error accepting request:', error)
      return
    }

    // Remove from incoming requests
    setIncomingRequests(prev => prev.filter(r => r.id !== request.id))
  }

  const declineRequest = async (request: ConnectionRequest) => {
    const { error } = await supabase
      .from('connections')
      .delete()
      .eq('id', request.id)

    if (error) {
      console.error('Error declining request:', error)
      return
    }

    // Remove from incoming requests
    setIncomingRequests(prev => prev.filter(r => r.id !== request.id))
  }

  const cancelRequest = async (request: ConnectionRequest) => {
    const { error } = await supabase
      .from('connections')
      .delete()
      .eq('id', request.id)

    if (error) {
      console.error('Error canceling request:', error)
      return
    }

    // Remove from outgoing requests
    setOutgoingRequests(prev => prev.filter(r => r.id !== request.id))
  }

  const getInitials = (name: string | null) => {
    if (!name) return '?'
    return name[0].toUpperCase()
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

    if (diffDays === 0) return 'Today'
    if (diffDays === 1) return 'Yesterday'
    if (diffDays < 7) return `${diffDays} days ago`
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
        <div className="text-lg text-white/60">Loading...</div>
      </div>
    )
  }

  const currentRequests = activeTab === 'incoming' ? incomingRequests : outgoingRequests

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
          <h1 className="text-xl font-bold text-white">Friend Requests</h1>
        </div>

        {/* Tabs */}
        <div className="px-4 pb-4 flex gap-2">
          <button
            onClick={() => setActiveTab('incoming')}
            className={`flex-1 py-2.5 px-4 rounded-xl text-sm font-medium transition-all ${
              activeTab === 'incoming'
                ? 'bg-white text-black'
                : 'bg-white/10 text-white/60 hover:text-white hover:bg-white/20'
            }`}
          >
            Incoming
            {incomingRequests.length > 0 && (
              <span className={`ml-2 px-2 py-0.5 rounded-full text-xs ${
                activeTab === 'incoming' ? 'bg-black/20' : 'bg-pink-500/30 text-pink-300'
              }`}>
                {incomingRequests.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('outgoing')}
            className={`flex-1 py-2.5 px-4 rounded-xl text-sm font-medium transition-all ${
              activeTab === 'outgoing'
                ? 'bg-white text-black'
                : 'bg-white/10 text-white/60 hover:text-white hover:bg-white/20'
            }`}
          >
            Sent
            {outgoingRequests.length > 0 && (
              <span className={`ml-2 px-2 py-0.5 rounded-full text-xs ${
                activeTab === 'outgoing' ? 'bg-black/20' : 'bg-white/20'
              }`}>
                {outgoingRequests.length}
              </span>
            )}
          </button>
        </div>
      </header>

      <main className="px-4 py-4">
        {currentRequests.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-10 h-10 text-white/20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                {activeTab === 'incoming' ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                )}
              </svg>
            </div>
            <h2 className="text-xl font-semibold text-white mb-2">
              {activeTab === 'incoming' ? 'No Pending Requests' : 'No Sent Requests'}
            </h2>
            <p className="text-white/60 mb-6">
              {activeTab === 'incoming'
                ? 'When someone wants to connect, it will show up here'
                : 'Requests you send will appear here until accepted'}
            </p>
            <button
              onClick={() => router.push('/discover')}
              className="px-6 py-3 bg-gradient-to-r from-pink-500 to-orange-400 text-white rounded-xl font-semibold hover:opacity-90 transition-all"
            >
              Discover People
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {currentRequests.map((request) => (
              <div
                key={request.id}
                className="bg-white/5 border border-white/10 rounded-2xl p-4"
              >
                <div className="flex items-center gap-4">
                  {/* Avatar */}
                  <div
                    onClick={() => router.push(`/user/${request.profile.id}`)}
                    className="w-14 h-14 rounded-full bg-gradient-to-br from-pink-400 via-purple-500 to-blue-600 flex items-center justify-center text-white text-xl font-bold cursor-pointer overflow-hidden flex-shrink-0"
                  >
                    {request.profile.avatar_url ? (
                      <img
                        src={request.profile.avatar_url}
                        alt={request.profile.full_name || '?'}
                        className="w-full h-full rounded-full object-cover"
                      />
                    ) : (
                      getInitials(request.profile.full_name)
                    )}
                  </div>

                  {/* Info */}
                  <div
                    onClick={() => router.push(`/user/${request.profile.id}`)}
                    className="flex-1 min-w-0 cursor-pointer"
                  >
                    <h3 className="text-lg font-semibold text-white truncate">
                      {request.profile.full_name || 'Anonymous'}
                    </h3>
                    {request.profile.about_me && (
                      <p className="text-sm text-white/60 truncate">{request.profile.about_me}</p>
                    )}
                    <p className="text-xs text-white/40 mt-1">{formatDate(request.created_at)}</p>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-2 mt-4">
                  {activeTab === 'incoming' ? (
                    <>
                      <button
                        onClick={() => acceptRequest(request)}
                        className="flex-1 py-2.5 bg-gradient-to-r from-pink-500 to-orange-400 text-white rounded-xl font-medium hover:opacity-90 transition-all"
                      >
                        Accept
                      </button>
                      <button
                        onClick={() => declineRequest(request)}
                        className="flex-1 py-2.5 bg-white/10 text-white rounded-xl font-medium hover:bg-white/20 transition-all"
                      >
                        Decline
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={() => cancelRequest(request)}
                      className="flex-1 py-2.5 bg-white/10 text-white/60 rounded-xl font-medium hover:bg-red-500/20 hover:text-red-400 transition-all"
                    >
                      Cancel Request
                    </button>
                  )}
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
