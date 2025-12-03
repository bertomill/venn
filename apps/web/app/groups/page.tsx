'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createSupabaseBrowserClient } from '@/lib/supabase-browser'
import AppShell from '@/components/AppShell'

interface Member {
  userId: string
  fullName: string | null
  avatarUrl: string | null
}

interface BreakoutGroup {
  id: string
  name: string
  sharedInterests: string[]
  createdAt: string
  members: Member[]
  event?: {
    id: string
    title: string
    start_date: string
  }
}

interface Event {
  id: string
  title: string
  start_date: string
}

export default function GroupsPage() {
  const router = useRouter()
  const supabase = createSupabaseBrowserClient()

  const [user, setUser] = useState<any>(null)
  const [profile, setProfile] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [groups, setGroups] = useState<BreakoutGroup[]>([])
  const [myEvents, setMyEvents] = useState<Event[]>([])

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

    // Fetch profile
    const { data: profileData } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single()

    setProfile(profileData)

    // Fetch user's groups and events they're attending
    await fetchUserGroups(user.id)
    await fetchMyEvents(user.id)

    setLoading(false)
  }

  const fetchUserGroups = async (userId: string) => {
    // Get groups the user is a member of
    const { data: memberOf } = await supabase
      .from('breakout_group_members')
      .select(`
        group_id,
        breakout_groups (
          id,
          name,
          shared_interests,
          created_at,
          event_id,
          events (
            id,
            title,
            start_date
          )
        )
      `)
      .eq('user_id', userId)

    if (!memberOf) return

    // Fetch all members for each group
    const groupsWithMembers = await Promise.all(
      memberOf.map(async (m: any) => {
        const group = m.breakout_groups
        if (!group) return null

        const { data: members } = await supabase
          .from('breakout_group_members')
          .select(`
            user_id,
            profiles (
              id,
              full_name,
              avatar_url
            )
          `)
          .eq('group_id', group.id)

        return {
          id: group.id,
          name: group.name,
          sharedInterests: group.shared_interests || [],
          createdAt: group.created_at,
          event: group.events,
          members: members?.map((mem: any) => ({
            userId: mem.profiles?.id,
            fullName: mem.profiles?.full_name,
            avatarUrl: mem.profiles?.avatar_url
          })) || []
        }
      })
    )

    setGroups(groupsWithMembers.filter(Boolean) as BreakoutGroup[])
  }

  const fetchMyEvents = async (userId: string) => {
    // Events I created or am attending
    const { data: attending } = await supabase
      .from('event_attendees')
      .select(`
        events (
          id,
          title,
          start_date,
          creator_id
        )
      `)
      .eq('user_id', userId)
      .eq('status', 'going')

    const { data: created } = await supabase
      .from('events')
      .select('id, title, start_date')
      .eq('creator_id', userId)
      .gte('start_date', new Date().toISOString())
      .order('start_date', { ascending: true })
      .limit(5)

    const attendingEvents = attending?.map((a: any) => a.events).filter(Boolean) || []
    const allEvents = [...(created || []), ...attendingEvents]

    // Dedupe by id
    const uniqueEvents = allEvents.reduce((acc: Event[], event) => {
      if (!acc.find(e => e.id === event.id)) {
        acc.push(event)
      }
      return acc
    }, [])

    setMyEvents(uniqueEvents)
  }

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push('/auth/login')
  }

  if (loading) {
    return (
      <AppShell profile={profile} onSignOut={handleSignOut}>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-white"></div>
        </div>
      </AppShell>
    )
  }

  return (
    <AppShell profile={profile} onSignOut={handleSignOut}>
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Your Groups</h1>
          <p className="text-white/60">Breakout groups from events you're attending</p>
        </div>

        {/* My Groups */}
        {groups.length === 0 ? (
          <div className="bg-white/5 border border-white/10 rounded-2xl p-8 text-center">
            <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-white/40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">No groups yet</h3>
            <p className="text-white/60 mb-6">
              Join events and get matched with others who share your interests
            </p>
            <button
              onClick={() => router.push('/events')}
              className="px-6 py-3 bg-gradient-to-r from-indigo-500 to-purple-500 text-white rounded-xl font-medium hover:opacity-90 transition-all"
            >
              Browse Events
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {groups.map((group) => (
              <div
                key={group.id}
                className="bg-white/5 border border-white/10 rounded-2xl p-6 hover:bg-white/[0.07] transition-all"
              >
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-xl font-semibold text-white mb-1">{group.name}</h3>
                    {group.event && (
                      <button
                        onClick={() => router.push(`/events/${group.event?.id}`)}
                        className="text-indigo-400 hover:text-indigo-300 text-sm flex items-center gap-1"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        {group.event.title}
                      </button>
                    )}
                  </div>
                  <span className="text-white/40 text-sm">
                    {group.members.length} members
                  </span>
                </div>

                {/* Shared Interests */}
                {group.sharedInterests.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-4">
                    {group.sharedInterests.map((interest) => (
                      <span
                        key={interest}
                        className="text-xs bg-indigo-500/20 text-indigo-300 px-3 py-1 rounded-full"
                      >
                        {interest}
                      </span>
                    ))}
                  </div>
                )}

                {/* Members */}
                <div className="flex flex-wrap gap-2">
                  {group.members.map((member) => (
                    <div
                      key={member.userId}
                      className="flex items-center gap-2 bg-white/5 rounded-lg px-3 py-2"
                    >
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-pink-400 via-purple-500 to-blue-600 flex items-center justify-center text-white text-sm font-bold overflow-hidden">
                        {member.avatarUrl ? (
                          <img
                            src={member.avatarUrl}
                            alt={member.fullName || ''}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          member.fullName?.[0]?.toUpperCase() || '?'
                        )}
                      </div>
                      <span className="text-white/80 text-sm">
                        {member.fullName || 'Anonymous'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Upcoming Events Section */}
        {myEvents.length > 0 && (
          <div className="mt-12">
            <h2 className="text-xl font-semibold text-white mb-4">Your Upcoming Events</h2>
            <p className="text-white/60 text-sm mb-4">
              Event organizers can create breakout groups for attendees
            </p>
            <div className="grid gap-3">
              {myEvents.map((event) => (
                <button
                  key={event.id}
                  onClick={() => router.push(`/events/${event.id}`)}
                  className="flex items-center justify-between bg-white/5 border border-white/10 rounded-xl p-4 hover:bg-white/[0.07] transition-all text-left w-full"
                >
                  <div>
                    <h4 className="text-white font-medium">{event.title}</h4>
                    <p className="text-white/40 text-sm">
                      {new Date(event.start_date).toLocaleDateString('en-US', {
                        weekday: 'short',
                        month: 'short',
                        day: 'numeric'
                      })}
                    </p>
                  </div>
                  <svg className="w-5 h-5 text-white/40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </AppShell>
  )
}
