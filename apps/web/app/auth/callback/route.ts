import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')

  console.log('[Auth Callback Route] Code:', code ? 'present' : 'missing')

  if (code) {
    const cookieStore = await cookies()

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll()
          },
          setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
            try {
              cookiesToSet.forEach(({ name, value, options }) => {
                cookieStore.set(name, value, options)
              })
            } catch (error) {
              // The `set` method was called from a Server Component.
              // This can be ignored if you have middleware refreshing user sessions.
              console.error('[Auth Callback Route] Error setting cookies:', error)
            }
          },
        },
      }
    )

    const { data, error } = await supabase.auth.exchangeCodeForSession(code)

    console.log('[Auth Callback Route] Exchange result:', {
      success: !error,
      hasSession: !!data?.session,
      error: error?.message
    })

    if (!error && data.session) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('onboarding_completed')
        .eq('id', data.session.user.id)
        .single()

      console.log('[Auth Callback Route] Profile:', profile)

      if (profile?.onboarding_completed) {
        return NextResponse.redirect(new URL('/dashboard', request.url))
      } else {
        return NextResponse.redirect(new URL('/onboarding', request.url))
      }
    }
  }

  // URL to redirect to after sign in process completes
  console.log('[Auth Callback Route] No code or error, redirecting to login')
  return NextResponse.redirect(new URL('/auth/login', request.url))
}
