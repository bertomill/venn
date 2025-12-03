'use client'

import { useEffect, useState } from 'react'
import { createSupabaseBrowserClient } from '@/lib/supabase-browser'
import { useRouter, useParams } from 'next/navigation'
import BreakoutGroups from '@/components/BreakoutGroups'

interface Profile {
  id: string
  full_name: string | null
  avatar_url: string | null
}

interface EventAttendee {
  user_id: string
  status: 'going' | 'interested' | 'maybe'
  profiles: Profile
}

interface Friend {
  id: string
  full_name: string | null
  avatar_url: string | null
  invited?: boolean
  attending?: boolean
}

interface Event {
  id: string
  title: string
  description: string
  start_date: string
  end_date: string | null
  location: string
  event_type: string
  image_url: string | null
  max_attendees: number | null
  creator_id: string
  creator: Profile
  event_attendees: EventAttendee[]
}

export default function EventDetailPage() {
  const router = useRouter()
  const params = useParams()
  const eventId = params.id as string

  const [user, setUser] = useState<any>(null)
  const [event, setEvent] = useState<Event | null>(null)
  const [loading, setLoading] = useState(true)
  const [showInviteModal, setShowInviteModal] = useState(false)
  const [friends, setFriends] = useState<Friend[]>([])
  const [loadingFriends, setLoadingFriends] = useState(false)
  const [inviteMessage, setInviteMessage] = useState('')
  const [selectedFriends, setSelectedFriends] = useState<Set<string>>(new Set())
  const [sendingInvites, setSendingInvites] = useState(false)
  const supabase = createSupabaseBrowserClient()

  useEffect(() => {
    checkUser()
  }, [])

  useEffect(() => {
    if (user && eventId) {
      fetchEvent()
    }
  }, [user, eventId])

  const checkUser = async () => {
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      router.push('/auth/login')
      return
    }

    setUser(user)
  }

  const fetchEvent = async () => {
    const { data, error } = await supabase
      .from('events')
      .select(`
        *,
        creator:profiles!creator_id (
          id,
          full_name,
          avatar_url
        ),
        event_attendees (
          user_id,
          status,
          profiles (
            id,
            full_name,
            avatar_url
          )
        )
      `)
      .eq('id', eventId)
      .single()

    if (error) {
      console.error('Error fetching event:', error)
      router.push('/events')
      return
    }

    setEvent(data as Event)
    setLoading(false)
  }

  const handleRSVP = async (status: 'going' | 'interested') => {
    if (!user || !event) return

    const existingRSVP = event.event_attendees?.find(a => a.user_id === user.id)

    if (existingRSVP?.status === status) {
      // Remove RSVP
      const { error } = await supabase
        .from('event_attendees')
        .delete()
        .eq('event_id', event.id)
        .eq('user_id', user.id)

      if (!error) {
        setEvent({
          ...event,
          event_attendees: event.event_attendees.filter(a => a.user_id !== user.id)
        })
      }
    } else {
      // Upsert RSVP
      const { error } = await supabase
        .from('event_attendees')
        .upsert({
          event_id: event.id,
          user_id: user.id,
          status
        } as never, { onConflict: 'event_id,user_id' })

      if (!error) {
        // Refetch to get updated attendee info
        fetchEvent()
      }
    }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit'
    })
  }

  const getUserRSVPStatus = () => {
    if (!user || !event) return null
    const userAttendee = event.event_attendees?.find(a => a.user_id === user.id)
    return userAttendee?.status || null
  }

  const getAttendeesByStatus = (status: 'going' | 'interested') => {
    return event?.event_attendees?.filter(a => a.status === status) || []
  }

  const fetchFriendsForInvite = async () => {
    if (!user || !event) return
    setLoadingFriends(true)

    try {
      // Get all connections
      const { data: connections } = await supabase
        .from('connections')
        .select('user1_id, user2_id')
        .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`)
        .eq('status', 'accepted')

      if (!connections || connections.length === 0) {
        setFriends([])
        setLoadingFriends(false)
        return
      }

      const friendIds = connections.map(c =>
        c.user1_id === user.id ? c.user2_id : c.user1_id
      )

      // Get friend profiles
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url')
        .in('id', friendIds)

      // Get existing invites for this event
      const { data: existingInvites } = await supabase
        .from('event_invites')
        .select('invitee_id')
        .eq('event_id', event.id)

      const invitedIds = new Set(existingInvites?.map(i => i.invitee_id) || [])
      const attendeeIds = new Set(event.event_attendees?.map(a => a.user_id) || [])

      const friendsWithStatus = (profiles || []).map(p => ({
        ...p,
        invited: invitedIds.has(p.id),
        attending: attendeeIds.has(p.id)
      }))

      setFriends(friendsWithStatus)
    } catch (error) {
      console.error('Error fetching friends:', error)
    } finally {
      setLoadingFriends(false)
    }
  }

  const openInviteModal = () => {
    setShowInviteModal(true)
    setSelectedFriends(new Set())
    setInviteMessage('')
    fetchFriendsForInvite()
  }

  const toggleFriendSelection = (friendId: string) => {
    setSelectedFriends(prev => {
      const next = new Set(prev)
      if (next.has(friendId)) {
        next.delete(friendId)
      } else {
        next.add(friendId)
      }
      return next
    })
  }

  const sendInvites = async () => {
    if (!user || !event || selectedFriends.size === 0) return
    setSendingInvites(true)

    try {
      const invites = Array.from(selectedFriends).map(friendId => ({
        event_id: event.id,
        inviter_id: user.id,
        invitee_id: friendId,
        message: inviteMessage || null
      }))

      const { error } = await supabase
        .from('event_invites')
        .insert(invites)

      if (error) {
        console.error('Error sending invites:', error)
        alert('Failed to send some invites. They may have already been invited.')
      } else {
        alert(`Invites sent to ${selectedFriends.size} friend${selectedFriends.size > 1 ? 's' : ''}!`)
        setShowInviteModal(false)
      }
    } catch (error) {
      console.error('Error sending invites:', error)
    } finally {
      setSendingInvites(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
        <div className="text-lg text-white/60">Loading...</div>
      </div>
    )
  }

  if (!event) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
        <div className="text-lg text-white/60">Event not found</div>
      </div>
    )
  }

  const userStatus = getUserRSVPStatus()
  const goingAttendees = getAttendeesByStatus('going')
  const interestedAttendees = getAttendeesByStatus('interested')

  return (
    <div className="min-h-screen bg-[#0a0a0a] pb-24">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-black/40 backdrop-blur-xl border-b border-white/5">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <button
              onClick={() => router.push('/events')}
              className="text-white/60 hover:text-white text-sm flex items-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Back
            </button>
            {event.creator_id === user?.id && (
              <button className="text-white/60 hover:text-white text-sm">
                Edit
              </button>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Event Header Image */}
        <div
          className="aspect-video w-full rounded-3xl overflow-hidden relative mb-8"
          style={{ background: event.image_url || 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}
        >
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
          <div className="absolute bottom-6 left-6 right-6">
            <div className="bg-black/60 backdrop-blur-sm px-3 py-1 rounded-full inline-block mb-3">
              <span className="text-xs text-white font-medium">{event.event_type}</span>
            </div>
            <h1 className="text-3xl md:text-4xl font-bold text-white">{event.title}</h1>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Event Details */}
            <div className="bg-white/5 border border-white/10 rounded-2xl p-6 space-y-4">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center">
                  <span className="text-lg">📅</span>
                </div>
                <div>
                  <p className="text-white font-medium">{formatDate(event.start_date)}</p>
                  {event.end_date && (
                    <p className="text-white/40 text-sm">to {formatDate(event.end_date)}</p>
                  )}
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center">
                  <span className="text-lg">📍</span>
                </div>
                <div>
                  <p className="text-white font-medium">{event.location}</p>
                </div>
              </div>

              {event.max_attendees && (
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center">
                    <span className="text-lg">👥</span>
                  </div>
                  <div>
                    <p className="text-white font-medium">{event.max_attendees} spots</p>
                    <p className="text-white/40 text-sm">{goingAttendees.length} confirmed</p>
                  </div>
                </div>
              )}
            </div>

            {/* Description */}
            {event.description && (
              <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
                <h2 className="text-lg font-semibold text-white mb-3">About</h2>
                <p className="text-white/70 whitespace-pre-wrap">{event.description}</p>
              </div>
            )}

            {/* Host */}
            <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
              <h2 className="text-lg font-semibold text-white mb-4">Hosted by</h2>
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center">
                  {event.creator?.avatar_url ? (
                    <img src={event.creator.avatar_url} alt="" className="w-full h-full rounded-full object-cover" />
                  ) : (
                    <span className="text-white font-bold text-lg">
                      {event.creator?.full_name?.[0] || '?'}
                    </span>
                  )}
                </div>
                <div>
                  <p className="text-white font-medium">{event.creator?.full_name || 'Anonymous'}</p>
                  <p className="text-white/40 text-sm">Organizer</p>
                </div>
              </div>
            </div>

            {/* Breakout Groups */}
            <BreakoutGroups
              eventId={event.id}
              isCreator={event.creator_id === user?.id}
              attendeeCount={goingAttendees.length}
            />
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* RSVP Card */}
            <div className="bg-white/5 border border-white/10 rounded-2xl p-6 sticky top-24">
              <h2 className="text-lg font-semibold text-white mb-4">Are you going?</h2>
              <div className="space-y-3">
                <button
                  onClick={() => handleRSVP('going')}
                  className={`w-full py-3 px-4 rounded-xl text-sm font-medium transition-all ${
                    userStatus === 'going'
                      ? 'bg-green-500/20 border border-green-500/50 text-green-300'
                      : 'bg-white/10 border border-white/10 text-white hover:bg-white/20'
                  }`}
                >
                  {userStatus === 'going' ? '✓ Going' : 'Going'}
                </button>
                <button
                  onClick={() => handleRSVP('interested')}
                  className={`w-full py-3 px-4 rounded-xl text-sm font-medium transition-all ${
                    userStatus === 'interested'
                      ? 'bg-purple-500/20 border border-purple-500/50 text-purple-300'
                      : 'bg-white/10 border border-white/10 text-white hover:bg-white/20'
                  }`}
                >
                  {userStatus === 'interested' ? '★ Interested' : '☆ Interested'}
                </button>

                {/* Invite Friends Button */}
                <button
                  onClick={openInviteModal}
                  className="w-full py-3 px-4 rounded-xl text-sm font-medium bg-gradient-to-r from-pink-500 to-orange-400 text-white hover:opacity-90 transition-all flex items-center justify-center gap-2"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                  </svg>
                  Invite Friends
                </button>
              </div>
            </div>

            {/* Attendees */}
            {(goingAttendees.length > 0 || interestedAttendees.length > 0) && (
              <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
                {goingAttendees.length > 0 && (
                  <div className="mb-6">
                    <h3 className="text-sm font-medium text-white/60 mb-3">
                      Going ({goingAttendees.length})
                    </h3>
                    <div className="flex flex-wrap gap-2">
                      {goingAttendees.map((attendee) => (
                        <div
                          key={attendee.user_id}
                          className="w-10 h-10 bg-gradient-to-br from-green-500 to-emerald-500 rounded-full flex items-center justify-center"
                          title={attendee.profiles?.full_name || 'Anonymous'}
                        >
                          {attendee.profiles?.avatar_url ? (
                            <img src={attendee.profiles.avatar_url} alt="" className="w-full h-full rounded-full object-cover" />
                          ) : (
                            <span className="text-white font-bold text-sm">
                              {attendee.profiles?.full_name?.[0] || '?'}
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {interestedAttendees.length > 0 && (
                  <div>
                    <h3 className="text-sm font-medium text-white/60 mb-3">
                      Interested ({interestedAttendees.length})
                    </h3>
                    <div className="flex flex-wrap gap-2">
                      {interestedAttendees.map((attendee) => (
                        <div
                          key={attendee.user_id}
                          className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center"
                          title={attendee.profiles?.full_name || 'Anonymous'}
                        >
                          {attendee.profiles?.avatar_url ? (
                            <img src={attendee.profiles.avatar_url} alt="" className="w-full h-full rounded-full object-cover" />
                          ) : (
                            <span className="text-white font-bold text-sm">
                              {attendee.profiles?.full_name?.[0] || '?'}
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Invite Friends Modal */}
      {showInviteModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-[#1a1a1a] border border-white/10 rounded-2xl w-full max-w-md max-h-[80vh] flex flex-col">
            {/* Modal Header */}
            <div className="p-6 border-b border-white/10">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-xl font-bold text-white">Invite Friends</h3>
                <button
                  onClick={() => setShowInviteModal(false)}
                  className="text-white/40 hover:text-white"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <p className="text-white/60 text-sm">Select friends to invite to {event?.title}</p>
            </div>

            {/* Optional Message */}
            <div className="px-6 py-4 border-b border-white/10">
              <input
                type="text"
                value={inviteMessage}
                onChange={(e) => setInviteMessage(e.target.value)}
                placeholder="Add a personal message (optional)"
                className="w-full bg-white/5 border border-white/10 text-white placeholder-white/30 px-4 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-white/20"
              />
            </div>

            {/* Friends List */}
            <div className="flex-1 overflow-y-auto p-4">
              {loadingFriends ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-white"></div>
                </div>
              ) : friends.length === 0 ? (
                <div className="text-center py-8">
                  <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-4">
                    <span className="text-3xl">👥</span>
                  </div>
                  <p className="text-white/60">No friends to invite yet</p>
                  <button
                    onClick={() => {
                      setShowInviteModal(false)
                      router.push('/discover')
                    }}
                    className="mt-4 text-pink-400 hover:text-pink-300 text-sm"
                  >
                    Find people to connect with
                  </button>
                </div>
              ) : (
                <div className="space-y-2">
                  {friends.map((friend) => {
                    const isSelected = selectedFriends.has(friend.id)
                    const isDisabled = friend.invited || friend.attending

                    return (
                      <button
                        key={friend.id}
                        onClick={() => !isDisabled && toggleFriendSelection(friend.id)}
                        disabled={isDisabled}
                        className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all ${
                          isDisabled
                            ? 'opacity-50 cursor-not-allowed bg-white/5'
                            : isSelected
                            ? 'bg-pink-500/20 border border-pink-500/50'
                            : 'bg-white/5 hover:bg-white/10 border border-transparent'
                        }`}
                      >
                        {/* Avatar */}
                        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-pink-400 via-purple-500 to-blue-600 flex items-center justify-center text-white font-bold overflow-hidden flex-shrink-0">
                          {friend.avatar_url ? (
                            <img
                              src={friend.avatar_url}
                              alt={friend.full_name || ''}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            friend.full_name?.[0]?.toUpperCase() || '?'
                          )}
                        </div>

                        {/* Name */}
                        <div className="flex-1 text-left">
                          <p className="text-white font-medium">{friend.full_name || 'Anonymous'}</p>
                          {friend.attending && (
                            <p className="text-green-400 text-xs">Already attending</p>
                          )}
                          {friend.invited && !friend.attending && (
                            <p className="text-white/40 text-xs">Already invited</p>
                          )}
                        </div>

                        {/* Checkbox */}
                        {!isDisabled && (
                          <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                            isSelected
                              ? 'bg-pink-500 border-pink-500'
                              : 'border-white/30'
                          }`}>
                            {isSelected && (
                              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                              </svg>
                            )}
                          </div>
                        )}
                      </button>
                    )
                  })}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-6 border-t border-white/10">
              <button
                onClick={sendInvites}
                disabled={selectedFriends.size === 0 || sendingInvites}
                className="w-full py-3 bg-gradient-to-r from-pink-500 to-orange-400 text-white rounded-xl font-medium hover:opacity-90 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {sendingInvites
                  ? 'Sending...'
                  : selectedFriends.size === 0
                  ? 'Select friends to invite'
                  : `Send ${selectedFriends.size} Invite${selectedFriends.size > 1 ? 's' : ''}`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
