'use client'

import { useEffect, useState } from 'react'
import { createSupabaseBrowserClient } from '@/lib/supabase-browser'
import { useRouter } from 'next/navigation'
import AppShell from '@/components/AppShell'

interface Profile {
  id: string
  full_name: string | null
  avatar_url: string | null
}

interface ActivityItem {
  id: string
  type: 'post' | 'event_rsvp' | 'like' | 'comment' | 'connection'
  user: Profile
  created_at: string
  // Post-related
  post?: {
    id: string
    caption: string | null
    media_url: string | null
    media_type: 'image' | 'video' | null
  }
  // Event-related
  event?: {
    id: string
    title: string
    start_date: string
  }
  // Connection-related
  connected_user?: Profile
  // Comment content
  comment_content?: string
}

type ActivityFilter = 'all' | 'posts' | 'events' | 'connections'

export default function ActivityPage() {
  const router = useRouter()
  const supabase = createSupabaseBrowserClient()
  const [loading, setLoading] = useState(true)
  const [activities, setActivities] = useState<ActivityItem[]>([])
  const [filter, setFilter] = useState<ActivityFilter>('all')
  const [friendIds, setFriendIds] = useState<string[]>([])

  useEffect(() => {
    loadActivity()
  }, [])

  useEffect(() => {
    if (friendIds.length > 0) {
      fetchActivities()
    }
  }, [friendIds, filter])

  const loadActivity = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      router.push('/auth/login')
      return
    }

    // Get friend IDs
    const { data: connections } = await supabase
      .from('connections')
      .select('user1_id, user2_id')
      .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`)
      .eq('status', 'accepted')

    if (connections) {
      const ids = connections.map(c =>
        c.user1_id === user.id ? c.user2_id : c.user1_id
      )
      setFriendIds(ids)
    }

    setLoading(false)
  }

  const fetchActivities = async () => {
    if (friendIds.length === 0) {
      setActivities([])
      return
    }

    const allActivities: ActivityItem[] = []

    // Fetch posts by friends
    if (filter === 'all' || filter === 'posts') {
      const { data: posts } = await supabase
        .from('posts')
        .select(`
          id,
          caption,
          created_at,
          user_id,
          profiles!posts_user_id_fkey (
            id,
            full_name,
            avatar_url
          ),
          post_media (
            media_url,
            media_type
          )
        `)
        .in('user_id', friendIds)
        .order('created_at', { ascending: false })
        .limit(20)

      if (posts) {
        posts.forEach((post: any) => {
          allActivities.push({
            id: `post-${post.id}`,
            type: 'post',
            user: post.profiles,
            created_at: post.created_at,
            post: {
              id: post.id,
              caption: post.caption,
              media_url: post.post_media?.[0]?.media_url || null,
              media_type: post.post_media?.[0]?.media_type || null
            }
          })
        })
      }
    }

    // Fetch event RSVPs by friends
    if (filter === 'all' || filter === 'events') {
      const { data: rsvps } = await supabase
        .from('event_attendees')
        .select(`
          id,
          user_id,
          status,
          created_at,
          profiles!event_attendees_user_id_fkey (
            id,
            full_name,
            avatar_url
          ),
          events (
            id,
            title,
            start_date
          )
        `)
        .in('user_id', friendIds)
        .eq('status', 'going')
        .order('created_at', { ascending: false })
        .limit(20)

      if (rsvps) {
        rsvps.forEach((rsvp: any) => {
          if (rsvp.events) {
            allActivities.push({
              id: `rsvp-${rsvp.id}`,
              type: 'event_rsvp',
              user: rsvp.profiles,
              created_at: rsvp.created_at,
              event: {
                id: rsvp.events.id,
                title: rsvp.events.title,
                start_date: rsvp.events.start_date
              }
            })
          }
        })
      }
    }

    // Fetch new connections
    if (filter === 'all' || filter === 'connections') {
      const { data: newConnections } = await supabase
        .from('connections')
        .select(`
          id,
          user1_id,
          user2_id,
          created_at
        `)
        .or(`user1_id.in.(${friendIds.join(',')}),user2_id.in.(${friendIds.join(',')})`)
        .eq('status', 'accepted')
        .order('created_at', { ascending: false })
        .limit(20)

      if (newConnections) {
        // Get profiles for all users involved
        const userIdsSet = new Set<string>()
        newConnections.forEach(c => {
          userIdsSet.add(c.user1_id)
          userIdsSet.add(c.user2_id)
        })

        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, full_name, avatar_url')
          .in('id', Array.from(userIdsSet))

        const profileMap = new Map(profiles?.map(p => [p.id, p]) || [])

        newConnections.forEach((conn: any) => {
          // Only show if one of our friends is involved
          const isFriend1 = friendIds.includes(conn.user1_id)
          const isFriend2 = friendIds.includes(conn.user2_id)

          if (isFriend1 && profileMap.has(conn.user1_id) && profileMap.has(conn.user2_id)) {
            allActivities.push({
              id: `conn-${conn.id}-1`,
              type: 'connection',
              user: profileMap.get(conn.user1_id)!,
              created_at: conn.created_at,
              connected_user: profileMap.get(conn.user2_id)!
            })
          }
        })
      }
    }

    // Sort by date and dedupe
    allActivities.sort((a, b) =>
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    )

    setActivities(allActivities.slice(0, 50))
  }

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const seconds = Math.floor((now.getTime() - date.getTime()) / 1000)

    if (seconds < 60) return 'just now'
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`
    if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }

  const formatEventDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit'
    })
  }

  const getActivityIcon = (type: ActivityItem['type']) => {
    switch (type) {
      case 'post':
        return '📸'
      case 'event_rsvp':
        return '📅'
      case 'like':
        return '❤️'
      case 'comment':
        return '💬'
      case 'connection':
        return '🤝'
      default:
        return '✨'
    }
  }

  const getActivityText = (activity: ActivityItem) => {
    switch (activity.type) {
      case 'post':
        return 'shared a new post'
      case 'event_rsvp':
        return 'is going to an event'
      case 'like':
        return 'liked a post'
      case 'comment':
        return 'commented on a post'
      case 'connection':
        return `connected with ${activity.connected_user?.full_name || 'someone'}`
      default:
        return 'did something'
    }
  }

  const filters: { value: ActivityFilter; label: string; icon: string }[] = [
    { value: 'all', label: 'All', icon: '✨' },
    { value: 'posts', label: 'Posts', icon: '📸' },
    { value: 'events', label: 'Events', icon: '📅' },
    { value: 'connections', label: 'Connections', icon: '🤝' }
  ]

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-white"></div>
      </div>
    )
  }

  return (
    <AppShell showHeader={false}>
      {/* Page Header */}
      <header className="sticky top-0 z-40 bg-[#0a0a0a]/80 backdrop-blur-xl border-b border-white/10 lg:static lg:bg-transparent lg:border-0">
        <div className="px-4 py-4 flex items-center gap-4">
          <button
            onClick={() => router.back()}
            className="p-2 text-white/60 hover:text-white transition-colors lg:hidden"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <h1 className="text-xl font-bold text-white lg:text-2xl">Activity</h1>
        </div>

        {/* Filters */}
        <div className="px-4 pb-4 flex gap-2 overflow-x-auto">
          {filters.map((f) => (
            <button
              key={f.value}
              onClick={() => setFilter(f.value)}
              className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all ${
                filter === f.value
                  ? 'bg-white text-black'
                  : 'bg-white/10 text-white/60 hover:text-white hover:bg-white/20'
              }`}
            >
              <span>{f.icon}</span>
              <span>{f.label}</span>
            </button>
          ))}
        </div>
      </header>

      <main className="px-4 py-4">
        {friendIds.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-4xl">👥</span>
            </div>
            <h2 className="text-xl font-semibold text-white mb-2">No Connections Yet</h2>
            <p className="text-white/60 mb-6">Connect with people to see their activity here</p>
            <button
              onClick={() => router.push('/discover')}
              className="px-6 py-3 bg-gradient-to-r from-pink-500 to-orange-400 text-white rounded-xl font-semibold hover:opacity-90 transition-all"
            >
              Discover People
            </button>
          </div>
        ) : activities.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-4xl">🔍</span>
            </div>
            <h2 className="text-xl font-semibold text-white mb-2">No Activity Yet</h2>
            <p className="text-white/60">Your friends haven&apos;t posted anything recently</p>
          </div>
        ) : (
          <div className="space-y-3">
            {activities.map((activity) => (
              <div
                key={activity.id}
                className="bg-white/5 border border-white/10 rounded-2xl p-4 hover:bg-white/[0.07] transition-colors cursor-pointer"
                onClick={() => {
                  if (activity.type === 'post' && activity.post) {
                    router.push(`/post/${activity.post.id}`)
                  } else if (activity.type === 'event_rsvp' && activity.event) {
                    router.push(`/events/${activity.event.id}`)
                  } else if (activity.type === 'connection' && activity.connected_user) {
                    router.push(`/user/${activity.connected_user.id}`)
                  }
                }}
              >
                <div className="flex gap-4">
                  {/* User Avatar */}
                  <div
                    className="w-12 h-12 rounded-full bg-gradient-to-br from-pink-400 via-purple-500 to-blue-600 flex items-center justify-center text-white font-bold overflow-hidden flex-shrink-0"
                    onClick={(e) => {
                      e.stopPropagation()
                      router.push(`/user/${activity.user.id}`)
                    }}
                  >
                    {activity.user.avatar_url ? (
                      <img
                        src={activity.user.avatar_url}
                        alt={activity.user.full_name || ''}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      activity.user.full_name?.[0]?.toUpperCase() || '?'
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    {/* Activity Header */}
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <span
                          className="font-semibold text-white hover:underline"
                          onClick={(e) => {
                            e.stopPropagation()
                            router.push(`/user/${activity.user.id}`)
                          }}
                        >
                          {activity.user.full_name || 'Anonymous'}
                        </span>
                        <span className="text-white/60 ml-2">{getActivityText(activity)}</span>
                      </div>
                      <span className="text-white/40 text-sm whitespace-nowrap">
                        {formatTimeAgo(activity.created_at)}
                      </span>
                    </div>

                    {/* Activity Content */}
                    {activity.type === 'post' && activity.post && (
                      <div className="mt-3 flex gap-3">
                        {activity.post.media_url && (
                          <div className="w-20 h-20 rounded-xl overflow-hidden flex-shrink-0 bg-white/10">
                            {activity.post.media_type === 'video' ? (
                              <video
                                src={activity.post.media_url}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <img
                                src={activity.post.media_url}
                                alt=""
                                className="w-full h-full object-cover"
                              />
                            )}
                          </div>
                        )}
                        {activity.post.caption && (
                          <p className="text-white/70 text-sm line-clamp-3 flex-1">
                            {activity.post.caption}
                          </p>
                        )}
                      </div>
                    )}

                    {activity.type === 'event_rsvp' && activity.event && (
                      <div className="mt-3 bg-white/5 rounded-xl p-3">
                        <p className="text-white font-medium">{activity.event.title}</p>
                        <p className="text-white/50 text-sm mt-1">
                          {formatEventDate(activity.event.start_date)}
                        </p>
                      </div>
                    )}

                    {activity.type === 'connection' && activity.connected_user && (
                      <div
                        className="mt-3 flex items-center gap-3"
                        onClick={(e) => {
                          e.stopPropagation()
                          router.push(`/user/${activity.connected_user!.id}`)
                        }}
                      >
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-green-400 to-emerald-500 flex items-center justify-center text-white font-bold overflow-hidden">
                          {activity.connected_user.avatar_url ? (
                            <img
                              src={activity.connected_user.avatar_url}
                              alt={activity.connected_user.full_name || ''}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            activity.connected_user.full_name?.[0]?.toUpperCase() || '?'
                          )}
                        </div>
                        <span className="text-white/70 text-sm">
                          {activity.connected_user.full_name || 'Anonymous'}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </AppShell>
  )
}
