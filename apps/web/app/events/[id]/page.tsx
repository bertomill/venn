'use client'

import { useEffect, useState } from 'react'
import { createSupabaseBrowserClient } from '@/lib/supabase-browser'
import { useRouter, useParams } from 'next/navigation'

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
    </div>
  )
}
