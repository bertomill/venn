'use client'

import { useState, useEffect } from 'react'

interface Member {
  userId: string
  fullName: string | null
  avatarUrl: string | null
}

interface BreakoutGroup {
  id: string
  name: string
  sharedInterests: string[]
  createdAt: string
  members: Member[]
}

interface BreakoutGroupsProps {
  eventId: string
  isCreator: boolean
  attendeeCount: number
}

export default function BreakoutGroups({ eventId, isCreator, attendeeCount }: BreakoutGroupsProps) {
  const [groups, setGroups] = useState<BreakoutGroup[]>([])
  const [loading, setLoading] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [expanded, setExpanded] = useState(false)

  useEffect(() => {
    fetchGroups()
  }, [eventId])

  const fetchGroups = async () => {
    setLoading(true)
    setError(null)

    try {
      const res = await fetch(`/api/events/breakout-groups?eventId=${eventId}`)
      const data = await res.json()

      if (res.ok) {
        setGroups(data.groups || [])
      }
    } catch (err) {
      console.error('Error fetching groups:', err)
    } finally {
      setLoading(false)
    }
  }

  const generateGroups = async () => {
    setGenerating(true)
    setError(null)

    try {
      const res = await fetch('/api/events/breakout-groups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ eventId })
      })

      const data = await res.json()

      if (res.ok) {
        setGroups(data.groups || [])
        setExpanded(true)
      } else {
        setError(data.error || 'Failed to generate groups')
      }
    } catch (err) {
      setError('Failed to generate groups')
      console.error('Error generating groups:', err)
    } finally {
      setGenerating(false)
    }
  }

  // Don't show if less than 4 attendees
  if (attendeeCount < 4 && groups.length === 0) {
    return null
  }

  return (
    <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-xl flex items-center justify-center">
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
          </div>
          <div>
            <h2 className="text-lg font-semibold text-white">Breakout Groups</h2>
            <p className="text-white/40 text-sm">
              {groups.length > 0
                ? `${groups.length} groups created`
                : 'Cluster attendees by interests'}
            </p>
          </div>
        </div>

        {groups.length > 0 && (
          <button
            onClick={() => setExpanded(!expanded)}
            className="text-white/60 hover:text-white"
          >
            <svg
              className={`w-5 h-5 transition-transform ${expanded ? 'rotate-180' : ''}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
        )}
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm">
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-6">
          <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-white/40"></div>
        </div>
      ) : groups.length === 0 ? (
        <div>
          {isCreator ? (
            <button
              onClick={generateGroups}
              disabled={generating || attendeeCount < 4}
              className="w-full py-3 px-4 rounded-xl text-sm font-medium bg-gradient-to-r from-indigo-500 to-purple-500 text-white hover:opacity-90 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {generating ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white"></div>
                  Generating...
                </>
              ) : attendeeCount < 4 ? (
                'Need at least 4 attendees'
              ) : (
                <>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                  Generate Groups by Interest
                </>
              )}
            </button>
          ) : (
            <p className="text-white/40 text-sm text-center py-4">
              No breakout groups yet
            </p>
          )}
        </div>
      ) : (
        <>
          {/* Collapsed view - just show avatars */}
          {!expanded && (
            <div className="flex items-center gap-2">
              <div className="flex -space-x-2">
                {groups.slice(0, 3).map((group, idx) => (
                  <div
                    key={group.id}
                    className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 border-2 border-[#0a0a0a] flex items-center justify-center"
                    style={{ zIndex: 3 - idx }}
                  >
                    <span className="text-white text-xs font-bold">{group.members.length}</span>
                  </div>
                ))}
              </div>
              <span className="text-white/40 text-sm">
                {groups.reduce((sum, g) => sum + g.members.length, 0)} people in {groups.length} groups
              </span>
            </div>
          )}

          {/* Expanded view - show all groups */}
          {expanded && (
            <div className="space-y-4">
              {groups.map((group) => (
                <div
                  key={group.id}
                  className="bg-white/5 border border-white/10 rounded-xl p-4"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="text-white font-medium">{group.name}</h3>
                      {group.sharedInterests.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1">
                          {group.sharedInterests.map((interest) => (
                            <span
                              key={interest}
                              className="text-xs bg-indigo-500/20 text-indigo-300 px-2 py-0.5 rounded-full"
                            >
                              {interest}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                    <span className="text-white/40 text-sm">
                      {group.members.length} people
                    </span>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {group.members.map((member) => (
                      <div
                        key={member.userId}
                        className="flex items-center gap-2 bg-white/5 rounded-lg px-2 py-1"
                      >
                        <div className="w-6 h-6 rounded-full bg-gradient-to-br from-pink-400 via-purple-500 to-blue-600 flex items-center justify-center text-white text-xs font-bold overflow-hidden">
                          {member.avatarUrl ? (
                            <img
                              src={member.avatarUrl}
                              alt={member.fullName || ''}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            member.fullName?.[0]?.toUpperCase() || '?'
                          )}
                        </div>
                        <span className="text-white/80 text-sm">
                          {member.fullName || 'Anonymous'}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}

              {/* Regenerate button for creator */}
              {isCreator && (
                <button
                  onClick={generateGroups}
                  disabled={generating}
                  className="w-full py-2 px-4 rounded-xl text-sm font-medium bg-white/5 border border-white/10 text-white/60 hover:text-white hover:bg-white/10 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {generating ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white/40"></div>
                      Regenerating...
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                      Regenerate Groups
                    </>
                  )}
                </button>
              )}
            </div>
          )}
        </>
      )}
    </div>
  )
}
