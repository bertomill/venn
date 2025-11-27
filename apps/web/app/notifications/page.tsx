'use client'

import { useEffect, useState } from 'react'
import { createSupabaseBrowserClient } from '@/lib/supabase-browser'
import { useRouter } from 'next/navigation'

interface Profile {
  id: string
  full_name: string | null
  avatar_url: string | null
}

interface Notification {
  id: string
  type: 'friend_request' | 'friend_accepted' | 'event_rsvp' | 'event_reminder' | 'event_invite' | 'post_like' | 'post_comment' | 'post_save' | 'comment_reply'
  from_user_id: string
  post_id?: string
  comment_id?: string
  event_id?: string
  event_invite_id?: string
  data: { connection_id?: string; event_id?: string; parent_comment_id?: string; message?: string }
  read: boolean
  created_at: string
  from_user?: Profile
}

export default function NotificationsPage() {
  const router = useRouter()
  const [user, setUser] = useState<{ id: string } | null>(null)
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(true)
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
    await fetchNotifications(user.id)
  }

  const fetchNotifications = async (userId: string) => {
    const { data, error } = await supabase
      .from('notifications')
      .select(`
        *,
        from_user:profiles!from_user_id (
          id,
          full_name,
          avatar_url
        )
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching notifications:', error)
    } else {
      setNotifications(data || [])
      // Mark all as read
      markAllAsRead(userId)
    }

    setLoading(false)
  }

  const markAllAsRead = async (userId: string) => {
    await supabase
      .from('notifications')
      .update({ read: true } as never)
      .eq('user_id', userId)
      .eq('read', false)
  }

  const handleAcceptRequest = async (notification: Notification) => {
    if (!notification.data.connection_id) return

    const { error } = await supabase
      .from('connections')
      .update({ status: 'accepted' } as never)
      .eq('id', notification.data.connection_id)

    if (error) {
      console.error('Error accepting request:', error)
      return
    }

    // Remove from list or update UI
    setNotifications(prev =>
      prev.map(n =>
        n.id === notification.id
          ? { ...n, type: 'friend_accepted' as const }
          : n
      )
    )
  }

  const handleDeclineRequest = async (notification: Notification) => {
    if (!notification.data.connection_id) return

    const { error } = await supabase
      .from('connections')
      .update({ status: 'rejected' } as never)
      .eq('id', notification.data.connection_id)

    if (error) {
      console.error('Error declining request:', error)
      return
    }

    // Remove notification
    setNotifications(prev => prev.filter(n => n.id !== notification.id))

    // Delete the notification
    await supabase
      .from('notifications')
      .delete()
      .eq('id', notification.id)
  }

  const handleAcceptEventInvite = async (notification: Notification) => {
    if (!notification.event_invite_id || !notification.event_id) return

    // Update invite status
    await supabase
      .from('event_invites')
      .update({ status: 'accepted', responded_at: new Date().toISOString() } as never)
      .eq('id', notification.event_invite_id)

    // Navigate to the event
    router.push(`/events/${notification.event_id}`)
  }

  const handleDeclineEventInvite = async (notification: Notification) => {
    if (!notification.event_invite_id) return

    // Update invite status
    const { error } = await supabase
      .from('event_invites')
      .update({ status: 'declined', responded_at: new Date().toISOString() } as never)
      .eq('id', notification.event_invite_id)

    if (error) {
      console.error('Error declining invite:', error)
      return
    }

    // Remove notification
    setNotifications(prev => prev.filter(n => n.id !== notification.id))

    // Delete the notification
    await supabase
      .from('notifications')
      .delete()
      .eq('id', notification.id)
  }

  const formatTime = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMins < 1) return 'Just now'
    if (diffMins < 60) return `${diffMins}m ago`
    if (diffHours < 24) return `${diffHours}h ago`
    if (diffDays < 7) return `${diffDays}d ago`
    return date.toLocaleDateString()
  }

  const getNotificationContent = (notification: Notification) => {
    const name = notification.from_user?.full_name || 'Someone'

    switch (notification.type) {
      case 'friend_request':
        return {
          title: 'Friend Request',
          message: `${name} wants to connect with you`,
          showActions: true,
          icon: 'friend',
          color: 'bg-blue-500'
        }
      case 'friend_accepted':
        return {
          title: 'Request Accepted',
          message: `${name} accepted your connection request`,
          showActions: false,
          icon: 'check',
          color: 'bg-green-500'
        }
      case 'event_rsvp':
        return {
          title: 'Event RSVP',
          message: `${name} is going to an event you're interested in`,
          showActions: false,
          icon: 'event',
          color: 'bg-purple-500'
        }
      case 'post_like':
        return {
          title: 'New Like',
          message: `${name} liked your post`,
          showActions: false,
          icon: 'heart',
          color: 'bg-red-500',
          link: notification.post_id ? `/post/${notification.post_id}` : undefined
        }
      case 'post_comment':
        return {
          title: 'New Comment',
          message: `${name} commented on your post`,
          showActions: false,
          icon: 'comment',
          color: 'bg-blue-500',
          link: notification.post_id ? `/post/${notification.post_id}` : undefined
        }
      case 'comment_reply':
        return {
          title: 'New Reply',
          message: `${name} replied to your comment`,
          showActions: false,
          icon: 'reply',
          color: 'bg-cyan-500',
          link: notification.post_id ? `/post/${notification.post_id}` : undefined
        }
      case 'post_save':
        return {
          title: 'Post Saved',
          message: `${name} saved your post`,
          showActions: false,
          icon: 'bookmark',
          color: 'bg-yellow-500',
          link: notification.post_id ? `/post/${notification.post_id}` : undefined
        }
      case 'event_invite':
        return {
          title: 'Event Invite',
          message: notification.data.message
            ? `${name} invited you to an event: "${notification.data.message}"`
            : `${name} invited you to an event`,
          showActions: true,
          actionType: 'event_invite' as const,
          icon: 'calendar',
          color: 'bg-pink-500',
          link: notification.event_id ? `/events/${notification.event_id}` : undefined
        }
      default:
        return {
          title: 'Notification',
          message: 'You have a new notification',
          showActions: false,
          icon: 'bell',
          color: 'bg-gray-500'
        }
    }
  }

  const handleNotificationClick = (notification: Notification) => {
    const content = getNotificationContent(notification)
    if (content.link) {
      router.push(content.link)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-purple-500"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] pb-24">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-black/40 backdrop-blur-xl border-b border-white/5">
        <div className="max-w-2xl mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.back()}
              className="text-white/60 hover:text-white"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <h1 className="text-xl font-bold text-white">Notifications</h1>
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6">
        {notifications.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-16 h-16 mx-auto mb-4 bg-white/10 rounded-full flex items-center justify-center">
              <svg className="w-8 h-8 text-white/40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
            </div>
            <p className="text-white/60">No notifications yet</p>
            <p className="text-white/40 text-sm mt-2">
              When someone sends you a friend request, you&apos;ll see it here
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {notifications.map((notification) => {
              const content = getNotificationContent(notification)
              const fromUser = notification.from_user
              const isClickable = 'link' in content && content.link

              return (
                <div
                  key={notification.id}
                  onClick={() => isClickable && handleNotificationClick(notification)}
                  className={`bg-white/5 border rounded-2xl p-4 transition-all ${
                    notification.read ? 'border-white/10' : 'border-purple-500/50 bg-purple-500/5'
                  } ${isClickable ? 'cursor-pointer hover:bg-white/10' : ''}`}
                >
                  <div className="flex items-start gap-4">
                    {/* Avatar with type icon */}
                    <div className="relative flex-shrink-0">
                      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 flex items-center justify-center">
                        {fromUser?.avatar_url ? (
                          <img
                            src={fromUser.avatar_url}
                            alt={fromUser.full_name || ''}
                            className="w-full h-full rounded-full object-cover"
                          />
                        ) : (
                          <span className="text-lg font-bold text-white">
                            {fromUser?.full_name?.[0]?.toUpperCase() || '?'}
                          </span>
                        )}
                      </div>
                      {/* Type icon badge */}
                      <div className={`absolute -bottom-1 -right-1 w-6 h-6 rounded-full flex items-center justify-center ${content.color}`}>
                        {/* Friend request */}
                        {content.icon === 'friend' && (
                          <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                          </svg>
                        )}
                        {/* Check mark */}
                        {content.icon === 'check' && (
                          <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                        {/* Event */}
                        {content.icon === 'event' && (
                          <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                        )}
                        {/* Heart (like) */}
                        {content.icon === 'heart' && (
                          <svg className="w-3.5 h-3.5 text-white" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                          </svg>
                        )}
                        {/* Comment */}
                        {content.icon === 'comment' && (
                          <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                          </svg>
                        )}
                        {/* Reply */}
                        {content.icon === 'reply' && (
                          <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
                          </svg>
                        )}
                        {/* Bookmark (save) */}
                        {content.icon === 'bookmark' && (
                          <svg className="w-3.5 h-3.5 text-white" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                          </svg>
                        )}
                        {/* Calendar (event invite) */}
                        {content.icon === 'calendar' && (
                          <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                        )}
                      </div>
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="text-white font-medium">{content.message}</p>
                          <p className="text-white/40 text-sm mt-1">
                            {formatTime(notification.created_at)}
                          </p>
                        </div>

                        {!notification.read && (
                          <div className="w-2 h-2 bg-purple-500 rounded-full flex-shrink-0 mt-2"></div>
                        )}
                      </div>

                      {/* Action buttons for friend requests */}
                      {notification.type === 'friend_request' && content.showActions && (
                        <div className="flex gap-2 mt-3">
                          <button
                            onClick={() => handleAcceptRequest(notification)}
                            className="flex-1 py-2 px-4 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-xl font-medium text-sm hover:opacity-90 transition-all"
                          >
                            Accept
                          </button>
                          <button
                            onClick={() => handleDeclineRequest(notification)}
                            className="flex-1 py-2 px-4 bg-white/10 border border-white/10 text-white/70 rounded-xl font-medium text-sm hover:bg-white/20 transition-all"
                          >
                            Decline
                          </button>
                        </div>
                      )}

                      {/* Show "Accepted" state */}
                      {notification.type === 'friend_accepted' && (
                        <div className="mt-3">
                          <span className="inline-flex items-center gap-1 text-green-400 text-sm">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                            Connected
                          </span>
                        </div>
                      )}

                      {/* Action buttons for event invites */}
                      {notification.type === 'event_invite' && content.showActions && (
                        <div className="flex gap-2 mt-3">
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              handleAcceptEventInvite(notification)
                            }}
                            className="flex-1 py-2 px-4 bg-gradient-to-r from-pink-500 to-orange-400 text-white rounded-xl font-medium text-sm hover:opacity-90 transition-all"
                          >
                            View Event
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              handleDeclineEventInvite(notification)
                            }}
                            className="flex-1 py-2 px-4 bg-white/10 border border-white/10 text-white/70 rounded-xl font-medium text-sm hover:bg-white/20 transition-all"
                          >
                            Decline
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
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

            <button className="flex flex-col items-center gap-1 px-6 py-2">
              <svg className="w-6 h-6 text-white/40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
              <span className="text-xs text-white/40">Library</span>
            </button>

            <button
              onClick={() => router.push('/profile')}
              className="flex flex-col items-center gap-1 px-4 py-2"
            >
              <svg className="w-6 h-6 text-white/40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </button>
          </div>
        </div>
      </nav>
    </div>
  )
}
