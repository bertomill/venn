// Test script for semantic search pipeline
// Run with: npx tsx test-semantic-search.ts

import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'

// Load .env.local
config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing env vars. Make sure .env.local has NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function runTests() {
  console.log('\n🧪 SEMANTIC SEARCH DIAGNOSTIC TEST\n')
  console.log('='.repeat(50))

  // Test 1: Check database connection
  console.log('\n1️⃣  Testing database connection...')
  const { data: profiles, error: profilesError } = await supabase
    .from('profiles')
    .select('id, full_name')
    .limit(3)

  if (profilesError) {
    console.log('   ❌ Database error:', profilesError.message)
    return
  }
  console.log(`   ✅ Connected! Found ${profiles?.length || 0} profiles`)

  // Test 2: Check for embeddings
  console.log('\n2️⃣  Checking for embeddings in profiles...')
  const { data: withEmbeddings, error: embError } = await supabase
    .from('profiles')
    .select('id, full_name, embedding')
    .not('embedding', 'is', null)
    .limit(10)

  if (embError) {
    console.log('   ❌ Error checking embeddings:', embError.message)
  } else {
    console.log(`   📊 Profiles with embeddings: ${withEmbeddings?.length || 0}`)
    if (withEmbeddings && withEmbeddings.length > 0) {
      console.log('   ✅ Embeddings exist!')
      const sample = withEmbeddings[0]
      const embeddingLength = Array.isArray(sample.embedding) ? sample.embedding.length : 'unknown'
      console.log(`   📏 Embedding dimension: ${embeddingLength}`)
    } else {
      console.log('   ⚠️  No profiles have embeddings yet!')
    }
  }

  // Test 3: Check profiles without embeddings
  console.log('\n3️⃣  Checking profiles WITHOUT embeddings...')
  const { data: withoutEmbeddings, count } = await supabase
    .from('profiles')
    .select('id, full_name', { count: 'exact' })
    .is('embedding', null)
    .not('full_name', 'is', null)

  console.log(`   📊 Profiles missing embeddings: ${count || withoutEmbeddings?.length || 0}`)

  // Test 4: Test the match_users function exists
  console.log('\n4️⃣  Testing match_users RPC function...')

  // First get a user with an embedding to test with
  const { data: testUser } = await supabase
    .from('profiles')
    .select('id, full_name, embedding')
    .not('embedding', 'is', null)
    .limit(1)
    .single()

  if (!testUser || !testUser.embedding) {
    console.log('   ⚠️  No user with embedding found to test RPC')
  } else {
    console.log(`   🧑 Testing with user: ${testUser.full_name}`)

    const { data: matches, error: rpcError } = await supabase
      .rpc('match_users', {
        query_embedding: testUser.embedding,
        current_user_id: testUser.id,
        match_count: 5
      })

    if (rpcError) {
      console.log('   ❌ RPC Error:', rpcError.message)
      console.log('   💡 Hint:', rpcError.hint || 'none')
      console.log('   📝 Details:', rpcError.details || 'none')
    } else {
      console.log(`   ✅ match_users works! Found ${matches?.length || 0} similar users`)
      if (matches && matches.length > 0) {
        console.log('\n   Top matches:')
        matches.slice(0, 3).forEach((m: any, i: number) => {
          const score = Math.round((m.similarity || 0) * 100)
          console.log(`   ${i + 1}. ${m.full_name} - ${score}% match`)
        })
      }
    }
  }

  // Test 5: List all users and their embedding status
  console.log('\n5️⃣  All users summary:')
  const { data: allProfiles } = await supabase
    .from('profiles')
    .select('id, full_name, embedding, about_me')
    .not('full_name', 'is', null)
    .order('full_name')

  if (allProfiles) {
    console.log(`\n   ${'Name'.padEnd(20)} | Has Embedding | Has About Me`)
    console.log('   ' + '-'.repeat(55))
    allProfiles.forEach(p => {
      const hasEmb = p.embedding ? '✅' : '❌'
      const hasAbout = p.about_me ? '✅' : '❌'
      console.log(`   ${(p.full_name || 'Unknown').padEnd(20)} | ${hasEmb.padEnd(13)} | ${hasAbout}`)
    })
  }

  console.log('\n' + '='.repeat(50))
  console.log('🏁 Test complete!\n')
}

runTests().catch(console.error)
