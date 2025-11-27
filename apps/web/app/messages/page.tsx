'use client'

import { useEffect, useState } from 'react'
import { createSupabaseBrowserClient } from '@/lib/supabase-browser'
import { useRouter } from 'next/navigation'
import AppShell from '@/components/AppShell'

interface Conversation {
  other_user_id: string
  last_message_content?: string
  last_message_created_at?: string
  last_message_sender_id?: string
  last_message?: string
  last_message_time?: string
  unread_count: number
  other_user?: {
    id: string
    full_name: string | null
    avatar_url: string | null
  }
}

export default function MessagesPage() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createSupabaseBrowserClient()

  useEffect(() => {
    checkUser()
  }, [])

  useEffect(() => {
    if (!user) return

    // Subscribe to new messages for real-time updates
    const channel = supabase
      .channel('messages-list')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'messages'
        },
        () => {
          fetchConversations()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [user])

  const checkUser = async () => {
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      router.push('/auth/login')
      return
    }

    setUser(user)
    await fetchConversations()
    setLoading(false)
  }

  const fetchConversations = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    // Try the RPC function first
    const { data: convos, error: rpcError } = await supabase
      .rpc('get_conversations' as never, { current_user_id: user.id } as never)

    if (rpcError) {
      console.error('RPC error, falling back to direct query:', rpcError)
      // Fallback: get unique conversation partners from messages
      await fetchConversationsFallback(user.id)
      return
    }

    const typedConvos = convos as { other_user_id: string; last_message: string; last_message_time: string; unread_count: number }[] | null
    if (!typedConvos || typedConvos.length === 0) {
      setConversations([])
      return
    }

    // Fetch profile info for each conversation partner
    const userIds = typedConvos.map((c) => c.other_user_id)
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, full_name, avatar_url')
      .in('id', userIds)

    type Profile = { id: string; full_name: string | null; avatar_url: string | null }
    const typedProfiles = profiles as Profile[] | null
    const profileMap = new Map(typedProfiles?.map(p => [p.id, p]) || [])

    const conversationsWithProfiles = typedConvos.map((c) => ({
      ...c,
      other_user: profileMap.get(c.other_user_id)
    }))

    setConversations(conversationsWithProfiles)
  }

  const fetchConversationsFallback = async (userId: string) => {
    // Get all messages involving the user
    const { data: messages, error } = await supabase
      .from('messages')
      .select('*')
      .or(`sender_id.eq.${userId},receiver_id.eq.${userId}`)
      .order('created_at', { ascending: false })

    if (error || !messages) {
      console.error('Error fetching messages:', error)
      setConversations([])
      return
    }

    type MessageType = { id: string; sender_id: string; receiver_id: string; content: string; read: boolean; created_at: string }
    const typedMessages = messages as MessageType[]

    // Group by conversation partner and get last message
    const conversationMap = new Map<string, any>()

    for (const msg of typedMessages) {
      const partnerId = msg.sender_id === userId ? msg.receiver_id : msg.sender_id

      if (!conversationMap.has(partnerId)) {
        conversationMap.set(partnerId, {
          other_user_id: partnerId,
          last_message_content: msg.content,
          last_message_created_at: msg.created_at,
          last_message_sender_id: msg.sender_id,
          unread_count: 0
        })
      }

      // Count unread messages from this partner
      if (msg.receiver_id === userId && !msg.read) {
        const conv = conversationMap.get(partnerId)
        conv.unread_count++
      }
    }

    const convos = Array.from(conversationMap.values())

    // Fetch profile info
    const userIds = convos.map(c => c.other_user_id)
    if (userIds.length === 0) {
      setConversations([])
      return
    }

    const { data: profiles2 } = await supabase
      .from('profiles')
      .select('id, full_name, avatar_url')
      .in('id', userIds)

    const typedProfiles2 = profiles2 as { id: string; full_name: string | null; avatar_url: string | null }[] | null
    const profileMap2 = new Map(typedProfiles2?.map(p => [p.id, p]) || [])

    const conversationsWithProfiles = convos.map(c => ({
      ...c,
      other_user: profileMap2.get(c.other_user_id)
    }))

    setConversations(conversationsWithProfiles)
  }

  const getInitials = (name: string | null) => {
    if (!name) return '?'
    return name[0].toUpperCase()
  }

  const formatTime = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMins < 1) return 'Just now'
    if (diffMins < 60) return `${diffMins}m`
    if (diffHours < 24) return `${diffHours}h`
    if (diffDays < 7) return `${diffDays}d`
    return date.toLocaleDateString()
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
        <div className="text-lg text-white/60">Loading...</div>
      </div>
    )
  }

  return (
    <AppShell showHeader={false}>
      {/* Page Header */}
      <header className="sticky top-0 z-40 bg-[#0a0a0a]/80 backdrop-blur-xl border-b border-white/10 lg:static lg:bg-transparent lg:border-0">
        <div className="px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.back()}
              className="p-2 text-white/60 hover:text-white transition-colors lg:hidden"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <h1 className="text-xl font-bold text-white lg:text-2xl">Messages</h1>
          </div>

          {/* New message button */}
          <button
            onClick={() => router.push('/discover')}
            className="p-2 text-white/60 hover:text-white transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
          </button>
        </div>
      </header>

      <main className="px-4 py-4">
        {conversations.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-10 h-10 text-white/20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
            </div>
            <h2 className="text-xl font-semibold text-white mb-2">No Messages Yet</h2>
            <p className="text-white/60 mb-6">Start a conversation with someone!</p>
            <button
              onClick={() => router.push('/discover')}
              className="px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-xl font-semibold hover:opacity-90 transition-all"
            >
              Find People
            </button>
          </div>
        ) : (
          <div className="space-y-1">
            {conversations.map((conv) => (
              <button
                key={conv.other_user_id}
                onClick={() => router.push(`/messages/${conv.other_user_id}`)}
                className="w-full flex items-center gap-4 p-4 rounded-2xl hover:bg-white/5 transition-all text-left"
              >
                {/* Avatar */}
                <div className="relative">
                  <div className="w-14 h-14 rounded-full bg-gradient-to-br from-pink-400 via-purple-500 to-blue-600 flex items-center justify-center text-white text-xl font-bold overflow-hidden flex-shrink-0">
                    {conv.other_user?.avatar_url ? (
                      <img
                        src={conv.other_user.avatar_url}
                        alt={conv.other_user.full_name || '?'}
                        className="w-full h-full rounded-full object-cover"
                      />
                    ) : (
                      getInitials(conv.other_user?.full_name || null)
                    )}
                  </div>
                  {/* Online indicator (optional, could be implemented later) */}
                </div>

                {/* Message preview */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <h3 className={`font-semibold truncate ${conv.unread_count > 0 ? 'text-white' : 'text-white/80'}`}>
                      {conv.other_user?.full_name || 'Unknown User'}
                    </h3>
                    <span className="text-xs text-white/40 flex-shrink-0 ml-2">
                      {formatTime(conv.last_message_created_at || conv.last_message_time || '')}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <p className={`text-sm truncate flex-1 ${conv.unread_count > 0 ? 'text-white/80 font-medium' : 'text-white/50'}`}>
                      {conv.last_message_sender_id === user?.id && (
                        <span className="text-white/40">You: </span>
                      )}
                      {conv.last_message_content}
                    </p>
                    {conv.unread_count > 0 && (
                      <span className="w-5 h-5 bg-blue-500 text-white text-xs font-bold rounded-full flex items-center justify-center flex-shrink-0">
                        {conv.unread_count > 9 ? '9+' : conv.unread_count}
                      </span>
                    )}
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </main>
    </AppShell>
  )
}
