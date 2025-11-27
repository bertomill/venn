'use client'

import { useState } from 'react'
import { createSupabaseBrowserClient } from '@/lib/supabase-browser'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function SignupPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
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

    if (password !== confirmPassword) {
      setError('Passwords do not match')
      setLoading(false)
      return
    }

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
          data: {
            full_name: fullName,
          },
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
      <div className="min-h-screen bg-[#0a0a0a] flex flex-col">
        <header className="px-6 py-8">
          <Link href="/" className="text-2xl font-bold bg-gradient-to-r from-pink-500 to-orange-400 bg-clip-text text-transparent">
            Venn
          </Link>
        </header>

        <main className="flex-1 px-6 py-8 max-w-md mx-auto w-full flex flex-col justify-center">
          <div className="text-center">
            <div className="w-16 h-16 bg-gradient-to-r from-pink-500 to-orange-400 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-white mb-3">Check your email</h1>
            <p className="text-white/60 mb-8">
              We sent a confirmation link to<br />
              <span className="text-white font-medium">{email}</span>
            </p>
            <Link
              href="/auth/login"
              className="text-pink-400 hover:text-pink-300 font-medium transition-colors"
            >
              Back to sign in
            </Link>
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] flex flex-col">
      {/* Header */}
      <header className="px-6 py-8">
        <Link href="/" className="text-2xl font-bold bg-gradient-to-r from-pink-500 to-orange-400 bg-clip-text text-transparent">
          Venn
        </Link>
      </header>

      {/* Main content */}
      <main className="flex-1 px-6 py-8 max-w-md mx-auto w-full">
        <div className="mb-10">
          <h1 className="text-3xl font-bold text-white mb-3">
            Create your account
          </h1>
          <p className="text-white/50">
            Join and connect with your community
          </p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-500/10 border-l-2 border-red-500 rounded-r-lg">
            <p className="text-sm text-red-400">{error}</p>
          </div>
        )}

        <form onSubmit={handleSignup} className="space-y-8">
          {/* Full name field */}
          <div>
            <label htmlFor="fullName" className="block text-sm text-white/60 mb-3">
              Full name
            </label>
            <input
              id="fullName"
              name="fullName"
              type="text"
              required
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="w-full bg-transparent border-b-2 border-white/20 text-white text-lg py-3 focus:outline-none focus:border-pink-500 transition-colors placeholder-white/30"
              placeholder="Your name"
            />
          </div>

          {/* Email field */}
          <div>
            <label htmlFor="email" className="block text-sm text-white/60 mb-3">
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-transparent border-b-2 border-white/20 text-white text-lg py-3 focus:outline-none focus:border-pink-500 transition-colors placeholder-white/30"
              placeholder="you@example.com"
            />
          </div>

          {/* Password field */}
          <div>
            <label htmlFor="password" className="block text-sm text-white/60 mb-3">
              Password
            </label>
            <input
              id="password"
              name="password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="new-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-transparent border-b-2 border-white/20 text-white text-lg py-3 focus:outline-none focus:border-pink-500 transition-colors placeholder-white/30"
              placeholder="At least 6 characters"
            />
          </div>

          {/* Confirm password field */}
          <div>
            <label htmlFor="confirmPassword" className="block text-sm text-white/60 mb-3">
              Confirm password
            </label>
            <input
              id="confirmPassword"
              name="confirmPassword"
              type={showPassword ? 'text' : 'password'}
              autoComplete="new-password"
              required
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full bg-transparent border-b-2 border-white/20 text-white text-lg py-3 focus:outline-none focus:border-pink-500 transition-colors placeholder-white/30"
              placeholder="Enter password again"
            />
          </div>

          {/* Show password toggle */}
          <label className="flex items-center gap-3 cursor-pointer">
            <div className="relative">
              <input
                type="checkbox"
                checked={showPassword}
                onChange={(e) => setShowPassword(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-5 h-5 border-2 border-white/30 rounded peer-checked:border-pink-500 peer-checked:bg-pink-500 transition-all flex items-center justify-center">
                {showPassword && (
                  <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </div>
            </div>
            <span className="text-white/60 text-sm">Show password</span>
          </label>

          {/* Submit button */}
          <button
            type="submit"
            disabled={loading || !email || !password || !fullName || !confirmPassword}
            className="w-full py-4 rounded-2xl text-white font-semibold bg-gradient-to-r from-pink-500 to-orange-400 hover:from-pink-600 hover:to-orange-500 disabled:opacity-40 disabled:cursor-not-allowed transition-all mt-8"
          >
            {loading ? 'Creating account...' : 'Create account'}
          </button>

          <p className="text-xs text-white/40 text-center">
            By creating an account, you agree to our{' '}
            <Link href="/terms" className="text-white/60 hover:text-white/80 underline">
              Terms
            </Link>{' '}
            and{' '}
            <Link href="/privacy" className="text-white/60 hover:text-white/80 underline">
              Privacy Policy
            </Link>
          </p>
        </form>

        {/* Divider */}
        <div className="relative my-8">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-white/10"></div>
          </div>
          <div className="relative flex justify-center">
            <span className="px-4 bg-[#0a0a0a] text-white/40 text-sm">or</span>
          </div>
        </div>

        {/* Google Sign Up */}
        <button
          type="button"
          onClick={handleGoogleSignUp}
          className="w-full flex items-center justify-center gap-3 py-4 border-2 border-white/10 hover:border-white/20 rounded-2xl text-white font-medium transition-all"
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24">
            <path
              fill="#4285F4"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            />
            <path
              fill="#34A853"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="#FBBC05"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
            />
            <path
              fill="#EA4335"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
            />
          </svg>
          Continue with Google
        </button>

        {/* Sign in link */}
        <p className="mt-10 text-center text-white/50">
          Already have an account?{' '}
          <Link href="/auth/login" className="text-pink-400 hover:text-pink-300 font-medium transition-colors">
            Sign in
          </Link>
        </p>
      </main>
    </div>
  )
}
