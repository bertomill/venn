'use client'

import { useState } from 'react'
import { createSupabaseBrowserClient } from '@/lib/supabase-browser'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function SignupPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const supabase = createSupabaseBrowserClient()

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    if (password.length < 6) {
      setError('Password must be at least 6 characters')
      setLoading(false)
      return
    }

    try {
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { full_name: fullName },
          emailRedirectTo: `${window.location.origin}/onboarding`,
        },
      })

      if (authError) throw authError

      if (authData.user && !authData.session) {
        setSuccess(true)
        return
      }

      router.push('/onboarding')
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleGoogleSignUp = async () => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      })

      if (error) throw error
    } catch (err: any) {
      setError(err.message)
    }
  }

  if (success) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex flex-col px-6 py-6">
        <header className="flex items-center gap-3">
          <Link href="/" className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-pink-500 to-orange-400 flex items-center justify-center">
              <svg className="w-6 h-6 text-white" viewBox="0 0 24 24" fill="currentColor">
                <circle cx="9" cy="12" r="5" fillOpacity="0.6" />
                <circle cx="15" cy="12" r="5" fillOpacity="0.6" />
              </svg>
            </div>
            <span className="text-xl font-bold text-white">Venn</span>
          </Link>
        </header>

        <main className="flex-1 flex flex-col justify-center items-center max-w-sm mx-auto w-full text-center">
          <div className="w-14 h-14 bg-gradient-to-r from-pink-500 to-orange-400 rounded-full flex items-center justify-center mb-5">
            <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          </div>
          <h1 className="text-xl font-bold text-white mb-2">Check your email</h1>
          <p className="text-white/60 text-sm mb-6">
            We sent a link to <span className="text-white">{email}</span>
          </p>
          <Link href="/auth/login" className="text-pink-400 font-medium text-sm">
            Back to sign in
          </Link>
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] flex flex-col px-6 py-6">
      {/* Header with logo */}
      <header className="flex items-center gap-3">
        <Link href="/" className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-pink-500 to-orange-400 flex items-center justify-center">
            <svg className="w-6 h-6 text-white" viewBox="0 0 24 24" fill="currentColor">
              <circle cx="9" cy="12" r="5" fillOpacity="0.6" />
              <circle cx="15" cy="12" r="5" fillOpacity="0.6" />
            </svg>
          </div>
          <span className="text-xl font-bold text-white">Venn</span>
        </Link>
      </header>

      {/* Main content */}
      <main className="flex-1 flex flex-col justify-center max-w-sm mx-auto w-full">
        <h1 className="text-2xl font-bold text-white mb-1">Create account</h1>
        <p className="text-white/50 text-sm mb-6">Join your community</p>

        {error && (
          <div className="mb-4 p-3 bg-red-500/10 border-l-2 border-red-500 rounded-r-lg">
            <p className="text-sm text-red-400">{error}</p>
          </div>
        )}

        {/* Google Sign Up - Primary option */}
        <button
          type="button"
          onClick={handleGoogleSignUp}
          className="w-full flex items-center justify-center gap-3 py-3.5 bg-white hover:bg-white/90 rounded-2xl text-gray-700 font-medium transition-all mb-4"
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
          </svg>
          Continue with Google
        </button>

        <div className="relative my-4">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-white/10"></div>
          </div>
          <div className="relative flex justify-center">
            <span className="px-3 bg-[#0a0a0a] text-white/40 text-sm">or</span>
          </div>
        </div>

        <form onSubmit={handleSignup} className="space-y-4">
          <div>
            <label htmlFor="fullName" className="block text-sm text-white/60 mb-2">Name</label>
            <input
              id="fullName"
              type="text"
              required
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="w-full bg-transparent border-b-2 border-white/20 text-white py-2 focus:outline-none focus:border-pink-500 transition-colors placeholder-white/30"
              placeholder="Your name"
            />
          </div>

          <div>
            <label htmlFor="email" className="block text-sm text-white/60 mb-2">Email</label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-transparent border-b-2 border-white/20 text-white py-2 focus:outline-none focus:border-pink-500 transition-colors placeholder-white/30"
              placeholder="you@example.com"
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm text-white/60 mb-2">Password</label>
            <input
              id="password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="new-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-transparent border-b-2 border-white/20 text-white py-2 focus:outline-none focus:border-pink-500 transition-colors placeholder-white/30"
              placeholder="Min 6 characters"
            />
          </div>

          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={showPassword}
              onChange={(e) => setShowPassword(e.target.checked)}
              className="w-4 h-4 rounded border-white/30 bg-transparent checked:bg-pink-500 checked:border-pink-500"
            />
            <span className="text-white/50 text-sm">Show password</span>
          </label>

          <button
            type="submit"
            disabled={loading || !email || !password || !fullName}
            className="w-full py-3.5 rounded-2xl text-white font-semibold bg-gradient-to-r from-pink-500 to-orange-400 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
          >
            {loading ? 'Creating...' : 'Create account'}
          </button>

          <p className="text-xs text-white/40 text-center">
            By signing up, you agree to our <Link href="/terms" className="underline">Terms</Link> & <Link href="/privacy" className="underline">Privacy</Link>
          </p>
        </form>

        <p className="mt-5 text-center text-white/50 text-sm">
          Have an account?{' '}
          <Link href="/auth/login" className="text-pink-400 font-medium">Sign in</Link>
        </p>
      </main>
    </div>
  )
}
