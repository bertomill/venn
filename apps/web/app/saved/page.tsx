'use client'

import { useEffect, useState } from 'react'
import { createSupabaseBrowserClient } from '@/lib/supabase-browser'
import { useRouter } from 'next/navigation'
import AppShell from '@/components/AppShell'

interface SavedPost {
  id: string
  post_id: string
  board_name: string
  created_at: string
  posts: {
    id: string
    caption: string
    user_id: string
    profiles: {
      id: string
      full_name: string
      avatar_url: string | null
    }
    post_media: {
      id: string
      media_url: string
      media_type: 'image' | 'video'
      width: number
      height: number
    }[]
  }
}

export default function SavedPostsPage() {
  const router = useRouter()
  const [savedPosts, setSavedPosts] = useState<SavedPost[]>([])
  const [loading, setLoading] = useState(true)
  const [currentUser, setCurrentUser] = useState<any>(null)
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

    setCurrentUser(user)
    await fetchSavedPosts(user.id)
    setLoading(false)
  }

  const fetchSavedPosts = async (userId: string) => {
    const { data, error } = await supabase
      .from('post_saves')
      .select(`
        id,
        post_id,
        board_name,
        created_at,
        posts (
          id,
          caption,
          user_id,
          profiles (id, full_name, avatar_url),
          post_media (id, media_url, media_type, width, height)
        )
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false })

    if (data) {
      // Filter out any saves where the post was deleted and transform the data
      // Supabase returns nested relations as arrays, so we need to extract first items
      const validSaves = data
        .filter(save => save.posts !== null && (save.posts as unknown[]).length > 0)
        .map(save => {
          const postsArray = save.posts as unknown[]
          const post = postsArray[0] as {
            id: string
            caption: string
            user_id: string
            profiles: { id: string; full_name: string; avatar_url: string | null }[]
            post_media: { id: string; media_url: string; media_type: 'image' | 'video'; width: number; height: number }[]
          }
          return {
            id: save.id,
            post_id: save.post_id,
            board_name: save.board_name,
            created_at: save.created_at,
            posts: {
              id: post.id,
              caption: post.caption,
              user_id: post.user_id,
              profiles: Array.isArray(post.profiles) ? post.profiles[0] : post.profiles,
              post_media: post.post_media
            }
          }
        }) as SavedPost[]
      setSavedPosts(validSaves)
    }
  }

  const unsavePost = async (saveId: string, _postId: string) => {
    await supabase.from('post_saves').delete().eq('id', saveId)
    setSavedPosts(prev => prev.filter(s => s.id !== saveId))
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
        <div className="text-white/60">Loading...</div>
      </div>
    )
  }

  return (
    <AppShell showHeader={false}>
      {/* Page Header */}
      <header className="sticky top-0 z-40 bg-black/40 backdrop-blur-xl border-b border-white/5 lg:static lg:bg-transparent lg:border-0">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <button
              onClick={() => router.back()}
              className="text-white/60 hover:text-white transition-colors lg:hidden"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <h1 className="text-lg font-semibold text-white lg:text-2xl lg:font-bold">Saved Posts</h1>
            <div className="w-6 lg:hidden" />
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6">
        {savedPosts.length === 0 ? (
          <div className="text-center py-20">
            <div className="text-6xl mb-4">🔖</div>
            <p className="text-white/60 mb-2">No saved posts yet</p>
            <p className="text-white/40 text-sm mb-6">Posts you save will appear here</p>
            <button
              onClick={() => router.push('/dashboard')}
              className="bg-gradient-to-r from-pink-500 to-orange-400 text-white px-6 py-3 rounded-full font-medium"
            >
              Browse Feed
            </button>
          </div>
        ) : (
          <div className="columns-2 md:columns-3 gap-4 space-y-4">
            {savedPosts.map((save) => {
              const post = save.posts
              const primaryMedia = post.post_media?.[0]
              const aspectRatio = primaryMedia ? primaryMedia.width / primaryMedia.height : 1

              return (
                <div
                  key={save.id}
                  className="break-inside-avoid mb-4 group"
                >
                  <div className="relative rounded-2xl overflow-hidden bg-white/5">
                    {/* Media */}
                    <button
                      onClick={() => router.push(`/post/${post.id}`)}
                      className="w-full text-left"
                    >
                      {primaryMedia ? (
                        primaryMedia.media_type === 'video' ? (
                          <video
                            src={primaryMedia.media_url}
                            className="w-full object-cover"
                            style={{ aspectRatio: aspectRatio }}
                            muted
                            loop
                            playsInline
                            onMouseEnter={(e) => e.currentTarget.play()}
                            onMouseLeave={(e) => {
                              e.currentTarget.pause()
                              e.currentTarget.currentTime = 0
                            }}
                          />
                        ) : (
                          <img
                            src={primaryMedia.media_url}
                            alt={post.caption || 'Saved post'}
                            className="w-full object-cover"
                            style={{ aspectRatio: aspectRatio }}
                            loading="lazy"
                          />
                        )
                      ) : (
                        <div className="aspect-square bg-gradient-to-br from-pink-500/20 to-orange-500/20 flex items-center justify-center">
                          <span className="text-4xl">📝</span>
                        </div>
                      )}

                      {/* Multiple images indicator */}
                      {post.post_media && post.post_media.length > 1 && (
                        <div className="absolute top-3 right-3 bg-black/60 backdrop-blur-sm px-2 py-1 rounded-full text-xs text-white">
                          +{post.post_media.length - 1}
                        </div>
                      )}

                      {/* Video indicator */}
                      {primaryMedia?.media_type === 'video' && (
                        <div className="absolute top-3 left-3 bg-black/60 backdrop-blur-sm p-2 rounded-full">
                          <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M6.3 2.841A1.5 1.5 0 004 4.11V15.89a1.5 1.5 0 002.3 1.269l9.344-5.89a1.5 1.5 0 000-2.538L6.3 2.84z" />
                          </svg>
                        </div>
                      )}
                    </button>

                    {/* Unsave button - visible on hover */}
                    <button
                      onClick={() => unsavePost(save.id, post.id)}
                      className="absolute top-3 right-3 bg-black/60 backdrop-blur-sm p-2 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <svg className="w-5 h-5 text-yellow-500" fill="currentColor" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                      </svg>
                    </button>
                  </div>

                  {/* Post Info */}
                  <div className="p-3">
                    {post.caption && (
                      <p className="text-white text-sm line-clamp-2 mb-2">{post.caption}</p>
                    )}

                    {/* Author */}
                    <button
                      onClick={() => router.push(`/user/${post.profiles.id}`)}
                      className="flex items-center gap-2"
                    >
                      <div className="w-6 h-6 rounded-full bg-gradient-to-br from-pink-500 to-orange-400 flex items-center justify-center text-white text-xs font-bold overflow-hidden">
                        {post.profiles.avatar_url ? (
                          <img src={post.profiles.avatar_url} alt={post.profiles.full_name} className="w-full h-full object-cover" />
                        ) : (
                          post.profiles.full_name?.[0]?.toUpperCase() || '?'
                        )}
                      </div>
                      <span className="text-white/60 text-sm truncate">{post.profiles.full_name}</span>
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </main>
    </AppShell>
  )
}
