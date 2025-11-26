'use client'

export default function Error({
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0a0a0a]">
      <div className="text-center">
        <h1 className="text-6xl font-bold text-white mb-4">500</h1>
        <p className="text-xl text-white/60 mb-8">Something went wrong</p>
        <button
          onClick={() => reset()}
          className="px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-xl font-medium hover:opacity-90 transition-all"
        >
          Try Again
        </button>
      </div>
    </div>
  )
}
