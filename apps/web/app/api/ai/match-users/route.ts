import { anthropic } from '@ai-sdk/anthropic'
import { generateObject } from 'ai'
import { z } from 'zod'
import { NextResponse } from 'next/server'

interface UserProfile {
  id: string
  full_name: string
  about_me: string | null
  looking_for: string | null
  interests: string[]
  event_size_preference: string[] | null
  event_vibe: string[] | null
  location: string | null
  bio: string | null
}

export async function POST(request: Request) {
  try {
    const { currentUser, potentialMatches } = await request.json() as {
      currentUser: UserProfile
      potentialMatches: UserProfile[]
    }

    if (!currentUser || !potentialMatches?.length) {
      return NextResponse.json(
        { error: 'Missing currentUser or potentialMatches' },
        { status: 400 }
      )
    }

    // Build the current user profile summary
    const currentUserSummary = buildProfileSummary(currentUser)

    // Analyze each potential match
    const matchPromises = potentialMatches.map(async (match) => {
      const matchSummary = buildProfileSummary(match)

      const { object } = await generateObject({
        model: anthropic('claude-sonnet-4-20250514'),
        schema: z.object({
          matchScore: z.number().min(0).max(100).describe('Match compatibility score from 0-100'),
          reasoning: z.string().describe('One sentence explaining why these people would connect well (or not)'),
          reciprocalFit: z.object({
            userAMatchesB: z.boolean().describe('Does User A match what User B is looking for?'),
            userBMatchesA: z.boolean().describe('Does User B match what User A is looking for?'),
          }),
          connectionType: z.enum(['similar', 'complementary', 'weak']).describe('Are they similar people or complementary (one has what other needs)?'),
          topReasons: z.array(z.string()).max(3).describe('Top 1-3 specific reasons they would connect'),
        }) as any,
        prompt: `Analyze the compatibility between these two people for professional/social networking.

USER A (the person browsing):
${currentUserSummary}

USER B (potential match):
${matchSummary}

Consider:
1. RECIPROCAL FIT: Does User A match what User B is looking for? Does User B match what User A is looking for?
2. SHARED CONTEXT: Do they have overlapping interests, industries, or goals?
3. COMPLEMENTARY VALUE: Could they help each other (e.g., founder + investor, designer + developer)?
4. EVENT COMPATIBILITY: Would they enjoy the same types of events?

Be honest - if there's no real reason for them to connect, give a low score. A great match (80+) means there's a clear, specific reason they'd benefit from meeting.`
      })

      return {
        userId: match.id,
        fullName: match.full_name,
        ...object
      }
    })

    const results = await Promise.all(matchPromises)

    // Sort by match score descending
    const sortedMatches = results.sort((a, b) => b.matchScore - a.matchScore)

    return NextResponse.json({ matches: sortedMatches })

  } catch (error) {
    console.error('Error matching users:', error)
    return NextResponse.json(
      { error: 'Failed to analyze matches' },
      { status: 500 }
    )
  }
}

function buildProfileSummary(user: UserProfile): string {
  const parts: string[] = []

  if (user.full_name) {
    parts.push(`Name: ${user.full_name}`)
  }

  if (user.about_me) {
    parts.push(`About: ${user.about_me}`)
  } else if (user.bio) {
    parts.push(`Bio: ${user.bio}`)
  }

  if (user.looking_for) {
    parts.push(`Looking to meet: ${user.looking_for}`)
  }

  if (user.interests?.length) {
    parts.push(`Interests: ${user.interests.join(', ')}`)
  }

  if (user.event_size_preference?.length) {
    parts.push(`Prefers ${user.event_size_preference.join('/')} events`)
  }

  if (user.event_vibe?.length) {
    parts.push(`Event vibes: ${user.event_vibe.join(', ')}`)
  }

  if (user.location) {
    parts.push(`Location: ${user.location}`)
  }

  return parts.join('\n')
}
