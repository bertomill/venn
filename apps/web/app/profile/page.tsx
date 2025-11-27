'use client'

import { useEffect, useState } from 'react'
import { createSupabaseBrowserClient } from '@/lib/supabase-browser'
import { useRouter } from 'next/navigation'

interface Profile {
  id: string
  full_name: string
  bio: string
  location: string
  avatar_url: string | null
  about_me: string | null
  looking_for: string | null
  event_size_preference: string[] | null
  event_vibe: string[] | null
  twitter_handle: string | null
  linkedin_url: string | null
  instagram_handle: string | null
  website_url: string | null
  // New fields from designer mockups
  date_of_birth: string | null
  hobbies: string[] | null
  music_genres: string[] | null
  professional_background: string | null
  want_to_try: string | null
  passions: string | null
  here_for: string | null
  communities: string[] | null
  similar_personalities: string[] | null
  opposite_personalities: string[] | null
}


export default function ProfilePage() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const supabase = createSupabaseBrowserClient()

  // Edit mode states
  const [isEditing, setIsEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [uploadingPhoto, setUploadingPhoto] = useState(false)
  const [editForm, setEditForm] = useState({
    full_name: '',
    about_me: '',
    looking_for: '',
    event_size_preference: [] as string[],
    event_vibe: [] as string[],
    twitter_handle: '',
    linkedin_url: '',
    instagram_handle: '',
    website_url: '',
    // New fields
    date_of_birth: '',
    hobbies: [] as string[],
    music_genres: [] as string[],
    professional_background: '',
    want_to_try: '',
    passions: '',
    here_for: '',
    communities: [] as string[],
    similar_personalities: [] as string[],
    opposite_personalities: [] as string[],
  })

  // Tag input states
  const [newHobby, setNewHobby] = useState('')
  const [newMusic, setNewMusic] = useState('')
  const [newCommunity, setNewCommunity] = useState('')
  const [newSimilar, setNewSimilar] = useState('')
  const [newOpposite, setNewOpposite] = useState('')
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

  const startEditing = () => {
    if (profile) {
      setEditForm({
        full_name: profile.full_name || '',
        about_me: profile.about_me || '',
        looking_for: profile.looking_for || '',
        event_size_preference: profile.event_size_preference || [],
        event_vibe: profile.event_vibe || [],
        twitter_handle: profile.twitter_handle || '',
        linkedin_url: profile.linkedin_url || '',
        instagram_handle: profile.instagram_handle || '',
        website_url: profile.website_url || '',
        // New fields
        date_of_birth: profile.date_of_birth || '',
        hobbies: profile.hobbies || [],
        music_genres: profile.music_genres || [],
        professional_background: profile.professional_background || '',
        want_to_try: profile.want_to_try || '',
        passions: profile.passions || '',
        here_for: profile.here_for || '',
        communities: profile.communities || [],
        similar_personalities: profile.similar_personalities || [],
        opposite_personalities: profile.opposite_personalities || [],
      })
      setIsEditing(true)
    }
  }

  // Helper functions for tag arrays
  const addTag = (field: keyof typeof editForm, value: string, setter: (val: string) => void) => {
    if (value.trim()) {
      setEditForm(prev => ({
        ...prev,
        [field]: [...(prev[field] as string[]), value.trim()],
      }))
      setter('')
    }
  }

  const removeTag = (field: keyof typeof editForm, index: number) => {
    setEditForm(prev => ({
      ...prev,
      [field]: (prev[field] as string[]).filter((_, i) => i !== index),
    }))
  }

  const cancelEditing = () => {
    setIsEditing(false)
  }

  const saveProfile = async () => {
    if (!user) return
    setSaving(true)

    try {
      // Update profile
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          full_name: editForm.full_name || null,
          about_me: editForm.about_me || null,
          looking_for: editForm.looking_for || null,
          event_size_preference: editForm.event_size_preference.length > 0 ? editForm.event_size_preference : null,
          event_vibe: editForm.event_vibe.length > 0 ? editForm.event_vibe : null,
          twitter_handle: editForm.twitter_handle || null,
          linkedin_url: editForm.linkedin_url || null,
          instagram_handle: editForm.instagram_handle || null,
          website_url: editForm.website_url || null,
          // New fields
          date_of_birth: editForm.date_of_birth || null,
          hobbies: editForm.hobbies.length > 0 ? editForm.hobbies : null,
          music_genres: editForm.music_genres.length > 0 ? editForm.music_genres : null,
          professional_background: editForm.professional_background || null,
          want_to_try: editForm.want_to_try || null,
          passions: editForm.passions || null,
          here_for: editForm.here_for || null,
          communities: editForm.communities.length > 0 ? editForm.communities : null,
          similar_personalities: editForm.similar_personalities.length > 0 ? editForm.similar_personalities : null,
          opposite_personalities: editForm.opposite_personalities.length > 0 ? editForm.opposite_personalities : null,
        } as never)
        .eq('id', user.id)

      if (profileError) throw profileError

      // Refresh data
      await fetchProfile(user.id)
      setIsEditing(false)

      // Regenerate embedding in background (don't block UI)
      fetch('/api/embeddings/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id })
      }).catch(err => console.error('Error regenerating embedding:', err))
    } catch (err) {
      console.error('Error saving profile:', err)
    } finally {
      setSaving(false)
    }
  }

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push('/')
  }

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !user) return

    if (!file.type.startsWith('image/')) {
      alert('Please upload an image file')
      return
    }

    if (file.size > 5 * 1024 * 1024) {
      alert('Image must be less than 5MB')
      return
    }

    setUploadingPhoto(true)

    try {
      const fileExt = file.name.split('.').pop()
      const fileName = `${user.id}-${Date.now()}.${fileExt}`
      const filePath = `avatars/${fileName}`

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file, { upsert: true })

      if (uploadError) {
        console.error('Upload error:', uploadError)
        alert('Failed to upload image')
        return
      }

      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath)

      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: publicUrl } as never)
        .eq('id', user.id)

      if (updateError) {
        console.error('Update error:', updateError)
        alert('Failed to update profile')
        return
      }

      setProfile(prev => prev ? { ...prev, avatar_url: publicUrl } : prev)
    } catch (err) {
      console.error('Error uploading photo:', err)
      alert('Failed to upload image')
    } finally {
      setUploadingPhoto(false)
    }
  }

  const getInitials = (name: string | null) => {
    if (!name) return '?'
    return name[0].toUpperCase()
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
        <div className="text-lg text-white/60">Loading...</div>
      </div>
    )
  }

  // Tag input component for reusability
  const TagInput = ({
    tags,
    field,
    newValue,
    setNewValue,
    placeholder,
    colorClass
  }: {
    tags: string[]
    field: keyof typeof editForm
    newValue: string
    setNewValue: (val: string) => void
    placeholder: string
    colorClass: string
  }) => (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {tags.map((tag, index) => (
          <span
            key={index}
            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm ${colorClass}`}
          >
            {tag}
            <button
              onClick={() => removeTag(field, index)}
              className="ml-1 rounded-full hover:opacity-70"
            >
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </span>
        ))}
      </div>
      <div className="flex gap-2">
        <input
          type="text"
          value={newValue}
          onChange={(e) => setNewValue(e.target.value)}
          placeholder={placeholder}
          onKeyDown={(e) => e.key === 'Enter' && addTag(field, newValue, setNewValue)}
          className="flex-1 px-4 py-2.5 bg-white/5 border border-white/10 text-white placeholder-white/30 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500/50"
        />
        <button
          onClick={() => addTag(field, newValue, setNewValue)}
          className="px-3 py-2.5 bg-white/10 border border-white/20 text-white rounded-xl hover:bg-white/20 transition-all"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
        </button>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-[#0a0a0a] pb-24">
      {/* Top Navigation Bar */}
      <div className="sticky top-0 z-10 bg-[#0a0a0a]/90 backdrop-blur-sm border-b border-white/10">
        <div className="flex items-center justify-between px-4 py-3">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 text-white/80 hover:text-white transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <h1 className="text-lg font-semibold text-white">Profile</h1>
          <div className="w-6" /> {/* Spacer for centering */}
        </div>
      </div>

      {/* Header with Gradient Background and Profile Photo */}
      <header className="relative">
        {/* Gradient Background */}
        <div className="h-48 bg-gradient-to-br from-pink-500 to-orange-400 relative">
          <div className="absolute inset-0 bg-gradient-to-b from-transparent to-[#0a0a0a]" />
        </div>

        {/* Profile Avatar */}
        <div className="relative -mt-20 flex flex-col items-center px-6">
          <div className="relative">
            <div className="w-32 h-32 rounded-full bg-gradient-to-br from-pink-500 to-orange-400 flex items-center justify-center text-white text-5xl font-bold shadow-2xl border-4 border-[#0a0a0a] overflow-hidden">
              {uploadingPhoto ? (
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
              ) : profile?.avatar_url ? (
                <img
                  src={profile.avatar_url}
                  alt={profile.full_name || '?'}
                  className="w-full h-full rounded-full object-cover"
                />
              ) : (
                getInitials(profile?.full_name || null)
              )}
            </div>

            {/* Upload button overlay */}
            <label className="absolute bottom-0 right-0 w-10 h-10 bg-orange-500 rounded-full flex items-center justify-center cursor-pointer hover:bg-orange-600 transition-all shadow-lg border-2 border-[#0a0a0a]">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <input
                type="file"
                accept="image/*"
                onChange={handlePhotoUpload}
                className="hidden"
                disabled={uploadingPhoto}
              />
            </label>
          </div>

          {/* Name */}
          <h1 className="text-2xl font-bold text-white mt-4">
            {profile?.full_name || 'Anonymous User'}
          </h1>
          <p className="text-white/60 mt-1 text-center">Share your story and connect with people who understand you</p>

          {/* Edit Profile Button - moved here */}
          <div className="mt-4">
            {isEditing ? (
              <div className="flex gap-3">
                <button
                  onClick={cancelEditing}
                  className="px-5 py-2 bg-white/10 border border-white/20 text-white rounded-full font-medium hover:bg-white/20 transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={saveProfile}
                  disabled={saving}
                  className="px-5 py-2 bg-gradient-to-r from-pink-500 to-orange-400 text-white rounded-full font-medium hover:opacity-90 transition-all disabled:opacity-50"
                >
                  {saving ? 'Saving...' : 'Save'}
                </button>
              </div>
            ) : (
              <button
                onClick={startEditing}
                className="px-6 py-2 bg-gradient-to-r from-pink-500 to-orange-400 text-white rounded-full font-medium hover:opacity-90 transition-all"
              >
                Edit Profile
              </button>
            )}
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-4xl px-4 pt-8">

        <div className="space-y-8">
          {/* Basic Information Card */}
          <div className="bg-white/5 border border-white/10 rounded-2xl p-8 backdrop-blur">
            <h2 className="mb-6 font-serif text-2xl font-light text-white">Basic Information</h2>
            <div className="space-y-6">
              <div className="grid gap-6 sm:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-white/80">Full Name</label>
                  {isEditing ? (
                    <input
                      type="text"
                      value={editForm.full_name}
                      onChange={(e) => setEditForm(prev => ({ ...prev, full_name: e.target.value }))}
                      className="w-full px-4 py-3 bg-white/5 border border-white/10 text-white placeholder-white/30 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                    />
                  ) : (
                    <div className="px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white">
                      {profile?.full_name || <span className="text-white/40">Not set</span>}
                    </div>
                  )}
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-white/80">Date of Birth</label>
                  {isEditing ? (
                    <input
                      type="date"
                      value={editForm.date_of_birth}
                      onChange={(e) => setEditForm(prev => ({ ...prev, date_of_birth: e.target.value }))}
                      className="w-full px-4 py-3 bg-white/5 border border-white/10 text-white rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                    />
                  ) : (
                    <div className="px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white">
                      {profile?.date_of_birth || <span className="text-white/40">Not set</span>}
                    </div>
                  )}
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-white/80">Location</label>
                {isEditing ? (
                  <input
                    type="text"
                    value={editForm.looking_for}
                    onChange={(e) => setEditForm(prev => ({ ...prev, looking_for: e.target.value }))}
                    placeholder="City, State/Country"
                    className="w-full px-4 py-3 bg-white/5 border border-white/10 text-white placeholder-white/30 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                  />
                ) : (
                  <div className="px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white">
                    {profile?.location || <span className="text-white/40">Not set</span>}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* About You Card */}
          <div className="bg-white/5 border border-white/10 rounded-2xl p-8 backdrop-blur">
            <h2 className="mb-6 font-serif text-2xl font-light text-white">About You</h2>
            <div className="space-y-2">
              <label className="text-sm font-medium text-white/80">Bio</label>
              {isEditing ? (
                <textarea
                  value={editForm.about_me}
                  onChange={(e) => setEditForm(prev => ({ ...prev, about_me: e.target.value }))}
                  placeholder="Tell us a bit about yourself..."
                  rows={4}
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 text-white placeholder-white/30 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500/50 resize-none"
                />
              ) : (
                <div className="px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white min-h-[100px]">
                  {profile?.about_me || <span className="text-white/40">Not set</span>}
                </div>
              )}
            </div>
          </div>

          {/* Hobbies & Interests Card */}
          <div className="bg-white/5 border border-white/10 rounded-2xl p-8 backdrop-blur">
            <h2 className="mb-6 font-serif text-2xl font-light text-white">Hobbies & Interests</h2>
            {isEditing ? (
              <TagInput
                tags={editForm.hobbies}
                field="hobbies"
                newValue={newHobby}
                setNewValue={setNewHobby}
                placeholder="Add a hobby"
                colorClass="bg-blue-500/20 text-blue-300"
              />
            ) : (
              <div className="flex flex-wrap gap-2">
                {profile?.hobbies?.length ? (
                  profile.hobbies.map((hobby, index) => (
                    <span key={index} className="px-3 py-1 bg-blue-500/20 text-blue-300 rounded-full text-sm">
                      {hobby}
                    </span>
                  ))
                ) : (
                  <span className="text-white/40">No hobbies added</span>
                )}
              </div>
            )}
          </div>

          {/* Music Preferences Card */}
          <div className="bg-white/5 border border-white/10 rounded-2xl p-8 backdrop-blur">
            <h2 className="mb-6 font-serif text-2xl font-light text-white">Music Preferences</h2>
            {isEditing ? (
              <TagInput
                tags={editForm.music_genres}
                field="music_genres"
                newValue={newMusic}
                setNewValue={setNewMusic}
                placeholder="Add a music genre"
                colorClass="bg-purple-500/20 text-purple-300"
              />
            ) : (
              <div className="flex flex-wrap gap-2">
                {profile?.music_genres?.length ? (
                  profile.music_genres.map((genre, index) => (
                    <span key={index} className="px-3 py-1 bg-purple-500/20 text-purple-300 rounded-full text-sm">
                      {genre}
                    </span>
                  ))
                ) : (
                  <span className="text-white/40">No music preferences added</span>
                )}
              </div>
            )}
          </div>

          {/* Professional Background Card */}
          <div className="bg-white/5 border border-white/10 rounded-2xl p-8 backdrop-blur">
            <h2 className="mb-6 font-serif text-2xl font-light text-white">Professional Background</h2>
            <div className="space-y-2">
              <label className="text-sm font-medium text-white/80">Your Professional Experience</label>
              {isEditing ? (
                <textarea
                  value={editForm.professional_background}
                  onChange={(e) => setEditForm(prev => ({ ...prev, professional_background: e.target.value }))}
                  placeholder="Tell us about your work and career..."
                  rows={4}
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 text-white placeholder-white/30 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500/50 resize-none"
                />
              ) : (
                <div className="px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white min-h-[100px]">
                  {profile?.professional_background || <span className="text-white/40">Not set</span>}
                </div>
              )}
            </div>
          </div>

          {/* Aspirations & Passions Card */}
          <div className="bg-white/5 border border-white/10 rounded-2xl p-8 backdrop-blur">
            <h2 className="mb-6 font-serif text-2xl font-light text-white">Aspirations & Passions</h2>
            <div className="space-y-6">
              <div className="space-y-2">
                <label className="text-sm font-medium text-white/80">Something You Want to Try</label>
                {isEditing ? (
                  <textarea
                    value={editForm.want_to_try}
                    onChange={(e) => setEditForm(prev => ({ ...prev, want_to_try: e.target.value }))}
                    placeholder="What new experiences are you looking forward to?"
                    rows={3}
                    className="w-full px-4 py-3 bg-white/5 border border-white/10 text-white placeholder-white/30 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500/50 resize-none"
                  />
                ) : (
                  <div className="px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white">
                    {profile?.want_to_try || <span className="text-white/40">Not set</span>}
                  </div>
                )}
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-white/80">What Are You Passionate About?</label>
                {isEditing ? (
                  <textarea
                    value={editForm.passions}
                    onChange={(e) => setEditForm(prev => ({ ...prev, passions: e.target.value }))}
                    placeholder="Share what drives you..."
                    rows={3}
                    className="w-full px-4 py-3 bg-white/5 border border-white/10 text-white placeholder-white/30 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500/50 resize-none"
                  />
                ) : (
                  <div className="px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white">
                    {profile?.passions || <span className="text-white/40">Not set</span>}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Connection Goals Card */}
          <div className="bg-white/5 border border-white/10 rounded-2xl p-8 backdrop-blur">
            <h2 className="mb-6 font-serif text-2xl font-light text-white">Connection Goals</h2>
            <div className="space-y-2">
              <label className="text-sm font-medium text-white/80">What Are You Here For?</label>
              {isEditing ? (
                <textarea
                  value={editForm.here_for}
                  onChange={(e) => setEditForm(prev => ({ ...prev, here_for: e.target.value }))}
                  placeholder="What kind of connections are you looking for?"
                  rows={3}
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 text-white placeholder-white/30 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500/50 resize-none"
                />
              ) : (
                <div className="px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white">
                  {profile?.here_for || <span className="text-white/40">Not set</span>}
                </div>
              )}
            </div>
          </div>

          {/* Your Communities Card */}
          <div className="bg-white/5 border border-white/10 rounded-2xl p-8 backdrop-blur">
            <h2 className="mb-6 font-serif text-2xl font-light text-white">Your Communities</h2>
            <p className="text-sm text-white/60 mb-4">Are you part of existing communities in your city?</p>
            {isEditing ? (
              <TagInput
                tags={editForm.communities}
                field="communities"
                newValue={newCommunity}
                setNewValue={setNewCommunity}
                placeholder="Add a community"
                colorClass="bg-pink-500/20 text-pink-300"
              />
            ) : (
              <div className="flex flex-wrap gap-2">
                {profile?.communities?.length ? (
                  profile.communities.map((community, index) => (
                    <span key={index} className="px-3 py-1 bg-pink-500/20 text-pink-300 rounded-full text-sm">
                      {community}
                    </span>
                  ))
                ) : (
                  <span className="text-white/40">No communities added</span>
                )}
              </div>
            )}
          </div>

          {/* Personality Traits Card */}
          <div className="bg-white/5 border border-white/10 rounded-2xl p-8 backdrop-blur">
            <h2 className="mb-6 font-serif text-2xl font-light text-white">Personality Traits</h2>
            <div className="space-y-6">
              {/* Similar Personalities */}
              <div className="space-y-3">
                <label className="text-sm font-medium text-white/80">Personalities Similar to You</label>
                {isEditing ? (
                  <TagInput
                    tags={editForm.similar_personalities}
                    field="similar_personalities"
                    newValue={newSimilar}
                    setNewValue={setNewSimilar}
                    placeholder="Add a personality trait"
                    colorClass="bg-cyan-500/20 text-cyan-300"
                  />
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {profile?.similar_personalities?.length ? (
                      profile.similar_personalities.map((trait, index) => (
                        <span key={index} className="px-3 py-1 bg-cyan-500/20 text-cyan-300 rounded-full text-sm">
                          {trait}
                        </span>
                      ))
                    ) : (
                      <span className="text-white/40">No traits added</span>
                    )}
                  </div>
                )}
              </div>

              {/* Opposite Personalities */}
              <div className="space-y-3">
                <label className="text-sm font-medium text-white/80">Personalities Very Opposite of You</label>
                {isEditing ? (
                  <TagInput
                    tags={editForm.opposite_personalities}
                    field="opposite_personalities"
                    newValue={newOpposite}
                    setNewValue={setNewOpposite}
                    placeholder="Add an opposite trait"
                    colorClass="bg-slate-500/20 text-slate-300"
                  />
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {profile?.opposite_personalities?.length ? (
                      profile.opposite_personalities.map((trait, index) => (
                        <span key={index} className="px-3 py-1 bg-slate-500/20 text-slate-300 rounded-full text-sm">
                          {trait}
                        </span>
                      ))
                    ) : (
                      <span className="text-white/40">No traits added</span>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Sign Out */}
          <div className="flex justify-center pt-4">
            <button
              onClick={handleSignOut}
              className="text-red-400 hover:text-red-300 text-sm font-medium transition-all"
            >
              Sign Out
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
