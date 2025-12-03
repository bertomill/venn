import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

function getSupabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

interface Attendee {
  user_id: string
  full_name: string
  avatar_url: string | null
  interests: string[]
}

interface Group {
  members: Attendee[]
  sharedInterests: string[]
  name: string
}

// Calculate interest overlap between two attendees
function getSharedInterests(a: Attendee, b: Attendee): string[] {
  return a.interests.filter(interest => b.interests.includes(interest))
}

// Calculate similarity score based on shared interests
function calculateSimilarity(a: Attendee, b: Attendee): number {
  const shared = getSharedInterests(a, b).length
  const total = new Set([...a.interests, ...b.interests]).size
  return total === 0 ? 0 : shared / total
}

// Find the most common interests in a group
function getGroupSharedInterests(members: Attendee[]): string[] {
  const interestCounts = new Map<string, number>()

  members.forEach(member => {
    member.interests.forEach(interest => {
      interestCounts.set(interest, (interestCounts.get(interest) || 0) + 1)
    })
  })

  // Return interests shared by at least 2 members
  return Array.from(interestCounts.entries())
    .filter(([_, count]) => count >= 2)
    .sort((a, b) => b[1] - a[1])
    .map(([interest]) => interest)
    .slice(0, 3)
}

// Generate a group name based on shared interests
function generateGroupName(sharedInterests: string[], groupIndex: number): string {
  if (sharedInterests.length === 0) {
    return `Group ${groupIndex + 1}`
  }
  return sharedInterests.slice(0, 2).join(' & ')
}

// Greedy clustering algorithm optimized for groups of 4-6
function clusterByInterests(
  attendees: Attendee[],
  minSize: number = 4,
  maxSize: number = 6
): Group[] {
  if (attendees.length < minSize) {
    // Not enough people for even one group
    return attendees.length > 0
      ? [{
          members: attendees,
          sharedInterests: getGroupSharedInterests(attendees),
          name: generateGroupName(getGroupSharedInterests(attendees), 0)
        }]
      : []
  }

  const groups: Group[] = []
  const unassigned = [...attendees]

  while (unassigned.length >= minSize) {
    // Start a new group with the first unassigned person
    const group: Attendee[] = [unassigned.shift()!]

    // Keep adding the most similar person until group is full
    while (group.length < maxSize && unassigned.length > 0) {
      let bestMatch = -1
      let bestScore = -1

      for (let i = 0; i < unassigned.length; i++) {
        // Calculate average similarity to all current group members
        const avgSimilarity = group.reduce(
          (sum, member) => sum + calculateSimilarity(member, unassigned[i]),
          0
        ) / group.length

        if (avgSimilarity > bestScore) {
          bestScore = avgSimilarity
          bestMatch = i
        }
      }

      // Add best match to group
      if (bestMatch !== -1) {
        group.push(unassigned.splice(bestMatch, 1)[0])
      }

      // Stop if group reached minimum and remaining can't form another group
      if (group.length >= minSize && unassigned.length < minSize && unassigned.length > 0) {
        break
      }
    }

    const sharedInterests = getGroupSharedInterests(group)
    groups.push({
      members: group,
      sharedInterests,
      name: generateGroupName(sharedInterests, groups.length)
    })
  }

  // Distribute remaining attendees to existing groups
  if (unassigned.length > 0 && groups.length > 0) {
    for (const person of unassigned) {
      // Find the group with highest average similarity that isn't too large
      let bestGroup = -1
      let bestScore = -1

      for (let i = 0; i < groups.length; i++) {
        if (groups[i].members.length >= maxSize) continue

        const avgSimilarity = groups[i].members.reduce(
          (sum, member) => sum + calculateSimilarity(member, person),
          0
        ) / groups[i].members.length

        if (avgSimilarity > bestScore) {
          bestScore = avgSimilarity
          bestGroup = i
        }
      }

      if (bestGroup !== -1) {
        groups[bestGroup].members.push(person)
        // Recalculate shared interests
        groups[bestGroup].sharedInterests = getGroupSharedInterests(groups[bestGroup].members)
      }
    }
  }

  return groups
}

// POST: Generate breakout groups for an event
export async function POST(request: NextRequest) {
  try {
    const supabaseAdmin = getSupabaseAdmin()
    const { eventId, minGroupSize = 4, maxGroupSize = 6 } = await request.json()

    if (!eventId) {
      return NextResponse.json({ error: 'eventId is required' }, { status: 400 })
    }

    // Get all attendees with their interests
    const { data: attendees, error: attendeesError } = await supabaseAdmin
      .rpc('get_event_attendees_with_interests', { target_event_id: eventId })

    if (attendeesError) {
      console.error('Error fetching attendees:', attendeesError)
      return NextResponse.json({ error: 'Failed to fetch attendees' }, { status: 500 })
    }

    if (!attendees || attendees.length === 0) {
      return NextResponse.json({ error: 'No attendees found for this event' }, { status: 404 })
    }

    // Generate clusters
    const groups = clusterByInterests(attendees, minGroupSize, maxGroupSize)

    // Delete existing breakout groups for this event
    await supabaseAdmin
      .from('breakout_groups')
      .delete()
      .eq('event_id', eventId)

    // Save new groups to database
    const savedGroups = []
    for (const group of groups) {
      const { data: savedGroup, error: groupError } = await supabaseAdmin
        .from('breakout_groups')
        .insert({
          event_id: eventId,
          name: group.name,
          shared_interests: group.sharedInterests
        })
        .select()
        .single()

      if (groupError) {
        console.error('Error saving group:', groupError)
        continue
      }

      // Add members to the group
      const memberInserts = group.members.map(member => ({
        group_id: savedGroup.id,
        user_id: member.user_id
      }))

      await supabaseAdmin
        .from('breakout_group_members')
        .insert(memberInserts)

      savedGroups.push({
        ...savedGroup,
        members: group.members
      })
    }

    return NextResponse.json({
      groups: savedGroups,
      totalGroups: savedGroups.length,
      totalAttendees: attendees.length
    })

  } catch (error) {
    console.error('Error generating breakout groups:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// GET: Fetch existing breakout groups for an event
export async function GET(request: NextRequest) {
  try {
    const supabaseAdmin = getSupabaseAdmin()
    const { searchParams } = new URL(request.url)
    const eventId = searchParams.get('eventId')

    if (!eventId) {
      return NextResponse.json({ error: 'eventId is required' }, { status: 400 })
    }

    // Fetch groups with members
    const { data: groups, error: groupsError } = await supabaseAdmin
      .from('breakout_groups')
      .select(`
        id,
        name,
        shared_interests,
        created_at,
        breakout_group_members (
          user_id,
          profiles (
            id,
            full_name,
            avatar_url
          )
        )
      `)
      .eq('event_id', eventId)

    if (groupsError) {
      console.error('Error fetching groups:', groupsError)
      return NextResponse.json({ error: 'Failed to fetch groups' }, { status: 500 })
    }

    // Format the response
    const formattedGroups = groups?.map(group => ({
      id: group.id,
      name: group.name,
      sharedInterests: group.shared_interests,
      createdAt: group.created_at,
      members: group.breakout_group_members?.map((bgm: any) => ({
        userId: bgm.profiles?.id,
        fullName: bgm.profiles?.full_name,
        avatarUrl: bgm.profiles?.avatar_url
      })) || []
    }))

    return NextResponse.json({
      groups: formattedGroups,
      totalGroups: formattedGroups?.length || 0
    })

  } catch (error) {
    console.error('Error fetching breakout groups:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
