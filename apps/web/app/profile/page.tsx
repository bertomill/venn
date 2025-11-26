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
}

interface Interest {
  id: string
  name: string
  category: string
}

interface Connection {
  id: string
  user1_id: string
  user2_id: string
  status: string
}

const EVENT_SIZES = [
  { value: 'intimate', label: 'Intimate' },
  { value: 'medium', label: 'Medium' },
  { value: 'large', label: 'Large' },
  { value: 'any', label: 'Any' },
]

const EVENT_VIBES = [
  { value: 'professional', label: 'Professional' },
  { value: 'social', label: 'Social' },
  { value: 'creative', label: 'Creative' },
  { value: 'wellness', label: 'Wellness' },
  { value: 'learning', label: 'Learning' },
]

export default function ProfilePage() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const [connections, setConnections] = useState<Connection[]>([])
  const [friendRequests, setFriendRequests] = useState<Connection[]>([])
  const [eventsCreated, setEventsCreated] = useState(0)
  const [eventsAttended, setEventsAttended] = useState(0)
  const [userInterests, setUserInterests] = useState<Interest[]>([])
  const [allInterests, setAllInterests] = useState<Interest[]>([])
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
  })
  const [selectedInterestIds, setSelectedInterestIds] = useState<string[]>([])

  useEffect(() => {
    checkUser()
    fetchAllInterests()
  }, [])

  const checkUser = async () => {
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      router.push('/auth/login')
      return
    }

    setUser(user)
    await fetchProfile(user.id)
    await fetchConnections(user.id)
    await fetchEvents(user.id)
    await fetchUserInterests(user.id)
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

  const fetchConnections = async (userId: string) => {
    // Fetch accepted connections
    const { data: accepted } = await supabase
      .from('connections')
      .select('*')
      .or(`user1_id.eq.${userId},user2_id.eq.${userId}`)
      .eq('status', 'accepted')

    if (accepted) {
      setConnections(accepted)
    }

    // Fetch pending requests where user is user2 (incoming requests)
    const { data: pending } = await supabase
      .from('connections')
      .select('*')
      .eq('user2_id', userId)
      .eq('status', 'pending')

    if (pending) {
      setFriendRequests(pending)
    }
  }

  const fetchUserInterests = async (userId: string) => {
    const { data } = await supabase
      .from('user_interests')
      .select('interest_id, interests(id, name, category)')
      .eq('user_id', userId)

    if (data) {
      const interests = data
        .map((item: any) => item.interests)
        .filter(Boolean) as Interest[]
      setUserInterests(interests)
      setSelectedInterestIds(interests.map(i => i.id))
    }
  }

  const fetchAllInterests = async () => {
    const { data } = await supabase
      .from('interests')
      .select('*')
      .order('category', { ascending: true })

    if (data) {
      setAllInterests(data)
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
      })
      setSelectedInterestIds(userInterests.map(i => i.id))
      setIsEditing(true)
    }
  }

  const cancelEditing = () => {
    setIsEditing(false)
  }

  const toggleEditInterest = (interestId: string) => {
    setSelectedInterestIds(prev =>
      prev.includes(interestId)
        ? prev.filter(id => id !== interestId)
        : [...prev, interestId]
    )
  }

  const toggleEditSize = (size: string) => {
    setEditForm(prev => ({
      ...prev,
      event_size_preference: prev.event_size_preference.includes(size)
        ? prev.event_size_preference.filter(s => s !== size)
        : [...prev.event_size_preference, size]
    }))
  }

  const toggleEditVibe = (vibe: string) => {
    setEditForm(prev => ({
      ...prev,
      event_vibe: prev.event_vibe.includes(vibe)
        ? prev.event_vibe.filter(v => v !== vibe)
        : [...prev.event_vibe, vibe]
    }))
  }

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !user) return

    // Validate file type
    if (!file.type.startsWith('image/')) {
      alert('Please upload an image file')
      return
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert('Image must be less than 5MB')
      return
    }

    setUploadingPhoto(true)

    try {
      // Create unique filename
      const fileExt = file.name.split('.').pop()
      const fileName = `${user.id}-${Date.now()}.${fileExt}`
      const filePath = `avatars/${fileName}`

      // Upload to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file, { upsert: true })

      if (uploadError) {
        console.error('Upload error:', uploadError)
        // Try to create bucket if it doesn't exist
        if (uploadError.message.includes('not found')) {
          alert('Storage bucket not configured. Please create an "avatars" bucket in Supabase Storage.')
        } else {
          alert('Failed to upload image')
        }
        return
      }

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath)

      // Update profile with new avatar URL
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: publicUrl } as never)
        .eq('id', user.id)

      if (updateError) {
        console.error('Update error:', updateError)
        alert('Failed to update profile')
        return
      }

      // Update local state
      setProfile(prev => prev ? { ...prev, avatar_url: publicUrl } : prev)
    } catch (err) {
      console.error('Error uploading photo:', err)
      alert('Failed to upload image')
    } finally {
      setUploadingPhoto(false)
    }
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
        } as never)
        .eq('id', user.id)

      if (profileError) throw profileError

      // Update interests
      await supabase
        .from('user_interests')
        .delete()
        .eq('user_id', user.id)

      if (selectedInterestIds.length > 0) {
        const userInterestsData = selectedInterestIds.map(interestId => ({
          user_id: user.id,
          interest_id: interestId,
        }))

        await supabase
          .from('user_interests')
          .insert(userInterestsData as never)
      }

      // Refresh data
      await fetchProfile(user.id)
      await fetchUserInterests(user.id)
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

  const fetchEvents = async (userId: string) => {
    // Count events created
    const { count: created } = await supabase
      .from('events')
      .select('*', { count: 'exact', head: true })
      .eq('creator_id', userId)

    if (created !== null) {
      setEventsCreated(created)
    }

    // Count events attended
    const { count: attended } = await supabase
      .from('event_attendees')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)

    if (attended !== null) {
      setEventsAttended(attended)
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

  const getInitials = (name: string | null) => {
    if (!name) return '?'
    return name[0].toUpperCase()
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] pb-24">
      {/* Header with Gradient Background */}
      <header className="relative">
        {/* Gradient Background */}
        <div className="h-64 bg-gradient-to-br from-blue-500 via-blue-600 to-blue-700 relative">
          <div className="absolute inset-0 bg-gradient-to-b from-transparent to-[#0a0a0a]" />

          {/* Done Button */}
          <button
            onClick={() => router.push('/dashboard')}
            className="absolute top-4 right-4 w-10 h-10 bg-cyan-300 rounded-full flex items-center justify-center"
          >
            <svg className="w-6 h-6 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
            </svg>
          </button>
        </div>

        {/* Profile Avatar and Info */}
        <div className="relative -mt-32 px-6">
          <div className="flex flex-col items-center">
            {/* Avatar */}
            <div className="relative">
              <div className="w-32 h-32 rounded-full bg-gradient-to-br from-pink-400 via-purple-500 to-blue-600 flex items-center justify-center text-white text-5xl font-bold shadow-2xl border-4 border-[#0a0a0a] overflow-hidden">
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

              {/* Upload button overlay - always visible */}
              <label className="absolute bottom-0 right-0 w-10 h-10 bg-purple-500 rounded-full flex items-center justify-center cursor-pointer hover:bg-purple-600 transition-all shadow-lg border-2 border-[#0a0a0a]">
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

            {/* Username */}
            {isEditing ? (
              <input
                type="text"
                value={editForm.full_name}
                onChange={(e) => setEditForm(prev => ({ ...prev, full_name: e.target.value }))}
                placeholder="Your name"
                className="text-3xl font-bold text-white mt-4 bg-transparent border-b-2 border-white/30 text-center focus:outline-none focus:border-purple-500 pb-1"
              />
            ) : (
              <h1 className="text-3xl font-bold text-white mt-4">
                {profile?.full_name || 'Anonymous User'}
              </h1>
            )}

            {/* Edit Profile Button */}
            {isEditing ? (
              <div className="flex gap-3 mt-4">
                <button
                  onClick={cancelEditing}
                  className="px-6 py-2.5 bg-white/10 border border-white/20 text-white rounded-xl font-semibold hover:bg-white/20 transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={saveProfile}
                  disabled={saving}
                  className="px-6 py-2.5 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-xl font-semibold hover:opacity-90 transition-all disabled:opacity-50"
                >
                  {saving ? 'Saving...' : 'Save'}
                </button>
              </div>
            ) : (
              <button
                onClick={startEditing}
                className="mt-4 px-6 py-2.5 bg-white/20 backdrop-blur-sm border border-white/30 text-white rounded-xl font-semibold hover:bg-white/30 transition-all"
              >
                Edit Profile
              </button>
            )}
          </div>
        </div>
      </header>

      <main className="px-6 mt-8">
        {/* About Section */}
        <section className="mb-6">
          <h2 className="text-2xl font-bold text-white mb-4">About</h2>

          <div className="bg-white/5 border border-white/10 rounded-2xl p-5 space-y-5">
            {/* About Me */}
            <div>
              <h3 className="text-sm font-semibold text-white/60 mb-2">About Me</h3>
              {isEditing ? (
                <textarea
                  value={editForm.about_me}
                  onChange={(e) => setEditForm(prev => ({ ...prev, about_me: e.target.value }))}
                  placeholder="Tell us about yourself..."
                  rows={4}
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 text-white placeholder-white/30 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500/50 resize-none"
                />
              ) : (
                <p className="text-white/90">{profile?.about_me || <span className="text-white/40 italic">Not set</span>}</p>
              )}
            </div>

            {/* Looking For */}
            <div>
              <h3 className="text-sm font-semibold text-white/60 mb-2">Looking to meet</h3>
              {isEditing ? (
                <textarea
                  value={editForm.looking_for}
                  onChange={(e) => setEditForm(prev => ({ ...prev, looking_for: e.target.value }))}
                  placeholder="Who do you want to connect with?"
                  rows={3}
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 text-white placeholder-white/30 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500/50 resize-none"
                />
              ) : (
                <p className="text-white/90">{profile?.looking_for || <span className="text-white/40 italic">Not set</span>}</p>
              )}
            </div>

            {/* Interests */}
            <div>
              <h3 className="text-sm font-semibold text-white/60 mb-2">Interests</h3>
              {isEditing ? (
                <div className="flex flex-wrap gap-2">
                  {allInterests.map((interest) => (
                    <button
                      key={interest.id}
                      onClick={() => toggleEditInterest(interest.id)}
                      className={`px-3 py-1 rounded-full text-sm transition-all ${
                        selectedInterestIds.includes(interest.id)
                          ? 'bg-purple-500 text-white'
                          : 'bg-white/10 border border-white/10 text-white/70 hover:bg-white/20'
                      }`}
                    >
                      {interest.name}
                    </button>
                  ))}
                </div>
              ) : userInterests.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {userInterests.map((interest) => (
                    <span
                      key={interest.id}
                      className="px-3 py-1 bg-purple-500/20 border border-purple-500/30 text-purple-300 rounded-full text-sm"
                    >
                      {interest.name}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="text-white/40 italic">No interests selected</p>
              )}
            </div>

            {/* Event Preferences */}
            <div>
              <h3 className="text-sm font-semibold text-white/60 mb-2">Event Preferences</h3>
              {isEditing ? (
                <div className="space-y-3">
                  <div>
                    <p className="text-xs text-white/40 mb-2">Event Size</p>
                    <div className="flex flex-wrap gap-2">
                      {EVENT_SIZES.map((size) => (
                        <button
                          key={size.value}
                          onClick={() => toggleEditSize(size.value)}
                          className={`px-3 py-1 rounded-full text-sm transition-all ${
                            editForm.event_size_preference.includes(size.value)
                              ? 'bg-blue-500 text-white'
                              : 'bg-white/10 border border-white/10 text-white/70 hover:bg-white/20'
                          }`}
                        >
                          {size.label}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <p className="text-xs text-white/40 mb-2">Event Vibe</p>
                    <div className="flex flex-wrap gap-2">
                      {EVENT_VIBES.map((vibe) => (
                        <button
                          key={vibe.value}
                          onClick={() => toggleEditVibe(vibe.value)}
                          className={`px-3 py-1 rounded-full text-sm transition-all ${
                            editForm.event_vibe.includes(vibe.value)
                              ? 'bg-green-500 text-white'
                              : 'bg-white/10 border border-white/10 text-white/70 hover:bg-white/20'
                          }`}
                        >
                          {vibe.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (profile?.event_size_preference?.length || profile?.event_vibe?.length) ? (
                <div className="flex flex-wrap gap-2">
                  {profile?.event_size_preference?.map((size) => (
                    <span
                      key={size}
                      className="px-3 py-1 bg-blue-500/20 border border-blue-500/30 text-blue-300 rounded-full text-sm capitalize"
                    >
                      {size} events
                    </span>
                  ))}
                  {profile?.event_vibe?.map((vibe) => (
                    <span
                      key={vibe}
                      className="px-3 py-1 bg-green-500/20 border border-green-500/30 text-green-300 rounded-full text-sm capitalize"
                    >
                      {vibe}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="text-white/40 italic">No preferences set</p>
              )}
            </div>
          </div>
        </section>

        {/* Socials Section */}
        <section className="mb-6">
          <h2 className="text-2xl font-bold text-white mb-4">Socials</h2>

          {isEditing ? (
            <div className="bg-white/5 border border-white/10 rounded-2xl p-5 space-y-4">
              <div>
                <label className="block text-sm text-white/60 mb-2">Twitter / X</label>
                <div className="flex">
                  <span className="inline-flex items-center px-3 bg-white/10 border border-r-0 border-white/10 rounded-l-xl text-white/50 text-sm">@</span>
                  <input
                    type="text"
                    value={editForm.twitter_handle}
                    onChange={(e) => setEditForm(prev => ({ ...prev, twitter_handle: e.target.value.replace('@', '') }))}
                    placeholder="username"
                    className="flex-1 px-3 py-2 bg-white/5 border border-white/10 text-white placeholder-white/30 rounded-r-xl focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm text-white/60 mb-2">LinkedIn</label>
                <input
                  type="url"
                  value={editForm.linkedin_url}
                  onChange={(e) => setEditForm(prev => ({ ...prev, linkedin_url: e.target.value }))}
                  placeholder="https://linkedin.com/in/yourprofile"
                  className="w-full px-3 py-2 bg-white/5 border border-white/10 text-white placeholder-white/30 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                />
              </div>
              <div>
                <label className="block text-sm text-white/60 mb-2">Instagram</label>
                <div className="flex">
                  <span className="inline-flex items-center px-3 bg-white/10 border border-r-0 border-white/10 rounded-l-xl text-white/50 text-sm">@</span>
                  <input
                    type="text"
                    value={editForm.instagram_handle}
                    onChange={(e) => setEditForm(prev => ({ ...prev, instagram_handle: e.target.value.replace('@', '') }))}
                    placeholder="username"
                    className="flex-1 px-3 py-2 bg-white/5 border border-white/10 text-white placeholder-white/30 rounded-r-xl focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm text-white/60 mb-2">Website</label>
                <input
                  type="url"
                  value={editForm.website_url}
                  onChange={(e) => setEditForm(prev => ({ ...prev, website_url: e.target.value }))}
                  placeholder="https://yourwebsite.com"
                  className="w-full px-3 py-2 bg-white/5 border border-white/10 text-white placeholder-white/30 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                />
              </div>
            </div>
          ) : (profile?.twitter_handle || profile?.linkedin_url || profile?.instagram_handle || profile?.website_url) ? (
            <div className="grid grid-cols-2 gap-3">
              {profile?.twitter_handle && (
                <a
                  href={`https://twitter.com/${profile.twitter_handle}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="bg-white/5 border border-white/10 rounded-xl p-4 flex items-center gap-3 hover:bg-white/10 transition-all"
                >
                  <div className="w-10 h-10 bg-black rounded-lg flex items-center justify-center">
                    <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                    </svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-white/60">Twitter</p>
                    <p className="text-white font-medium truncate">@{profile.twitter_handle}</p>
                  </div>
                </a>
              )}

              {profile?.linkedin_url && (
                <a
                  href={profile.linkedin_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="bg-white/5 border border-white/10 rounded-xl p-4 flex items-center gap-3 hover:bg-white/10 transition-all"
                >
                  <div className="w-10 h-10 bg-[#0A66C2] rounded-lg flex items-center justify-center">
                    <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
                    </svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-white/60">LinkedIn</p>
                    <p className="text-white font-medium truncate">Profile</p>
                  </div>
                </a>
              )}

              {profile?.instagram_handle && (
                <a
                  href={`https://instagram.com/${profile.instagram_handle}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="bg-white/5 border border-white/10 rounded-xl p-4 flex items-center gap-3 hover:bg-white/10 transition-all"
                >
                  <div className="w-10 h-10 bg-gradient-to-br from-purple-600 via-pink-500 to-orange-400 rounded-lg flex items-center justify-center">
                    <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
                    </svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-white/60">Instagram</p>
                    <p className="text-white font-medium truncate">@{profile.instagram_handle}</p>
                  </div>
                </a>
              )}

              {profile?.website_url && (
                <a
                  href={profile.website_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="bg-white/5 border border-white/10 rounded-xl p-4 flex items-center gap-3 hover:bg-white/10 transition-all"
                >
                  <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
                    </svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-white/60">Website</p>
                    <p className="text-white font-medium truncate">{profile.website_url.replace(/^https?:\/\//, '')}</p>
                  </div>
                </a>
              )}
            </div>
          ) : (
            <p className="text-white/40 italic bg-white/5 border border-white/10 rounded-2xl p-5">No social links added</p>
          )}
        </section>

        {/* Friends Section */}
        <section className="mb-6">
          <h2 className="text-2xl font-bold text-white mb-4">Friends</h2>

          <div className="space-y-3">
            {/* All Friends */}
            <button
              onClick={() => router.push('/profile/friends')}
              className="w-full bg-white/10 border border-white/20 rounded-2xl p-5 flex items-center gap-4 hover:bg-white/15 transition-all"
            >
              <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
                <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <div className="flex-1 text-left">
                <h3 className="text-lg font-semibold text-white">All Friends</h3>
                <p className="text-sm text-white/60">{connections.length} Total</p>
              </div>
              <svg className="w-6 h-6 text-white/40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>

            {/* Invite Friends */}
            <button className="w-full bg-white/10 border border-white/20 rounded-2xl p-5 flex items-center gap-4 hover:bg-white/15 transition-all">
              <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center relative">
                <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-green-500 rounded-full flex items-center justify-center">
                  <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 4v16m8-8H4" />
                  </svg>
                </div>
              </div>
              <div className="flex-1 text-left">
                <h3 className="text-lg font-semibold text-white">Invite Friends</h3>
              </div>
              <svg className="w-6 h-6 text-white/40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>

            {/* Friend Requests */}
            <button
              onClick={() => router.push('/profile/requests')}
              className="w-full bg-white/10 border border-white/20 rounded-2xl p-5 flex items-center gap-4 hover:bg-white/15 transition-all"
            >
              <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center relative">
                <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                <div className="absolute -top-1 -right-1 w-5 h-5 bg-white/30 rounded-full flex items-center justify-center">
                  <span className="text-xs text-white font-bold">?</span>
                </div>
              </div>
              <div className="flex-1 text-left">
                <h3 className="text-lg font-semibold text-white">Friend Requests</h3>
              </div>
              <svg className="w-6 h-6 text-white/40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        </section>

        {/* Overview Section */}
        <section className="mb-8">
          <h2 className="text-2xl font-bold text-white mb-4">Overview</h2>

          <div className="space-y-3">
            {/* Events Created */}
            <button className="w-full bg-white/10 border border-white/20 rounded-2xl p-5 flex items-center gap-4 hover:bg-white/15 transition-all">
              <div className="text-5xl">📅</div>
              <div className="flex-1 text-left">
                <h3 className="text-lg font-semibold text-white">Events Created</h3>
                <p className="text-sm text-white/60">{eventsCreated} Total</p>
              </div>
              <svg className="w-6 h-6 text-white/40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>

            {/* Events Attended */}
            <button className="w-full bg-white/10 border border-white/20 rounded-2xl p-5 flex items-center gap-4 hover:bg-white/15 transition-all">
              <div className="text-5xl">🎉</div>
              <div className="flex-1 text-left">
                <h3 className="text-lg font-semibold text-white">Events Attended</h3>
                <p className="text-sm text-white/60">{eventsAttended} Total</p>
              </div>
              <svg className="w-6 h-6 text-white/40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>

            {/* Connections */}
            <button className="w-full bg-white/10 border border-white/20 rounded-2xl p-5 flex items-center gap-4 hover:bg-white/15 transition-all">
              <div className="text-5xl">🤝</div>
              <div className="flex-1 text-left">
                <h3 className="text-lg font-semibold text-white">Connections Made</h3>
                <p className="text-sm text-white/60">{connections.length} Total</p>
              </div>
              <svg className="w-6 h-6 text-white/40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        </section>

        {/* Sign Out Button */}
        <button
          onClick={handleSignOut}
          className="w-full bg-red-500/20 border border-red-500/30 text-red-300 py-4 rounded-2xl font-semibold hover:bg-red-500/30 transition-all"
        >
          Sign Out
        </button>
      </main>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-black/60 backdrop-blur-xl border-t border-white/10 safe-area-bottom">
        <div className="max-w-2xl mx-auto px-6 py-3">
          <div className="flex items-center justify-between">
            <button
              onClick={() => router.push('/dashboard')}
              className="flex flex-col items-center gap-1 px-6 py-2"
            >
              <svg className="w-6 h-6 text-white/40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
              </svg>
              <span className="text-xs text-white/40">Home</span>
            </button>

            <button
              onClick={() => router.push('/events')}
              className="flex flex-col items-center gap-1 px-6 py-2"
            >
              <svg className="w-6 h-6 text-white/40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <span className="text-xs text-white/40">Events</span>
            </button>

            <button
              onClick={() => router.push('/discover')}
              className="flex flex-col items-center gap-1 px-6 py-2"
            >
              <svg className="w-6 h-6 text-white/40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              <span className="text-xs text-white/40">Discover</span>
            </button>

            <button className="flex flex-col items-center gap-1 px-6 py-2">
              <svg className="w-6 h-6 text-white/40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
              <span className="text-xs text-white/40">Library</span>
            </button>

            <button className="flex flex-col items-center gap-1 px-4 py-2">
              <div className="w-6 h-6 bg-gradient-to-br from-pink-400 via-purple-500 to-blue-600 rounded-full flex items-center justify-center">
                <span className="text-xs text-white font-bold">{getInitials(profile?.full_name || null)}</span>
              </div>
            </button>
          </div>
        </div>
      </nav>
    </div>
  )
}
