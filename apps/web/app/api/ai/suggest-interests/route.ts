import { openai } from '@ai-sdk/openai'
import { generateObject } from 'ai'
import { z } from 'zod'
import { NextResponse } from 'next/server'

// Available interests from the database
const AVAILABLE_INTERESTS = [
  // Wellness
  'Yoga', 'Meditation', 'Fitness', 'Mental Health', 'Nutrition',
  // Creative
  'Art', 'Music', 'Writing', 'Photography', 'Dance',
  // Professional
  'Entrepreneurship', 'Technology', 'Marketing', 'Design', 'Networking',
  // Social
  'Community Building', 'Volunteering', 'Events', 'Meetups',
  // Learning
  'Self-Development', 'Reading', 'Podcasts', 'Workshops'
]

export async function POST(request: Request) {
  try {
    const { aboutMe, lookingFor } = await request.json()

    if (!aboutMe && !lookingFor) {
      return NextResponse.json(
        { error: 'Please provide aboutMe or lookingFor text' },
        { status: 400 }
      )
    }

    const userInput = `
About me: ${aboutMe || 'Not provided'}
Who I want to meet: ${lookingFor || 'Not provided'}
    `.trim()

    const { object } = await generateObject({
      model: openai('gpt-4o-mini'),
      schema: z.object({
        suggestedInterests: z.array(z.string()).describe('Array of interest names from the available list'),
        reasoning: z.string().describe('Brief explanation of why these interests were selected')
      }) as any,
      prompt: `Based on the following user profile, suggest the most relevant interests from this list:

Available interests: ${AVAILABLE_INTERESTS.join(', ')}

User profile:
${userInput}

Select 3-7 interests that best match this person's background, goals, and the type of people they want to meet. Only return interests from the available list above.`
    })

    // Filter to ensure only valid interests are returned
    const validInterests = object.suggestedInterests.filter(
      (interest: string) => AVAILABLE_INTERESTS.includes(interest)
    )

    return NextResponse.json({
      suggestedInterests: validInterests,
      reasoning: object.reasoning
    })

  } catch (error) {
    console.error('Error suggesting interests:', error)
    return NextResponse.json(
      { error: 'Failed to suggest interests' },
      { status: 500 }
    )
  }
}
