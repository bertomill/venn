'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

interface Interest {
  id: string
  name: string
  category: string
}

export default function OnboardingPage() {
  const router = useRouter()
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [interests, setInterests] = useState<Interest[]>([])
  const [selectedInterests, setSelectedInterests] = useState<string[]>([])
  const [location, setLocation] = useState('')
  const [bio, setBio] = useState('')

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

  const handleComplete = async () => {
    setLoading(true)

    try {
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) throw new Error('No user found')

      // Update profile
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          bio,
          location,
        })
        .eq('id', user.id)

      if (profileError) throw profileError

      // Add selected interests
      const userInterests = selectedInterests.map(interestId => ({
        user_id: user.id,
        interest_id: interestId,
      }))

      const { error: interestsError } = await supabase
        .from('user_interests')
        .insert(userInterests)

      if (interestsError) throw interestsError

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

  return (
    <div className="min-h-screen bg-[#0a0a0a] py-12 px-4">
      <div className="max-w-3xl mx-auto">
        <div className="bg-white/5 border border-white/10 backdrop-blur-md rounded-3xl p-8">
          <div className="mb-8">
            <div className="flex justify-between items-center mb-4">
              <h1 className="text-3xl font-bold text-white">
                {step === 1 ? 'Tell us about yourself' : 'Select your interests'}
              </h1>
              <span className="text-sm text-white/40">
                Step {step} of 2
              </span>
            </div>
            <div className="w-full bg-white/10 rounded-full h-2">
              <div
                className="bg-white h-2 rounded-full transition-all"
                style={{ width: `${(step / 2) * 100}%` }}
              />
            </div>
          </div>

          {step === 1 ? (
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-white/60 mb-2">
                  Location
                </label>
                <input
                  type="text"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="San Francisco, CA"
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 text-white placeholder-white/30 rounded-xl focus:outline-none focus:ring-2 focus:ring-white/20 focus:border-white/20"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-white/60 mb-2">
                  Bio
                </label>
                <textarea
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  placeholder="Tell us a bit about yourself..."
                  rows={4}
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 text-white placeholder-white/30 rounded-xl focus:outline-none focus:ring-2 focus:ring-white/20 focus:border-white/20 resize-none"
                />
                <p className="mt-2 text-sm text-white/40">
                  Share what you're passionate about or what you're looking for
                </p>
              </div>

              <button
                onClick={() => setStep(2)}
                className="w-full bg-white text-black py-3 px-6 rounded-xl hover:bg-white/90 font-semibold transition-all"
              >
                Continue
              </button>
            </div>
          ) : (
            <div className="space-y-6">
              <p className="text-white/60">
                Choose at least 3 interests to help us connect you with like-minded people
              </p>

              {Object.entries(groupedInterests).map(([category, categoryInterests]) => (
                <div key={category}>
                  <h3 className="text-lg font-semibold text-white mb-3">
                    {category}
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {categoryInterests.map((interest) => (
                      <button
                        key={interest.id}
                        onClick={() => toggleInterest(interest.id)}
                        className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                          selectedInterests.includes(interest.id)
                            ? 'bg-white text-black'
                            : 'bg-white/10 border border-white/10 text-white hover:bg-white/20 hover:border-white/20'
                        }`}
                      >
                        {interest.name}
                      </button>
                    ))}
                  </div>
                </div>
              ))}

              <div className="flex gap-4 pt-6">
                <button
                  onClick={() => setStep(1)}
                  className="flex-1 bg-white/10 border border-white/10 text-white py-3 px-6 rounded-xl hover:bg-white/20 hover:border-white/20 font-semibold transition-all"
                >
                  Back
                </button>
                <button
                  onClick={handleComplete}
                  disabled={selectedInterests.length < 3 || loading}
                  className="flex-1 bg-white text-black py-3 px-6 rounded-xl hover:bg-white/90 font-semibold disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                >
                  {loading ? 'Completing...' : `Complete (${selectedInterests.length} selected)`}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
