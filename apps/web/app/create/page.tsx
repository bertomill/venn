'use client'

import { useEffect, useState, useRef } from 'react'
import { createSupabaseBrowserClient } from '@/lib/supabase-browser'
import { useRouter } from 'next/navigation'
import { uploadMedia, createPost, UploadedMedia, PostType } from '@/lib/upload-media'

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

const POST_TYPES: { type: PostType; label: string; description: string; icon: React.ReactNode }[] = [
  {
    type: 'update',
    label: 'Update',
    description: 'Share a moment, thought, or inspiration',
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
      </svg>
    )
  },
  {
    type: 'project',
    label: 'Project',
    description: 'Showcase your work with links and details',
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
      </svg>
    )
  },
  {
    type: 'event',
    label: 'Event',
    description: 'Announce a meetup, workshop, or gathering',
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
      </svg>
    )
  }
]

export default function CreatePostPage() {
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [user, setUser] = useState<any>(null)

  // Step management
  const [step, setStep] = useState<'type' | 'content'>('type')
  const [postType, setPostType] = useState<PostType>('update')

  // Common fields
  const [caption, setCaption] = useState('')
  const [location, setLocation] = useState('')
  const [mediaFiles, setMediaFiles] = useState<MediaPreview[]>([])
  const [interests, setInterests] = useState<Interest[]>([])
  const [selectedTags, setSelectedTags] = useState<string[]>([])

  // Project-specific fields
  const [title, setTitle] = useState('')
  const [projectUrl, setProjectUrl] = useState('')
  const [githubUrl, setGithubUrl] = useState('')
  const [projectStatus, setProjectStatus] = useState<'in_progress' | 'completed' | 'on_hold'>('in_progress')

  // Event-specific fields
  const [eventDate, setEventDate] = useState('')
  const [eventTime, setEventTime] = useState('')
  const [eventEndDate, setEventEndDate] = useState('')
  const [eventEndTime, setEventEndTime] = useState('')
  const [eventUrl, setEventUrl] = useState('')

  // Upload state
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

    const newFiles = files.slice(0, 10 - mediaFiles.length)

    const previews: MediaPreview[] = newFiles.map(file => ({
      file,
      preview: URL.createObjectURL(file),
      type: file.type.startsWith('video/') ? 'video' : 'image'
    }))

    setMediaFiles(prev => [...prev, ...previews])

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

  const handleSelectType = (type: PostType) => {
    setPostType(type)
    setStep('content')
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return

    // Validate based on type
    if (postType === 'update' && mediaFiles.length === 0) {
      setError('Please add at least one image or video')
      return
    }
    if ((postType === 'project' || postType === 'event') && !title.trim()) {
      setError('Please add a title')
      return
    }
    if (postType === 'event' && !eventDate) {
      setError('Please select an event date')
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

      // Build event dates
      let eventDateObj: Date | undefined
      let eventEndDateObj: Date | undefined

      if (postType === 'event' && eventDate) {
        eventDateObj = new Date(`${eventDate}T${eventTime || '00:00'}`)
        if (eventEndDate) {
          eventEndDateObj = new Date(`${eventEndDate}T${eventEndTime || '23:59'}`)
        }
      }

      // Create the post with type-specific options
      await createPost(
        user.id,
        caption,
        uploadedMedia,
        selectedTags.length > 0 ? selectedTags : undefined,
        location || undefined,
        {
          postType,
          title: title || undefined,
          projectUrl: projectUrl || undefined,
          githubUrl: githubUrl || undefined,
          projectStatus: postType === 'project' ? projectStatus : undefined,
          eventDate: eventDateObj,
          eventEndDate: eventEndDateObj,
          eventUrl: eventUrl || undefined,
        }
      )

      setUploadProgress(100)

      // Clean up previews
      mediaFiles.forEach(m => URL.revokeObjectURL(m.preview))

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

  const getPageTitle = () => {
    if (step === 'type') return 'Create'
    switch (postType) {
      case 'project': return 'New Project'
      case 'event': return 'New Event'
      default: return 'New Update'
    }
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a]">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-black/40 backdrop-blur-xl border-b border-white/5">
        <div className="max-w-2xl mx-auto px-4 py-4">
          <div className="flex justify-between items-center">
            <button
              onClick={() => step === 'content' ? setStep('type') : router.back()}
              className="text-white/60 hover:text-white transition-colors"
            >
              {step === 'content' ? (
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              ) : (
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              )}
            </button>
            <h1 className="text-lg font-semibold text-white">{getPageTitle()}</h1>
            {step === 'content' ? (
              <button
                onClick={handleSubmit}
                disabled={isUploading}
                className="bg-gradient-to-r from-pink-500 to-orange-400 text-white px-4 py-2 rounded-full font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isUploading ? `${uploadProgress}%` : 'Post'}
              </button>
            ) : (
              <div className="w-16" />
            )}
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6">
        {error && (
          <div className="mb-4 p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm">
            {error}
          </div>
        )}

        {/* Step 1: Select Post Type */}
        {step === 'type' && (
          <div className="space-y-4">
            <p className="text-white/60 text-center mb-6">What would you like to share?</p>
            {POST_TYPES.map((item) => (
              <button
                key={item.type}
                onClick={() => handleSelectType(item.type)}
                className="w-full p-4 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 rounded-2xl transition-all flex items-center gap-4 text-left"
              >
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-pink-500/20 to-orange-400/20 flex items-center justify-center text-white">
                  {item.icon}
                </div>
                <div className="flex-1">
                  <h3 className="text-white font-medium">{item.label}</h3>
                  <p className="text-white/40 text-sm">{item.description}</p>
                </div>
                <svg className="w-5 h-5 text-white/40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            ))}
          </div>
        )}

        {/* Step 2: Content Form */}
        {step === 'content' && (
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Title (for Projects and Events) */}
            {(postType === 'project' || postType === 'event') && (
              <div>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder={postType === 'project' ? 'Project name' : 'Event name'}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-xl font-medium placeholder-white/40 focus:outline-none focus:border-white/30"
                />
              </div>
            )}

            {/* Media Upload Area */}
            <div className="space-y-4">
              {mediaFiles.length === 0 ? (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full aspect-video rounded-2xl border-2 border-dashed border-white/20 hover:border-white/40 transition-colors flex flex-col items-center justify-center gap-4"
                >
                  <div className="w-16 h-16 rounded-full bg-white/10 flex items-center justify-center">
                    <svg className="w-8 h-8 text-white/60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                  </div>
                  <div className="text-center">
                    <p className="text-white font-medium">Add photos or videos</p>
                    <p className="text-white/40 text-sm mt-1">
                      {postType === 'update' ? 'Required' : 'Optional'} - Up to 10 files
                    </p>
                  </div>
                </button>
              ) : (
                <div className="space-y-4">
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

            {/* Caption/Description */}
            <div>
              <textarea
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                placeholder={
                  postType === 'project'
                    ? 'Tell us about your project...'
                    : postType === 'event'
                    ? 'Describe your event...'
                    : "What's inspiring you today?"
                }
                rows={4}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/40 focus:outline-none focus:border-white/30 resize-none"
              />
            </div>

            {/* Project-specific fields */}
            {postType === 'project' && (
              <div className="space-y-4 p-4 bg-white/5 rounded-xl border border-white/10">
                <h3 className="text-white/60 text-sm font-medium">Project Details</h3>

                {/* Project Status */}
                <div>
                  <label className="text-white/40 text-xs mb-2 block">Status</label>
                  <div className="flex gap-2">
                    {[
                      { value: 'in_progress', label: 'In Progress' },
                      { value: 'completed', label: 'Completed' },
                      { value: 'on_hold', label: 'On Hold' }
                    ].map((status) => (
                      <button
                        key={status.value}
                        type="button"
                        onClick={() => setProjectStatus(status.value as typeof projectStatus)}
                        className={`px-3 py-1.5 rounded-full text-sm transition-all ${
                          projectStatus === status.value
                            ? 'bg-gradient-to-r from-pink-500 to-orange-400 text-white'
                            : 'bg-white/10 text-white/60 hover:bg-white/20'
                        }`}
                      >
                        {status.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Project URL */}
                <div className="flex items-center gap-3 bg-white/5 border border-white/10 rounded-xl px-4 py-3">
                  <svg className="w-5 h-5 text-white/40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                  </svg>
                  <input
                    type="url"
                    value={projectUrl}
                    onChange={(e) => setProjectUrl(e.target.value)}
                    placeholder="Project URL (optional)"
                    className="flex-1 bg-transparent text-white placeholder-white/40 focus:outline-none"
                  />
                </div>

                {/* GitHub URL */}
                <div className="flex items-center gap-3 bg-white/5 border border-white/10 rounded-xl px-4 py-3">
                  <svg className="w-5 h-5 text-white/40" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
                  </svg>
                  <input
                    type="url"
                    value={githubUrl}
                    onChange={(e) => setGithubUrl(e.target.value)}
                    placeholder="GitHub URL (optional)"
                    className="flex-1 bg-transparent text-white placeholder-white/40 focus:outline-none"
                  />
                </div>
              </div>
            )}

            {/* Event-specific fields */}
            {postType === 'event' && (
              <div className="space-y-4 p-4 bg-white/5 rounded-xl border border-white/10">
                <h3 className="text-white/60 text-sm font-medium">Event Details</h3>

                {/* Start Date & Time */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-white/40 text-xs mb-2 block">Start Date *</label>
                    <input
                      type="date"
                      value={eventDate}
                      onChange={(e) => setEventDate(e.target.value)}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-white/30"
                    />
                  </div>
                  <div>
                    <label className="text-white/40 text-xs mb-2 block">Start Time</label>
                    <input
                      type="time"
                      value={eventTime}
                      onChange={(e) => setEventTime(e.target.value)}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-white/30"
                    />
                  </div>
                </div>

                {/* End Date & Time */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-white/40 text-xs mb-2 block">End Date</label>
                    <input
                      type="date"
                      value={eventEndDate}
                      onChange={(e) => setEventEndDate(e.target.value)}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-white/30"
                    />
                  </div>
                  <div>
                    <label className="text-white/40 text-xs mb-2 block">End Time</label>
                    <input
                      type="time"
                      value={eventEndTime}
                      onChange={(e) => setEventEndTime(e.target.value)}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-white/30"
                    />
                  </div>
                </div>

                {/* Event Link */}
                <div className="flex items-center gap-3 bg-white/5 border border-white/10 rounded-xl px-4 py-3">
                  <svg className="w-5 h-5 text-white/40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" />
                  </svg>
                  <input
                    type="url"
                    value={eventUrl}
                    onChange={(e) => setEventUrl(e.target.value)}
                    placeholder="Registration / Ticket link (optional)"
                    className="flex-1 bg-transparent text-white placeholder-white/40 focus:outline-none"
                  />
                </div>
              </div>
            )}

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
                  placeholder={postType === 'event' ? 'Event location' : 'Add location (optional)'}
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
        )}
      </main>
    </div>
  )
}
