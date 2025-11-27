'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface AISearchBoxProps {
  onSearch?: (query: string) => void
}

export default function AISearchBox({ onSearch }: AISearchBoxProps) {
  const router = useRouter()
  const [query, setQuery] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!query.trim()) return

    setIsLoading(true)

    // Navigate to search results with the query
    router.push(`/search?q=${encodeURIComponent(query.trim())}`)

    if (onSearch) {
      onSearch(query.trim())
    }
  }

  const quickActions = [
    { icon: '👥', label: 'Find People', query: 'people interested in' },
    { icon: '📅', label: 'Upcoming Events', query: 'events happening soon' },
    { icon: '🎯', label: 'Projects', query: 'people working on projects' },
    { icon: '💼', label: 'Networking', query: 'professionals looking to connect' },
  ]

  return (
    <div className="w-full max-w-3xl mx-auto">
      {/* Main heading */}
      <h1 className="text-4xl md:text-5xl font-bold text-white text-center mb-8">
        What are you looking for?
      </h1>

      {/* Search input */}
      <form onSubmit={handleSubmit} className="relative mb-6">
        <div className="relative bg-white/5 border border-white/10 rounded-2xl overflow-hidden focus-within:border-white/20 focus-within:bg-white/[0.07] transition-all">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Describe who you want to meet, events to attend, or projects to join..."
            className="w-full px-6 py-5 bg-transparent text-white placeholder-white/40 focus:outline-none text-lg"
          />

          {/* Bottom bar with actions */}
          <div className="flex items-center justify-between px-4 py-3 border-t border-white/5">
            <div className="flex items-center gap-2">
              {/* AI indicator */}
              <div className="flex items-center gap-2 px-3 py-1.5 bg-white/5 rounded-lg text-white/60 text-sm">
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                <span>AI-powered</span>
              </div>
            </div>

            {/* Submit button */}
            <button
              type="submit"
              disabled={!query.trim() || isLoading}
              className="p-2 bg-white/10 hover:bg-white/20 disabled:opacity-30 disabled:hover:bg-white/10 rounded-lg transition-all"
            >
              {isLoading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
                </svg>
              )}
            </button>
          </div>
        </div>
      </form>

      {/* Quick action chips */}
      <div className="flex flex-wrap justify-center gap-3">
        {quickActions.map((action) => (
          <button
            key={action.label}
            onClick={() => setQuery(action.query)}
            className="flex items-center gap-2 px-4 py-2 bg-white/5 border border-white/10 rounded-full text-white/70 hover:bg-white/10 hover:text-white hover:border-white/20 transition-all text-sm"
          >
            <span>{action.icon}</span>
            <span>{action.label}</span>
          </button>
        ))}
      </div>
    </div>
  )
}
