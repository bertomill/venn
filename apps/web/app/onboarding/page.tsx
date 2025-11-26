'use client'

import { useState, useEffect } from 'react'
import { createSupabaseBrowserClient } from '@/lib/supabase-browser'
import { useRouter } from 'next/navigation'

interface Interest {
  id: string
  name: string
  category: string
}

const TOTAL_STEPS = 5

const EVENT_SIZES = [
  { value: 'intimate', label: 'Intimate', description: '5-15 people' },
  { value: 'medium', label: 'Medium', description: '20-50 people' },
  { value: 'large', label: 'Large', description: '50+ people' },
  { value: 'any', label: 'No preference', description: 'Any size works' },
]

const EVENT_VIBES = [
  { value: 'professional', label: 'Professional', description: 'Career & business focused' },
  { value: 'social', label: 'Social', description: 'Casual hangouts & meetups' },
  { value: 'creative', label: 'Creative', description: 'Art, music, making things' },
  { value: 'wellness', label: 'Wellness', description: 'Health, fitness, mindfulness' },
  { value: 'learning', label: 'Learning', description: 'Workshops & skill-building' },
]

export default function OnboardingPage() {
  const router = useRouter()
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [suggestingInterests, setSuggestingInterests] = useState(false)
  const supabase = createSupabaseBrowserClient()

  // All interests from DB
  const [interests, setInterests] = useState<Interest[]>([])

  // Form state
  const [aboutMe, setAboutMe] = useState('')
  const [lookingFor, setLookingFor] = useState('')
  const [eventSizePreference, setEventSizePreference] = useState<string[]>([])
  const [eventVibe, setEventVibe] = useState<string[]>([])
  const [selectedInterests, setSelectedInterests] = useState<string[]>([])
  const [suggestedInterestNames, setSuggestedInterestNames] = useState<string[]>([])

  // Socials
  const [twitterHandle, setTwitterHandle] = useState('')
  const [linkedinUrl, setLinkedinUrl] = useState('')
  const [instagramHandle, setInstagramHandle] = useState('')
  const [websiteUrl, setWebsiteUrl] = useState('')

  useEffect(() => {
    fetchInterests()
  }, [])

  const fetchInterests = async () => {
    const { data } = await supabase
      .from('interests')
      .select('*')
      .order('category', { ascending: true })

    if (data) {
      setInterests(data)
    }
  }

  const toggleInterest = (interestId: string) => {
    setSelectedInterests(prev =>
      prev.includes(interestId)
        ? prev.filter(id => id !== interestId)
        : [...prev, interestId]
    )
  }

  const toggleVibe = (vibe: string) => {
    setEventVibe(prev =>
      prev.includes(vibe)
        ? prev.filter(v => v !== vibe)
        : [...prev, vibe]
    )
  }

  const toggleSize = (size: string) => {
    setEventSizePreference(prev =>
      prev.includes(size)
        ? prev.filter(s => s !== size)
        : [...prev, size]
    )
  }

  const handleNext = async () => {
    if (step === 3) {
      // Start AI analysis before transitioning
      setSuggestingInterests(true)
      try {
        const response = await fetch('/api/ai/suggest-interests', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ aboutMe, lookingFor }),
        })

        const data = await response.json()

        if (data.suggestedInterests) {
          setSuggestedInterestNames(data.suggestedInterests)
          // Auto-select suggested interests
          const suggestedIds = interests
            .filter(i => data.suggestedInterests.includes(i.name))
            .map(i => i.id)
          setSelectedInterests(suggestedIds)
        }
      } catch (error) {
        console.error('Error getting suggestions:', error)
      } finally {
        setSuggestingInterests(false)
      }
    }
    setStep(prev => prev + 1)
  }

  const handleComplete = async () => {
    setLoading(true)

    try {
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) throw new Error('No user found')

      // Update profile with all new fields
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          about_me: aboutMe,
          looking_for: lookingFor,
          event_size_preference: eventSizePreference.length > 0 ? eventSizePreference : null,
          event_vibe: eventVibe.length > 0 ? eventVibe : null,
          twitter_handle: twitterHandle || null,
          linkedin_url: linkedinUrl || null,
          instagram_handle: instagramHandle || null,
          website_url: websiteUrl || null,
          onboarding_completed: true,
        } as never)
        .eq('id', user.id)

      if (profileError) throw profileError

      // Add selected interests
      if (selectedInterests.length > 0) {
        // First remove any existing interests
        await supabase
          .from('user_interests')
          .delete()
          .eq('user_id', user.id)

        const userInterests = selectedInterests.map(interestId => ({
          user_id: user.id,
          interest_id: interestId,
        }))

        const { error: interestsError } = await supabase
          .from('user_interests')
          .insert(userInterests as never)

        if (interestsError) throw interestsError
      }

      // Generate embedding for the new profile (don't block navigation)
      fetch('/api/embeddings/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id })
      }).catch(err => console.error('Error generating embedding:', err))

      router.push('/dashboard')
    } catch (err) {
      console.error('Error completing onboarding:', err)
    } finally {
      setLoading(false)
    }
  }

  const groupedInterests = interests.reduce((acc, interest) => {
    if (!acc[interest.category]) {
      acc[interest.category] = []
    }
    acc[interest.category].push(interest)
    return acc
  }, {} as Record<string, Interest[]>)

  const getStepTitle = () => {
    switch (step) {
      case 1: return 'Tell us about yourself'
      case 2: return 'Who do you want to meet?'
      case 3: return 'Event preferences'
      case 4: return 'Your interests'
      case 5: return 'Connect your socials'
      default: return ''
    }
  }

  const canProceed = () => {
    switch (step) {
      case 1: return aboutMe.trim().length >= 20
      case 2: return lookingFor.trim().length >= 20
      case 3: return eventSizePreference.length > 0
      case 4: return selectedInterests.length >= 3
      case 5: return true // Socials are optional
      default: return false
    }
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] py-12 px-4">
      <div className="max-w-3xl mx-auto">
        <div className="bg-white/5 border border-white/10 backdrop-blur-md rounded-3xl p-8">
          {/* Header */}
          <div className="mb-8">
            <div className="flex justify-between items-center mb-4">
              <h1 className="text-3xl font-bold text-white">
                {getStepTitle()}
              </h1>
              <span className="text-sm text-white/40">
                Step {step} of {TOTAL_STEPS}
              </span>
            </div>
            <div className="w-full bg-white/10 rounded-full h-2">
              <div
                className="bg-gradient-to-r from-blue-500 to-purple-500 h-2 rounded-full transition-all duration-500"
                style={{ width: `${(step / TOTAL_STEPS) * 100}%` }}
              />
            </div>
          </div>

          {/* Step 1: About You */}
          {step === 1 && (
            <div className="space-y-6">
              <p className="text-white/60">
                Share what you do, what you&apos;re working on, and what you&apos;re passionate about.
                This helps our AI find events where you&apos;ll meet the right people.
              </p>
              <textarea
                value={aboutMe}
                onChange={(e) => setAboutMe(e.target.value)}
                placeholder="I'm a product designer at a fintech startup, currently building an AI-powered budgeting app. Outside of work, I'm passionate about photography and exploring new coffee shops..."
                rows={6}
                className="w-full px-4 py-3 bg-white/5 border border-white/10 text-white placeholder-white/30 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500/50 resize-none"
              />
              <p className="text-sm text-white/40">
                {aboutMe.length < 20 ? `At least ${20 - aboutMe.length} more characters` : 'Looking good!'}
              </p>
            </div>
          )}

          {/* Step 2: Who You Want to Meet */}
          {step === 2 && (
            <div className="space-y-6">
              <p className="text-white/60">
                Describe the kind of people you&apos;d love to connect with. Think about who would make an event feel worthwhile.
              </p>
              <textarea
                value={lookingFor}
                onChange={(e) => setLookingFor(e.target.value)}
                placeholder="I'd love to meet other founders who are building in the AI space, designers who can push my thinking on UX, and investors who are excited about consumer fintech..."
                rows={6}
                className="w-full px-4 py-3 bg-white/5 border border-white/10 text-white placeholder-white/30 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500/50 resize-none"
              />
              <p className="text-sm text-white/40">
                {lookingFor.length < 20 ? `At least ${20 - lookingFor.length} more characters` : 'Looking good!'}
              </p>
            </div>
          )}

          {/* Step 3: Event Preferences */}
          {step === 3 && (
            <div className="space-y-8">
              <div>
                <h3 className="text-lg font-semibold text-white mb-4">Event size (select all that apply)</h3>
                <div className="grid grid-cols-2 gap-3">
                  {EVENT_SIZES.map((size) => (
                    <button
                      key={size.value}
                      onClick={() => toggleSize(size.value)}
                      className={`p-4 rounded-xl text-left transition-all ${
                        eventSizePreference.includes(size.value)
                          ? 'bg-purple-500/20 border-2 border-purple-500'
                          : 'bg-white/5 border border-white/10 hover:bg-white/10'
                      }`}
                    >
                      <div className="font-semibold text-white">{size.label}</div>
                      <div className="text-sm text-white/50">{size.description}</div>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-white mb-4">Event vibe (select all that apply)</h3>
                <div className="grid grid-cols-2 gap-3">
                  {EVENT_VIBES.map((vibe) => (
                    <button
                      key={vibe.value}
                      onClick={() => toggleVibe(vibe.value)}
                      className={`p-4 rounded-xl text-left transition-all ${
                        eventVibe.includes(vibe.value)
                          ? 'bg-purple-500/20 border-2 border-purple-500'
                          : 'bg-white/5 border border-white/10 hover:bg-white/10'
                      }`}
                    >
                      <div className="font-semibold text-white">{vibe.label}</div>
                      <div className="text-sm text-white/50">{vibe.description}</div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Step 4: Interests */}
          {step === 4 && (
            <div className="space-y-6">
              {suggestedInterestNames.length > 0 && (
                <div className="bg-purple-500/10 border border-purple-500/30 rounded-xl p-4 mb-6">
                  <p className="text-purple-300 text-sm">
                    Based on what you shared, we&apos;ve pre-selected some interests. Feel free to adjust!
                  </p>
                </div>
              )}

              <p className="text-white/60">
                Select at least 3 interests to help us match you with the right events and people.
              </p>

              {Object.entries(groupedInterests).map(([category, categoryInterests]) => (
                <div key={category}>
                  <h3 className="text-lg font-semibold text-white mb-3">
                    {category}
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {categoryInterests.map((interest) => {
                      const isSuggested = suggestedInterestNames.includes(interest.name)
                      const isSelected = selectedInterests.includes(interest.id)
                      return (
                        <button
                          key={interest.id}
                          onClick={() => toggleInterest(interest.id)}
                          className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                            isSelected
                              ? 'bg-purple-500 text-white'
                              : isSuggested
                              ? 'bg-purple-500/20 border border-purple-500/50 text-purple-300 hover:bg-purple-500/30'
                              : 'bg-white/10 border border-white/10 text-white hover:bg-white/20 hover:border-white/20'
                          }`}
                        >
                          {interest.name}
                        </button>
                      )
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Step 5: Socials */}
          {step === 5 && (
            <div className="space-y-6">
              <p className="text-white/60">
                Optional: Add your social links so people can connect with you after events.
              </p>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-white/60 mb-2">
                    Twitter / X
                  </label>
                  <div className="flex">
                    <span className="inline-flex items-center px-4 bg-white/10 border border-r-0 border-white/10 rounded-l-xl text-white/50">
                      @
                    </span>
                    <input
                      type="text"
                      value={twitterHandle}
                      onChange={(e) => setTwitterHandle(e.target.value.replace('@', ''))}
                      placeholder="username"
                      className="flex-1 px-4 py-3 bg-white/5 border border-white/10 text-white placeholder-white/30 rounded-r-xl focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500/50"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-white/60 mb-2">
                    LinkedIn
                  </label>
                  <input
                    type="url"
                    value={linkedinUrl}
                    onChange={(e) => setLinkedinUrl(e.target.value)}
                    placeholder="https://linkedin.com/in/yourprofile"
                    className="w-full px-4 py-3 bg-white/5 border border-white/10 text-white placeholder-white/30 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500/50"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-white/60 mb-2">
                    Instagram
                  </label>
                  <div className="flex">
                    <span className="inline-flex items-center px-4 bg-white/10 border border-r-0 border-white/10 rounded-l-xl text-white/50">
                      @
                    </span>
                    <input
                      type="text"
                      value={instagramHandle}
                      onChange={(e) => setInstagramHandle(e.target.value.replace('@', ''))}
                      placeholder="username"
                      className="flex-1 px-4 py-3 bg-white/5 border border-white/10 text-white placeholder-white/30 rounded-r-xl focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500/50"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-white/60 mb-2">
                    Website / Portfolio
                  </label>
                  <input
                    type="url"
                    value={websiteUrl}
                    onChange={(e) => setWebsiteUrl(e.target.value)}
                    placeholder="https://yourwebsite.com"
                    className="w-full px-4 py-3 bg-white/5 border border-white/10 text-white placeholder-white/30 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500/50"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Navigation */}
          <div className="flex gap-4 pt-8">
            {step > 1 && (
              <button
                onClick={() => setStep(prev => prev - 1)}
                className="flex-1 bg-white/10 border border-white/10 text-white py-3 px-6 rounded-xl hover:bg-white/20 hover:border-white/20 font-semibold transition-all"
              >
                Back
              </button>
            )}

            {step < TOTAL_STEPS ? (
              <button
                onClick={handleNext}
                disabled={!canProceed() || suggestingInterests}
                className="flex-1 bg-gradient-to-r from-blue-500 to-purple-500 text-white py-3 px-6 rounded-xl hover:opacity-90 font-semibold disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                {suggestingInterests ? (
                  <span className="flex items-center justify-center gap-3">
                    <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    AI is analyzing your profile...
                  </span>
                ) : (
                  'Continue'
                )}
              </button>
            ) : (
              <button
                onClick={handleComplete}
                disabled={loading}
                className="flex-1 bg-gradient-to-r from-blue-500 to-purple-500 text-white py-3 px-6 rounded-xl hover:opacity-90 font-semibold disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                {loading ? 'Completing...' : 'Complete Setup'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
