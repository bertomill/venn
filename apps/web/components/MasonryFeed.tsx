'use client'

import { useEffect, useState, useCallback } from 'react'
import { createSupabaseBrowserClient } from '@/lib/supabase-browser'
import { useRouter } from 'next/navigation'

interface PostMedia {
  id: string
  url: string
  type: 'image' | 'video'
  width: number
  height: number
  aspect_ratio: number
}

interface Post {
  id: string
  user_id: string
  user_name: string
  user_avatar: string
  caption: string
  location: string
  created_at: string
  media: PostMedia[]
  like_count: number
  comment_count: number
  tags: { id: string; name: string }[]
}

interface MasonryFeedProps {
  userId?: string // Filter by user if provided
  interestIds?: string[] // Filter by interests if provided
}

export default function MasonryFeed({ userId, interestIds }: MasonryFeedProps) {
  const router = useRouter()
  const [posts, setPosts] = useState<Post[]>([])
  const [loading, setLoading] = useState(true)
  const [hasMore, setHasMore] = useState(true)
  const [page, setPage] = useState(0)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [likedPosts, setLikedPosts] = useState<Set<string>>(new Set())
  const [savedPosts, setSavedPosts] = useState<Set<string>>(new Set())
  const supabase = createSupabaseBrowserClient()
  const POSTS_PER_PAGE = 20

  useEffect(() => {
    checkUser()
  }, [])

  useEffect(() => {
    if (currentUserId !== null) {
      fetchPosts()
      fetchUserLikesAndSaves()
    }
  }, [currentUserId, userId, interestIds])

  const checkUser = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    setCurrentUserId(user?.id || '')
  }

  const fetchUserLikesAndSaves = async () => {
    if (!currentUserId) return

    const [likesRes, savesRes] = await Promise.all([
      supabase.from('post_likes').select('post_id').eq('user_id', currentUserId),
      supabase.from('post_saves').select('post_id').eq('user_id', currentUserId)
    ])

    if (likesRes.data) {
      setLikedPosts(new Set(likesRes.data.map(l => l.post_id)))
    }
    if (savesRes.data) {
      setSavedPosts(new Set(savesRes.data.map(s => s.post_id)))
    }
  }

  const fetchPosts = async (loadMore = false) => {
    const offset = loadMore ? (page + 1) * POSTS_PER_PAGE : 0

    // Use the database function for feed
    const { data, error } = await supabase.rpc('get_feed_posts', {
      page_limit: POSTS_PER_PAGE,
      page_offset: offset,
      filter_interest_ids: interestIds || null
    })

    if (error) {
      console.error('Error fetching posts:', error)
      setLoading(false)
      return
    }

    const newPosts = (data || []).map((post: any) => ({
      ...post,
      media: post.media || [],
      tags: post.tags || []
    }))

    if (loadMore) {
      setPosts(prev => [...prev, ...newPosts])
      setPage(p => p + 1)
    } else {
      setPosts(newPosts)
      setPage(0)
    }

    setHasMore(newPosts.length === POSTS_PER_PAGE)
    setLoading(false)
  }

  const toggleLike = async (postId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    if (!currentUserId) {
      router.push('/auth/login')
      return
    }

    const isLiked = likedPosts.has(postId)

    // Optimistic update
    setLikedPosts(prev => {
      const next = new Set(prev)
      if (isLiked) {
        next.delete(postId)
      } else {
        next.add(postId)
      }
      return next
    })

    setPosts(prev => prev.map(p => {
      if (p.id === postId) {
        return { ...p, like_count: p.like_count + (isLiked ? -1 : 1) }
      }
      return p
    }))

    // Actual update
    if (isLiked) {
      await supabase.from('post_likes').delete().eq('post_id', postId).eq('user_id', currentUserId)
    } else {
      await supabase.from('post_likes').insert({ post_id: postId, user_id: currentUserId })
    }
  }

  const toggleSave = async (postId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    if (!currentUserId) {
      router.push('/auth/login')
      return
    }

    const isSaved = savedPosts.has(postId)

    // Optimistic update
    setSavedPosts(prev => {
      const next = new Set(prev)
      if (isSaved) {
        next.delete(postId)
      } else {
        next.add(postId)
      }
      return next
    })

    // Actual update
    if (isSaved) {
      await supabase.from('post_saves').delete().eq('post_id', postId).eq('user_id', currentUserId)
    } else {
      await supabase.from('post_saves').insert({ post_id: postId, user_id: currentUserId })
    }
  }

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const seconds = Math.floor((now.getTime() - date.getTime()) / 1000)

    if (seconds < 60) return 'now'
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m`
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h`
    if (seconds < 604800) return `${Math.floor(seconds / 86400)}d`
    return date.toLocaleDateString()
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-white/40">Loading...</div>
      </div>
    )
  }

  if (posts.length === 0) {
    return (
      <div className="text-center py-20">
        <div className="text-6xl mb-4">📸</div>
        <p className="text-white/40 mb-4">No posts yet</p>
        <button
          onClick={() => router.push('/create')}
          className="bg-gradient-to-r from-pink-500 to-orange-400 text-white px-6 py-3 rounded-full font-medium"
        >
          Create First Post
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Masonry Grid */}
      <div className="columns-2 md:columns-3 lg:columns-4 gap-4 space-y-4">
        {posts.map((post) => {
          const primaryMedia = post.media?.[0]
          const aspectRatio = primaryMedia?.aspect_ratio || 1

          return (
            <div
              key={post.id}
              className="break-inside-avoid mb-4 group cursor-pointer"
              onClick={() => router.push(`/post/${post.id}`)}
            >
              <div className="relative rounded-2xl overflow-hidden bg-white/5">
                {/* Media */}
                {primaryMedia ? (
                  primaryMedia.type === 'video' ? (
                    <video
                      src={primaryMedia.url}
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
                      src={primaryMedia.url}
                      alt={post.caption || 'Post'}
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
                {post.media && post.media.length > 1 && (
                  <div className="absolute top-3 right-3 bg-black/60 backdrop-blur-sm px-2 py-1 rounded-full text-xs text-white">
                    +{post.media.length - 1}
                  </div>
                )}

                {/* Video indicator */}
                {primaryMedia?.type === 'video' && (
                  <div className="absolute top-3 left-3 bg-black/60 backdrop-blur-sm p-2 rounded-full">
                    <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M6.3 2.841A1.5 1.5 0 004 4.11V15.89a1.5 1.5 0 002.3 1.269l9.344-5.89a1.5 1.5 0 000-2.538L6.3 2.84z" />
                    </svg>
                  </div>
                )}

                {/* Hover Overlay */}
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-all flex items-center justify-center opacity-0 group-hover:opacity-100">
                  <div className="flex items-center gap-6 text-white">
                    <span className="flex items-center gap-2">
                      <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" clipRule="evenodd" />
                      </svg>
                      {post.like_count}
                    </span>
                    <span className="flex items-center gap-2">
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                      </svg>
                      {post.comment_count}
                    </span>
                  </div>
                </div>
              </div>

              {/* Post Info */}
              <div className="p-3">
                {/* Caption preview */}
                {post.caption && (
                  <p className="text-white text-sm line-clamp-2 mb-2">{post.caption}</p>
                )}

                {/* User and actions */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-pink-500 to-orange-400 flex items-center justify-center text-white text-xs font-bold overflow-hidden">
                      {post.user_avatar ? (
                        <img src={post.user_avatar} alt={post.user_name} className="w-full h-full object-cover" />
                      ) : (
                        post.user_name?.[0]?.toUpperCase() || '?'
                      )}
                    </div>
                    <span className="text-white/60 text-sm truncate max-w-[100px]">{post.user_name}</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={(e) => toggleLike(post.id, e)}
                      className={`p-2 rounded-full transition-colors ${
                        likedPosts.has(post.id)
                          ? 'text-red-500'
                          : 'text-white/40 hover:text-white'
                      }`}
                    >
                      <svg className="w-5 h-5" fill={likedPosts.has(post.id) ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                      </svg>
                    </button>
                    <button
                      onClick={(e) => toggleSave(post.id, e)}
                      className={`p-2 rounded-full transition-colors ${
                        savedPosts.has(post.id)
                          ? 'text-yellow-500'
                          : 'text-white/40 hover:text-white'
                      }`}
                    >
                      <svg className="w-5 h-5" fill={savedPosts.has(post.id) ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Load More */}
      {hasMore && (
        <div className="flex justify-center py-8">
          <button
            onClick={() => fetchPosts(true)}
            className="bg-white/10 hover:bg-white/20 text-white px-6 py-3 rounded-full font-medium transition-colors"
          >
            Load More
          </button>
        </div>
      )}
    </div>
  )
}
