'use client'

import { useEffect, useState, useRef } from 'react'
import { createSupabaseBrowserClient } from '@/lib/supabase-browser'
import { useRouter, useParams } from 'next/navigation'

interface Message {
  id: string
  sender_id: string
  receiver_id: string
  content: string
  read: boolean
  created_at: string
}

interface Profile {
  id: string
  full_name: string | null
  avatar_url: string | null
}

export default function ChatPage() {
  const router = useRouter()
  const params = useParams()
  const otherUserId = params.userId as string

  const [currentUser, setCurrentUser] = useState<any>(null)
  const [otherUser, setOtherUser] = useState<Profile | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const supabase = createSupabaseBrowserClient()

  useEffect(() => {
    checkUser()
  }, [otherUserId])

  useEffect(() => {
    if (!currentUser) return

    // Subscribe to new messages in this conversation
    // We need two separate subscriptions since real-time doesn't support complex OR filters
    const channel = supabase
      .channel(`chat-${currentUser.id}-${otherUserId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `sender_id=eq.${currentUser.id}`
        },
        (payload) => {
          const newMsg = payload.new as Message
          // Only add if it's part of this conversation
          if (newMsg.receiver_id === otherUserId) {
            setMessages(prev => {
              // Prevent duplicates
              if (prev.some(m => m.id === newMsg.id)) return prev
              return [...prev, newMsg]
            })
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `receiver_id=eq.${currentUser.id}`
        },
        (payload) => {
          const newMsg = payload.new as Message
          // Only add if it's from the other user in this conversation
          if (newMsg.sender_id === otherUserId) {
            setMessages(prev => {
              // Prevent duplicates
              if (prev.some(m => m.id === newMsg.id)) return prev
              return [...prev, newMsg]
            })
            // Mark as read since we received it
            markAsRead(newMsg.id)
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [currentUser, otherUserId])

  useEffect(() => {
    // Scroll to bottom when messages change
    scrollToBottom()
  }, [messages])

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  const checkUser = async () => {
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      router.push('/auth/login')
      return
    }

    // Prevent chatting with yourself
    if (user.id === otherUserId) {
      router.push('/messages')
      return
    }

    setCurrentUser(user)
    await Promise.all([
      fetchOtherUser(),
      fetchMessages(user.id)
    ])
    setLoading(false)
  }

  const fetchOtherUser = async () => {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, full_name, avatar_url')
      .eq('id', otherUserId)
      .single()

    if (error) {
      console.error('Error fetching user:', error)
      return
    }

    setOtherUser(data)
  }

  const fetchMessages = async (userId: string) => {
    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .or(`and(sender_id.eq.${userId},receiver_id.eq.${otherUserId}),and(sender_id.eq.${otherUserId},receiver_id.eq.${userId})`)
      .order('created_at', { ascending: true })

    if (error) {
      console.error('Error fetching messages:', error)
      return
    }

    const typedData = data as Message[] | null
    setMessages(typedData || [])

    // Mark unread messages as read
    const unreadIds = typedData
      ?.filter(m => m.receiver_id === userId && !m.read)
      .map(m => m.id) || []

    if (unreadIds.length > 0) {
      await supabase
        .from('messages')
        .update({ read: true } as never)
        .in('id', unreadIds)
    }
  }

  const markAsRead = async (messageId: string) => {
    await supabase
      .from('messages')
      .update({ read: true } as never)
      .eq('id', messageId)
  }

  const sendMessage = async () => {
    if (!newMessage.trim() || !currentUser || sending) return

    setSending(true)
    const content = newMessage.trim()
    setNewMessage('')

    const { error } = await supabase
      .from('messages')
      .insert({
        sender_id: currentUser.id,
        receiver_id: otherUserId,
        content
      } as never)

    if (error) {
      console.error('Error sending message:', error)
      setNewMessage(content) // Restore message on error
    }

    setSending(false)
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  const getInitials = (name: string | null) => {
    if (!name) return '?'
    return name[0].toUpperCase()
  }

  const formatTime = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    })
  }

  const formatDateHeader = (dateString: string) => {
    const date = new Date(dateString)
    const today = new Date()
    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)

    if (date.toDateString() === today.toDateString()) {
      return 'Today'
    } else if (date.toDateString() === yesterday.toDateString()) {
      return 'Yesterday'
    } else {
      return date.toLocaleDateString('en-US', {
        weekday: 'long',
        month: 'short',
        day: 'numeric'
      })
    }
  }

  // Group messages by date
  const groupMessagesByDate = (messages: Message[]) => {
    const groups: { date: string; messages: Message[] }[] = []

    messages.forEach(msg => {
      const dateKey = new Date(msg.created_at).toDateString()
      const lastGroup = groups[groups.length - 1]

      if (lastGroup && new Date(lastGroup.messages[0].created_at).toDateString() === dateKey) {
        lastGroup.messages.push(msg)
      } else {
        groups.push({ date: dateKey, messages: [msg] })
      }
    })

    return groups
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
        <div className="text-lg text-white/60">Loading...</div>
      </div>
    )
  }

  if (!otherUser) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex flex-col items-center justify-center">
        <div className="text-xl text-white mb-4">User not found</div>
        <button
          onClick={() => router.push('/messages')}
          className="text-purple-400 hover:text-purple-300"
        >
          Back to messages
        </button>
      </div>
    )
  }

  const messageGroups = groupMessagesByDate(messages)

  return (
    <div className="min-h-screen bg-[#0a0a0a] flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-[#0a0a0a]/80 backdrop-blur-xl border-b border-white/10">
        <div className="px-4 py-3 flex items-center gap-4">
          <button
            onClick={() => router.push('/messages')}
            className="p-2 text-white/60 hover:text-white transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>

          {/* User info */}
          <button
            onClick={() => router.push(`/user/${otherUserId}`)}
            className="flex items-center gap-3 flex-1"
          >
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-pink-400 via-purple-500 to-blue-600 flex items-center justify-center text-white font-bold overflow-hidden">
              {otherUser.avatar_url ? (
                <img
                  src={otherUser.avatar_url}
                  alt={otherUser.full_name || '?'}
                  className="w-full h-full rounded-full object-cover"
                />
              ) : (
                getInitials(otherUser.full_name)
              )}
            </div>
            <div className="text-left">
              <h1 className="text-white font-semibold">{otherUser.full_name || 'Unknown User'}</h1>
              <p className="text-white/40 text-xs">Tap to view profile</p>
            </div>
          </button>
        </div>
      </header>

      {/* Messages */}
      <main className="flex-1 overflow-y-auto px-4 py-4">
        {messages.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-pink-400 via-purple-500 to-blue-600 flex items-center justify-center text-white text-3xl font-bold mx-auto mb-4 overflow-hidden">
              {otherUser.avatar_url ? (
                <img
                  src={otherUser.avatar_url}
                  alt={otherUser.full_name || '?'}
                  className="w-full h-full rounded-full object-cover"
                />
              ) : (
                getInitials(otherUser.full_name)
              )}
            </div>
            <h2 className="text-xl font-semibold text-white mb-2">{otherUser.full_name}</h2>
            <p className="text-white/60">Start a conversation!</p>
          </div>
        ) : (
          <div className="space-y-4">
            {messageGroups.map((group, groupIndex) => (
              <div key={groupIndex}>
                {/* Date header */}
                <div className="flex justify-center my-4">
                  <span className="px-3 py-1 bg-white/10 rounded-full text-xs text-white/60">
                    {formatDateHeader(group.messages[0].created_at)}
                  </span>
                </div>

                {/* Messages for this date */}
                <div className="space-y-2">
                  {group.messages.map((msg, msgIndex) => {
                    const isMe = msg.sender_id === currentUser?.id
                    const showAvatar = !isMe && (
                      msgIndex === 0 ||
                      group.messages[msgIndex - 1].sender_id !== msg.sender_id
                    )

                    return (
                      <div
                        key={msg.id}
                        className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}
                      >
                        {/* Other user avatar */}
                        {!isMe && (
                          <div className="w-8 mr-2 flex-shrink-0">
                            {showAvatar && (
                              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-pink-400 via-purple-500 to-blue-600 flex items-center justify-center text-white text-xs font-bold overflow-hidden">
                                {otherUser.avatar_url ? (
                                  <img
                                    src={otherUser.avatar_url}
                                    alt={otherUser.full_name || '?'}
                                    className="w-full h-full rounded-full object-cover"
                                  />
                                ) : (
                                  getInitials(otherUser.full_name)
                                )}
                              </div>
                            )}
                          </div>
                        )}

                        {/* Message bubble */}
                        <div className={`max-w-[75%] ${isMe ? 'order-1' : ''}`}>
                          <div
                            className={`px-4 py-2 rounded-2xl ${
                              isMe
                                ? 'bg-blue-500 text-white rounded-br-md'
                                : 'bg-white/10 text-white rounded-bl-md'
                            }`}
                          >
                            <p className="whitespace-pre-wrap break-words">{msg.content}</p>
                          </div>
                          <p className={`text-xs text-white/40 mt-1 ${isMe ? 'text-right' : 'text-left'}`}>
                            {formatTime(msg.created_at)}
                            {isMe && msg.read && (
                              <span className="ml-1">Read</span>
                            )}
                          </p>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
        )}
      </main>

      {/* Message input */}
      <div className="sticky bottom-0 bg-[#0a0a0a] border-t border-white/10 p-4 safe-area-bottom">
        <div className="flex items-end gap-3">
          <div className="flex-1 bg-white/10 rounded-2xl px-4 py-3">
            <textarea
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Message..."
              rows={1}
              className="w-full bg-transparent text-white placeholder-white/40 resize-none focus:outline-none max-h-32"
              style={{ minHeight: '24px' }}
            />
          </div>

          <button
            onClick={sendMessage}
            disabled={!newMessage.trim() || sending}
            className={`p-3 rounded-full transition-all ${
              newMessage.trim()
                ? 'bg-blue-500 text-white hover:bg-blue-600'
                : 'bg-white/10 text-white/40'
            }`}
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  )
}
