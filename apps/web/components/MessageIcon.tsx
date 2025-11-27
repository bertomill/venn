'use client'

import { useEffect, useState } from 'react'
import { createSupabaseBrowserClient } from '@/lib/supabase-browser'
import { useRouter } from 'next/navigation'

interface MessageIconProps {
  showBadgeOnly?: boolean // For sidebar - just show icon with badge, no button wrapper
}

export default function MessageIcon({ showBadgeOnly = false }: MessageIconProps) {
  const router = useRouter()
  const [unreadCount, setUnreadCount] = useState(0)
  const supabase = createSupabaseBrowserClient()

  useEffect(() => {
    fetchUnreadCount()

    // Subscribe to new messages
    const channel = supabase
      .channel('messages')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages'
        },
        () => {
          fetchUnreadCount()
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'messages'
        },
        () => {
          fetchUnreadCount()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  const fetchUnreadCount = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { count } = await supabase
      .from('messages')
      .select('*', { count: 'exact', head: true })
      .eq('receiver_id', user.id)
      .eq('read', false)

    setUnreadCount(count || 0)
  }

  const icon = (
    <div className="relative">
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
      </svg>
      {unreadCount > 0 && (
        <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center">
          {unreadCount > 9 ? '9+' : unreadCount}
        </span>
      )}
    </div>
  )

  if (showBadgeOnly) {
    return icon
  }

  return (
    <button
      onClick={() => router.push('/messages')}
      className="relative p-2 text-white/60 hover:text-white transition-colors"
    >
      {icon}
    </button>
  )
}
