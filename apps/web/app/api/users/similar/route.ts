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

export async function POST(request: NextRequest) {
  try {
    const { userId, limit = 20 } = await request.json()

    if (!userId) {
      return NextResponse.json({ error: 'userId is required' }, { status: 400 })
    }

    // Get current user's embedding
    const { data: currentUser, error: userError } = await supabaseAdmin
      .from('profiles')
      .select('embedding')
      .eq('id', userId)
      .single()

    if (userError || !currentUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // If user doesn't have an embedding, generate one first
    if (!currentUser.embedding) {
      const generateResponse = await fetch(
        `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3001'}/api/embeddings/generate`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId })
        }
      )

      if (!generateResponse.ok) {
        return NextResponse.json({ error: 'Failed to generate user embedding' }, { status: 500 })
      }

      // Refetch the embedding
      const { data: updatedUser } = await supabaseAdmin
        .from('profiles')
        .select('embedding')
        .eq('id', userId)
        .single()

      if (!updatedUser?.embedding) {
        return NextResponse.json({ error: 'No embedding available' }, { status: 400 })
      }

      currentUser.embedding = updatedUser.embedding
    }

    // Try RPC first, fallback to direct query if it fails
    let similarUsers: any[] = []

    console.log('Current user embedding exists:', !!currentUser.embedding)
    console.log('Embedding length:', currentUser.embedding?.length || 0)

    const { data: rpcResult, error: matchError } = await supabaseAdmin
      .rpc('match_users', {
        query_embedding: currentUser.embedding,
        current_user_id: userId,
        match_count: limit
      })

    console.log('RPC result count:', rpcResult?.length || 0)
    console.log('RPC error:', matchError)

    if (matchError) {
      console.error('Match RPC error:', matchError.message, matchError.details, matchError.hint)

      // Fallback: query all profiles directly (without vector sorting)
      const { data: fallbackUsers, error: fallbackError } = await supabaseAdmin
        .from('profiles')
        .select('id, full_name, bio, location, avatar_url, about_me, looking_for, event_size_preference, event_vibe')
        .neq('id', userId)
        .not('full_name', 'is', null)
        .limit(limit)

      if (fallbackError) {
        console.error('Fallback error:', fallbackError)
        return NextResponse.json({ error: 'Failed to find users' }, { status: 500 })
      }

      // Add default similarity for fallback
      similarUsers = (fallbackUsers || []).map(u => ({ ...u, similarity: 0.5 }))
    } else {
      similarUsers = rpcResult || []
    }

    // Fetch interests for each similar user
    const usersWithInterests = await Promise.all(
      (similarUsers || []).map(async (user: { id: string; similarity: number }) => {
        const { data: interests } = await supabaseAdmin
          .from('user_interests')
          .select('interests(name)')
          .eq('user_id', user.id)

        return {
          ...user,
          matchScore: Math.round(user.similarity * 100),
          interests: interests
            ?.map((ui) => {
              const interest = ui.interests as unknown as { name: string } | null
              return interest?.name
            })
            .filter((n): n is string => Boolean(n)) || []
        }
      })
    )

    return NextResponse.json({
      users: usersWithInterests,
      count: usersWithInterests.length
    })

  } catch (error) {
    console.error('Error finding similar users:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
