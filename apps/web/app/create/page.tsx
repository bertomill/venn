'use client'

import { useEffect, useState, useRef } from 'react'
import { createSupabaseBrowserClient } from '@/lib/supabase-browser'
import { useRouter } from 'next/navigation'
import { uploadMedia, createPost, UploadedMedia } from '@/lib/upload-media'

interface Interest {
  id: string
  name: string
  category: string
}

interface MediaPreview {
  file: File
  preview: string
  type: 'image' | 'video'
}

export default function CreatePostPage() {
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [user, setUser] = useState<any>(null)
  const [caption, setCaption] = useState('')
  const [location, setLocation] = useState('')
  const [mediaFiles, setMediaFiles] = useState<MediaPreview[]>([])
  const [interests, setInterests] = useState<Interest[]>([])
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const [isUploading, setIsUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [error, setError] = useState('')
  const supabase = createSupabaseBrowserClient()

  useEffect(() => {
    checkUser()
    fetchInterests()
  }, [])

  const checkUser = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      router.push('/auth/login')
      return
    }
    setUser(user)
  }

  const fetchInterests = async () => {
    const { data } = await supabase
      .from('interests')
      .select('*')
      .order('category', { ascending: true })

    if (data) {
      setInterests(data)
    }
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    if (files.length === 0) return

    // Limit to 10 files
    const newFiles = files.slice(0, 10 - mediaFiles.length)

    const previews: MediaPreview[] = newFiles.map(file => ({
      file,
      preview: URL.createObjectURL(file),
      type: file.type.startsWith('video/') ? 'video' : 'image'
    }))

    setMediaFiles(prev => [...prev, ...previews])

    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const removeMedia = (index: number) => {
    setMediaFiles(prev => {
      const updated = [...prev]
      URL.revokeObjectURL(updated[index].preview)
      updated.splice(index, 1)
      return updated
    })
  }

  const toggleTag = (interestId: string) => {
    setSelectedTags(prev =>
      prev.includes(interestId)
        ? prev.filter(id => id !== interestId)
        : [...prev, interestId]
    )
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return
    if (mediaFiles.length === 0) {
      setError('Please add at least one image or video')
      return
    }

    setIsUploading(true)
    setError('')

    try {
      // Upload all media files
      const uploadedMedia: UploadedMedia[] = []
      for (let i = 0; i < mediaFiles.length; i++) {
        setUploadProgress(Math.round((i / mediaFiles.length) * 100))
        const result = await uploadMedia(mediaFiles[i].file, user.id)
        uploadedMedia.push(result)
      }

      setUploadProgress(90)

      // Create the post
      const postId = await createPost(
        user.id,
        caption,
        uploadedMedia,
        selectedTags.length > 0 ? selectedTags : undefined,
        location || undefined
      )

      setUploadProgress(100)

      // Clean up previews
      mediaFiles.forEach(m => URL.revokeObjectURL(m.preview))

      // Navigate to dashboard or post
      router.push('/dashboard')
    } catch (err: any) {
      setError(err.message || 'Failed to create post')
      setIsUploading(false)
    }
  }

  // Group interests by category
  const interestsByCategory = interests.reduce((acc, interest) => {
    if (!acc[interest.category]) {
      acc[interest.category] = []
    }
    acc[interest.category].push(interest)
    return acc
  }, {} as Record<string, Interest[]>)

  return (
    <div className="min-h-screen bg-[#0a0a0a]">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-black/40 backdrop-blur-xl border-b border-white/5">
        <div className="max-w-2xl mx-auto px-4 py-4">
          <div className="flex justify-between items-center">
            <button
              onClick={() => router.back()}
              className="text-white/60 hover:text-white transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            <h1 className="text-lg font-semibold text-white">Create Post</h1>
            <button
              onClick={handleSubmit}
              disabled={isUploading || mediaFiles.length === 0}
              className="bg-gradient-to-r from-pink-500 to-orange-400 text-white px-4 py-2 rounded-full font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isUploading ? `${uploadProgress}%` : 'Post'}
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6">
        {error && (
          <div className="mb-4 p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Media Upload Area */}
          <div className="space-y-4">
            {mediaFiles.length === 0 ? (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="w-full aspect-square rounded-2xl border-2 border-dashed border-white/20 hover:border-white/40 transition-colors flex flex-col items-center justify-center gap-4"
              >
                <div className="w-16 h-16 rounded-full bg-white/10 flex items-center justify-center">
                  <svg className="w-8 h-8 text-white/60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                </div>
                <div className="text-center">
                  <p className="text-white font-medium">Add photos or videos</p>
                  <p className="text-white/40 text-sm mt-1">Up to 10 files</p>
                </div>
              </button>
            ) : (
              <div className="space-y-4">
                {/* Media Grid */}
                <div className={`grid gap-2 ${mediaFiles.length === 1 ? 'grid-cols-1' : 'grid-cols-2'}`}>
                  {mediaFiles.map((media, index) => (
                    <div key={index} className="relative aspect-square rounded-xl overflow-hidden bg-white/5">
                      {media.type === 'video' ? (
                        <video
                          src={media.preview}
                          className="w-full h-full object-cover"
                          muted
                        />
                      ) : (
                        <img
                          src={media.preview}
                          alt={`Upload ${index + 1}`}
                          className="w-full h-full object-cover"
                        />
                      )}
                      <button
                        type="button"
                        onClick={() => removeMedia(index)}
                        className="absolute top-2 right-2 w-8 h-8 bg-black/60 rounded-full flex items-center justify-center text-white hover:bg-black/80 transition-colors"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                      {media.type === 'video' && (
                        <div className="absolute bottom-2 left-2 bg-black/60 px-2 py-1 rounded text-xs text-white">
                          Video
                        </div>
                      )}
                    </div>
                  ))}
                  {mediaFiles.length < 10 && (
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="aspect-square rounded-xl border-2 border-dashed border-white/20 hover:border-white/40 transition-colors flex items-center justify-center"
                    >
                      <svg className="w-8 h-8 text-white/40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                      </svg>
                    </button>
                  )}
                </div>
              </div>
            )}

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,video/*"
              multiple
              onChange={handleFileSelect}
              className="hidden"
            />
          </div>

          {/* Caption */}
          <div>
            <textarea
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              placeholder="What's inspiring you today?"
              rows={4}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/40 focus:outline-none focus:border-white/30 resize-none"
            />
          </div>

          {/* Location */}
          <div>
            <div className="flex items-center gap-3 bg-white/5 border border-white/10 rounded-xl px-4 py-3">
              <svg className="w-5 h-5 text-white/40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="Add location (optional)"
                className="flex-1 bg-transparent text-white placeholder-white/40 focus:outline-none"
              />
            </div>
          </div>

          {/* Tags */}
          <div className="space-y-3">
            <label className="text-white/60 text-sm">Add tags (optional)</label>
            {Object.entries(interestsByCategory).map(([category, categoryInterests]) => (
              <div key={category}>
                <p className="text-white/40 text-xs uppercase tracking-wider mb-2">{category}</p>
                <div className="flex flex-wrap gap-2">
                  {categoryInterests.map(interest => (
                    <button
                      key={interest.id}
                      type="button"
                      onClick={() => toggleTag(interest.id)}
                      className={`px-3 py-1.5 rounded-full text-sm transition-all ${
                        selectedTags.includes(interest.id)
                          ? 'bg-gradient-to-r from-pink-500 to-orange-400 text-white'
                          : 'bg-white/10 text-white/60 hover:bg-white/20'
                      }`}
                    >
                      {interest.name}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </form>
      </main>
    </div>
  )
}
