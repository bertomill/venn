'use client'

import { useEffect, useState } from 'react'
import { createSupabaseBrowserClient } from '@/lib/supabase-browser'
import { useRouter, useParams } from 'next/navigation'

interface PostMedia {
  id: string
  media_url: string
  media_type: 'image' | 'video'
  width: number
  height: number
  display_order: number
}

interface Comment {
  id: string
  content: string
  created_at: string
  user_id: string
  parent_comment_id: string | null
  profiles: {
    id: string
    full_name: string
    avatar_url: string | null
  }
  replies?: Comment[]
}

interface Post {
  id: string
  caption: string
  location: string | null
  created_at: string
  user_id: string
  profiles: {
    id: string
    full_name: string
    avatar_url: string | null
  }
  post_media: PostMedia[]
  post_tags: {
    interests: {
      id: string
      name: string
    }
  }[]
}

export default function PostDetailPage() {
  const router = useRouter()
  const params = useParams()
  const postId = params.id as string

  const [post, setPost] = useState<Post | null>(null)
  const [comments, setComments] = useState<Comment[]>([])
  const [loading, setLoading] = useState(true)
  const [currentUser, setCurrentUser] = useState<any>(null)
  const [isLiked, setIsLiked] = useState(false)
  const [isSaved, setIsSaved] = useState(false)
  const [likeCount, setLikeCount] = useState(0)
  const [newComment, setNewComment] = useState('')
  const [submittingComment, setSubmittingComment] = useState(false)
  const [currentMediaIndex, setCurrentMediaIndex] = useState(0)
  const [replyingTo, setReplyingTo] = useState<string | null>(null)

  const supabase = createSupabaseBrowserClient()

  useEffect(() => {
    checkUser()
  }, [postId])

  const checkUser = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    setCurrentUser(user)
    await fetchPost()
    if (user) {
      await fetchUserInteractions(user.id)
    }
    await fetchComments()
    setLoading(false)
  }

  const fetchPost = async () => {
    const { data, error } = await supabase
      .from('posts')
      .select(`
        *,
        profiles (id, full_name, avatar_url),
        post_media (id, media_url, media_type, width, height, display_order),
        post_tags (interests (id, name))
      `)
      .eq('id', postId)
      .single()

    if (data) {
      setPost(data)
      // Fetch like count
      const { count } = await supabase
        .from('post_likes')
        .select('*', { count: 'exact', head: true })
        .eq('post_id', postId)
      setLikeCount(count || 0)
    }
  }

  const fetchUserInteractions = async (userId: string) => {
    const [likeRes, saveRes] = await Promise.all([
      supabase.from('post_likes').select('id').eq('post_id', postId).eq('user_id', userId).single(),
      supabase.from('post_saves').select('id').eq('post_id', postId).eq('user_id', userId).single()
    ])

    setIsLiked(!!likeRes.data)
    setIsSaved(!!saveRes.data)
  }

  const fetchComments = async () => {
    const { data } = await supabase
      .from('post_comments')
      .select(`
        *,
        profiles (id, full_name, avatar_url)
      `)
      .eq('post_id', postId)
      .order('created_at', { ascending: true })

    if (data) {
      // Organize into threads (parent comments with replies)
      const parentComments = data.filter(c => !c.parent_comment_id)
      const replies = data.filter(c => c.parent_comment_id)

      const threaded = parentComments.map(parent => ({
        ...parent,
        replies: replies.filter(r => r.parent_comment_id === parent.id)
      }))

      setComments(threaded)
    }
  }

  const toggleLike = async () => {
    if (!currentUser) {
      router.push('/auth/login')
      return
    }

    // Optimistic update
    setIsLiked(!isLiked)
    setLikeCount(prev => isLiked ? prev - 1 : prev + 1)

    if (isLiked) {
      await supabase.from('post_likes').delete().eq('post_id', postId).eq('user_id', currentUser.id)
    } else {
      await supabase.from('post_likes').insert({ post_id: postId, user_id: currentUser.id })
    }
  }

  const toggleSave = async () => {
    if (!currentUser) {
      router.push('/auth/login')
      return
    }

    // Optimistic update
    setIsSaved(!isSaved)

    if (isSaved) {
      await supabase.from('post_saves').delete().eq('post_id', postId).eq('user_id', currentUser.id)
    } else {
      await supabase.from('post_saves').insert({ post_id: postId, user_id: currentUser.id })
    }
  }

  const submitComment = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!currentUser || !newComment.trim()) return

    setSubmittingComment(true)

    const { error } = await supabase.from('post_comments').insert({
      post_id: postId,
      user_id: currentUser.id,
      content: newComment.trim(),
      parent_comment_id: replyingTo
    })

    if (!error) {
      setNewComment('')
      setReplyingTo(null)
      await fetchComments()
    }

    setSubmittingComment(false)
  }

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const seconds = Math.floor((now.getTime() - date.getTime()) / 1000)

    if (seconds < 60) return 'now'
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`
    if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`
    return date.toLocaleDateString()
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
        <div className="text-white/60">Loading...</div>
      </div>
    )
  }

  if (!post) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
        <div className="text-center">
          <div className="text-5xl mb-4">😕</div>
          <p className="text-white/60 mb-4">Post not found</p>
          <button
            onClick={() => router.push('/dashboard')}
            className="text-purple-400 hover:text-purple-300"
          >
            Go back home
          </button>
        </div>
      </div>
    )
  }

  const sortedMedia = [...(post.post_media || [])].sort((a, b) => a.display_order - b.display_order)

  return (
    <div className="min-h-screen bg-[#0a0a0a]">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-black/40 backdrop-blur-xl border-b border-white/5">
        <div className="max-w-3xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <button
              onClick={() => router.back()}
              className="text-white/60 hover:text-white transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <h1 className="text-lg font-semibold text-white">Post</h1>
            <div className="w-6" /> {/* Spacer */}
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto pb-24">
        {/* Media Carousel */}
        {sortedMedia.length > 0 && (
          <div className="relative bg-black">
            {sortedMedia[currentMediaIndex].media_type === 'video' ? (
              <video
                src={sortedMedia[currentMediaIndex].media_url}
                className="w-full max-h-[70vh] object-contain"
                controls
                playsInline
              />
            ) : (
              <img
                src={sortedMedia[currentMediaIndex].media_url}
                alt={post.caption || 'Post image'}
                className="w-full max-h-[70vh] object-contain"
              />
            )}

            {/* Navigation arrows */}
            {sortedMedia.length > 1 && (
              <>
                {currentMediaIndex > 0 && (
                  <button
                    onClick={() => setCurrentMediaIndex(prev => prev - 1)}
                    className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 bg-black/60 rounded-full flex items-center justify-center text-white hover:bg-black/80"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                  </button>
                )}
                {currentMediaIndex < sortedMedia.length - 1 && (
                  <button
                    onClick={() => setCurrentMediaIndex(prev => prev + 1)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 bg-black/60 rounded-full flex items-center justify-center text-white hover:bg-black/80"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                )}

                {/* Dots indicator */}
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-1.5">
                  {sortedMedia.map((_, idx) => (
                    <button
                      key={idx}
                      onClick={() => setCurrentMediaIndex(idx)}
                      className={`w-2 h-2 rounded-full transition-all ${
                        idx === currentMediaIndex ? 'bg-white w-4' : 'bg-white/50'
                      }`}
                    />
                  ))}
                </div>
              </>
            )}
          </div>
        )}

        {/* Post Content */}
        <div className="px-4 py-4">
          {/* Actions */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-4">
              <button onClick={toggleLike} className="flex items-center gap-2">
                <svg
                  className={`w-7 h-7 ${isLiked ? 'text-red-500' : 'text-white'}`}
                  fill={isLiked ? 'currentColor' : 'none'}
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                </svg>
              </button>
              <button className="text-white">
                <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
              </button>
            </div>
            <button onClick={toggleSave}>
              <svg
                className={`w-7 h-7 ${isSaved ? 'text-yellow-500' : 'text-white'}`}
                fill={isSaved ? 'currentColor' : 'none'}
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
              </svg>
            </button>
          </div>

          {/* Like count */}
          {likeCount > 0 && (
            <p className="text-white font-semibold mb-2">
              {likeCount} {likeCount === 1 ? 'like' : 'likes'}
            </p>
          )}

          {/* Author and caption */}
          <div className="mb-4">
            <button
              onClick={() => router.push(`/user/${post.profiles.id}`)}
              className="flex items-center gap-3 mb-3"
            >
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-pink-500 to-orange-400 flex items-center justify-center overflow-hidden">
                {post.profiles.avatar_url ? (
                  <img src={post.profiles.avatar_url} alt={post.profiles.full_name} className="w-full h-full object-cover" />
                ) : (
                  <span className="text-white font-bold">{post.profiles.full_name?.[0]?.toUpperCase() || '?'}</span>
                )}
              </div>
              <div>
                <p className="text-white font-semibold">{post.profiles.full_name}</p>
                {post.location && (
                  <p className="text-white/50 text-sm">{post.location}</p>
                )}
              </div>
            </button>

            {post.caption && (
              <p className="text-white whitespace-pre-wrap">{post.caption}</p>
            )}
          </div>

          {/* Tags */}
          {post.post_tags?.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-4">
              {post.post_tags.map((tag, idx) => (
                <span key={idx} className="px-3 py-1 bg-white/10 text-white/70 rounded-full text-sm">
                  {tag.interests.name}
                </span>
              ))}
            </div>
          )}

          {/* Timestamp */}
          <p className="text-white/40 text-sm mb-6">{formatTimeAgo(post.created_at)}</p>

          {/* Comments Section */}
          <div className="border-t border-white/10 pt-4">
            <h3 className="text-white font-semibold mb-4">Comments ({comments.length})</h3>

            {comments.length === 0 ? (
              <p className="text-white/40 text-sm mb-4">No comments yet. Be the first!</p>
            ) : (
              <div className="space-y-4 mb-4">
                {comments.map((comment) => (
                  <div key={comment.id}>
                    {/* Parent comment */}
                    <div className="flex gap-3">
                      <button
                        onClick={() => router.push(`/user/${comment.profiles.id}`)}
                        className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex-shrink-0 flex items-center justify-center overflow-hidden"
                      >
                        {comment.profiles.avatar_url ? (
                          <img src={comment.profiles.avatar_url} alt={comment.profiles.full_name} className="w-full h-full object-cover" />
                        ) : (
                          <span className="text-white text-xs font-bold">{comment.profiles.full_name?.[0]?.toUpperCase()}</span>
                        )}
                      </button>
                      <div className="flex-1">
                        <div className="bg-white/5 rounded-2xl px-4 py-2">
                          <p className="text-white font-semibold text-sm">{comment.profiles.full_name}</p>
                          <p className="text-white/80 text-sm">{comment.content}</p>
                        </div>
                        <div className="flex items-center gap-4 mt-1 ml-2">
                          <span className="text-white/40 text-xs">{formatTimeAgo(comment.created_at)}</span>
                          <button
                            onClick={() => setReplyingTo(replyingTo === comment.id ? null : comment.id)}
                            className="text-white/40 text-xs hover:text-white/60"
                          >
                            Reply
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Replies */}
                    {comment.replies && comment.replies.length > 0 && (
                      <div className="ml-11 mt-2 space-y-2">
                        {comment.replies.map((reply) => (
                          <div key={reply.id} className="flex gap-3">
                            <button
                              onClick={() => router.push(`/user/${reply.profiles.id}`)}
                              className="w-6 h-6 rounded-full bg-gradient-to-br from-green-500 to-teal-500 flex-shrink-0 flex items-center justify-center overflow-hidden"
                            >
                              {reply.profiles.avatar_url ? (
                                <img src={reply.profiles.avatar_url} alt={reply.profiles.full_name} className="w-full h-full object-cover" />
                              ) : (
                                <span className="text-white text-xs font-bold">{reply.profiles.full_name?.[0]?.toUpperCase()}</span>
                              )}
                            </button>
                            <div className="flex-1">
                              <div className="bg-white/5 rounded-2xl px-3 py-2">
                                <p className="text-white font-semibold text-xs">{reply.profiles.full_name}</p>
                                <p className="text-white/80 text-sm">{reply.content}</p>
                              </div>
                              <span className="text-white/40 text-xs ml-2">{formatTimeAgo(reply.created_at)}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Comment input */}
            {currentUser ? (
              <form onSubmit={submitComment} className="flex gap-3">
                <div className="flex-1">
                  {replyingTo && (
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-white/40 text-sm">Replying to comment</span>
                      <button
                        type="button"
                        onClick={() => setReplyingTo(null)}
                        className="text-white/40 hover:text-white/60"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  )}
                  <input
                    type="text"
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    placeholder={replyingTo ? "Write a reply..." : "Add a comment..."}
                    className="w-full bg-white/5 border border-white/10 rounded-full px-4 py-2 text-white placeholder-white/40 focus:outline-none focus:border-white/30"
                  />
                </div>
                <button
                  type="submit"
                  disabled={!newComment.trim() || submittingComment}
                  className="bg-gradient-to-r from-pink-500 to-orange-400 text-white px-4 py-2 rounded-full font-medium disabled:opacity-50"
                >
                  {submittingComment ? '...' : 'Post'}
                </button>
              </form>
            ) : (
              <button
                onClick={() => router.push('/auth/login')}
                className="w-full bg-white/5 border border-white/10 rounded-full px-4 py-3 text-white/60 text-center"
              >
                Log in to comment
              </button>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}
