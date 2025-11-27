'use client'

import { useEffect, useState } from 'react'
import { createSupabaseBrowserClient } from '@/lib/supabase-browser'
import { useRouter } from 'next/navigation'
import AppShell from '@/components/AppShell'
import AISearchBox from '@/components/AISearchBox'
import MasonryFeed from '@/components/MasonryFeed'

interface Profile {
  id: string
  full_name: string
  bio: string
  avatar_url: string
}

export default function DashboardPage() {
  const router = useRouter()
  const [profile, setProfile] = useState<Profile | null>(null)
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

    await fetchProfile(user.id)
    setLoading(false)
  }

  const fetchProfile = async (userId: string) => {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single()

    if (data) {
      setProfile(data)
    }
  }

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push('/')
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
        <div className="text-lg text-white/60">Loading...</div>
      </div>
    )
  }

  return (
    <AppShell profile={profile} onSignOut={handleSignOut}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* AI Search Section */}
        <section className="py-16 md:py-24">
          <AISearchBox />
        </section>

        {/* Divider */}
        <div className="border-t border-white/10" />

        {/* From the Community Section */}
        <section className="py-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-2xl font-bold text-white">From the Community</h2>
              <p className="text-white/50 mt-1">See what people are sharing and doing</p>
            </div>
            <button
              onClick={() => router.push('/discover')}
              className="flex items-center gap-2 text-white/60 hover:text-white transition-colors text-sm"
            >
              <span>Browse All</span>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
          <MasonryFeed />
        </section>
      </div>
    </AppShell>
  )
}
