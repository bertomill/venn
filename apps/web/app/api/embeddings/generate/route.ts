import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

interface ProfileData {
  id: string
  full_name: string | null
  bio: string | null
  about_me: string | null
  looking_for: string | null
  location: string | null
  event_vibe: string[] | null
  event_size_preference: string | null
}

function buildProfileText(profile: ProfileData, interests: string[]): string {
  const parts: string[] = []

  if (profile.full_name) {
    parts.push(`Name: ${profile.full_name}`)
  }

  if (profile.location) {
    parts.push(`Location: ${profile.location}`)
  }

  if (profile.bio) {
    parts.push(`Bio: ${profile.bio}`)
  }

  if (profile.about_me) {
    parts.push(`About me: ${profile.about_me}`)
  }

  if (profile.looking_for) {
    parts.push(`Looking to meet: ${profile.looking_for}`)
  }

  if (interests.length > 0) {
    parts.push(`Interests: ${interests.join(', ')}`)
  }

  if (profile.event_vibe?.length) {
    parts.push(`Event preferences: ${profile.event_vibe.join(', ')}`)
  }

  if (profile.event_size_preference) {
    parts.push(`Prefers ${profile.event_size_preference} sized events`)
  }

  return parts.join('\n')
}

export async function POST(request: NextRequest) {
  try {
    const { userId } = await request.json()

    if (!userId) {
      return NextResponse.json({ error: 'userId is required' }, { status: 400 })
    }

    // Fetch user profile
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single()

    if (profileError || !profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
    }

    // Fetch user interests
    const { data: userInterests } = await supabaseAdmin
      .from('user_interests')
      .select('interests(name)')
      .eq('user_id', userId)

    const interests = userInterests
      ?.map((ui) => {
        const interest = ui.interests as unknown as { name: string } | null
        return interest?.name
      })
      .filter((n): n is string => Boolean(n)) || []

    // Build the text to embed
    const profileText = buildProfileText(profile as ProfileData, interests)

    if (!profileText.trim()) {
      return NextResponse.json({ error: 'Profile has no content to embed' }, { status: 400 })
    }

    // Generate embedding using OpenAI
    const embeddingResponse = await openai.embeddings.create({
      model: 'text-embedding-3-small',
      input: profileText,
    })

    const embedding = embeddingResponse.data[0].embedding

    // Store embedding in profile
    const { error: updateError } = await supabaseAdmin
      .from('profiles')
      .update({ embedding })
      .eq('id', userId)

    if (updateError) {
      console.error('Error storing embedding:', updateError)
      return NextResponse.json({ error: 'Failed to store embedding' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      message: 'Embedding generated successfully',
      textLength: profileText.length
    })

  } catch (error) {
    console.error('Error generating embedding:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// Endpoint to regenerate embeddings for all users (admin use)
export async function PUT(request: NextRequest) {
  try {
    // Fetch all profiles without embeddings
    const { data: profiles, error } = await supabaseAdmin
      .from('profiles')
      .select('id')
      .is('embedding', null)
      .not('full_name', 'is', null)

    if (error) {
      return NextResponse.json({ error: 'Failed to fetch profiles' }, { status: 500 })
    }

    const results = {
      total: profiles?.length || 0,
      success: 0,
      failed: 0
    }

    // Process each profile
    for (const profile of profiles || []) {
      try {
        const response = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3001'}/api/embeddings/generate`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId: profile.id })
        })

        if (response.ok) {
          results.success++
        } else {
          results.failed++
        }
      } catch {
        results.failed++
      }
    }

    return NextResponse.json(results)

  } catch (error) {
    console.error('Error regenerating embeddings:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
