import Link from 'next/link'

export default function Home() {
  return (
    <main className="min-h-screen bg-[#1a1a1a] relative overflow-hidden">
      {/* Navigation Header */}
      <nav className="absolute top-0 left-0 right-0 z-10 px-8 py-6">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          {/* Logo */}
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gradient-to-br from-blue-400 via-purple-500 to-pink-500 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-lg">V</span>
            </div>
            <span className="text-white/70 text-xl font-semibold tracking-tight">venn</span>
          </div>

          {/* Right side nav */}
          <div className="flex items-center gap-6">
            <span className="text-white/50 text-sm">
              {new Date().toLocaleTimeString('en-US', {
                hour: 'numeric',
                minute: '2-digit',
                hour12: true
              })} EST
            </span>
            <Link
              href="/auth/signup"
              className="text-white/50 hover:text-white text-sm transition-colors flex items-center gap-1"
            >
              Explore Events
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
              </svg>
            </Link>
            <Link
              href="/auth/login"
              className="px-6 py-2 bg-white/10 backdrop-blur-sm text-white rounded-full text-sm font-medium hover:bg-white/20 transition-all border border-white/20"
            >
              Sign In
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section - Split Layout */}
      <div className="min-h-screen flex items-center">
        <div className="max-w-7xl mx-auto px-8 w-full">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            {/* Left side - Text content */}
            <div className="space-y-8">
              <div>
                <div className="inline-flex items-center gap-2 mb-6">
                  <div className="w-6 h-6 bg-gradient-to-br from-blue-400 via-purple-500 to-pink-500 rounded-md flex items-center justify-center">
                    <span className="text-white font-bold text-sm">V</span>
                  </div>
                  <span className="text-white/50 text-sm font-medium tracking-wide">venn</span>
                </div>

                <h1 className="text-7xl lg:text-8xl font-bold text-white mb-4 leading-none">
                  Delightful
                  <br />
                  events
                  <br />
                  <span className="bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 bg-clip-text text-transparent">
                    start here.
                  </span>
                </h1>
              </div>

              <p className="text-xl text-white/50 max-w-lg leading-relaxed">
                Set up an event page, invite friends and sell tickets. Host a memorable event today.
              </p>

              <div>
                <Link
                  href="/events/create"
                  className="inline-block px-8 py-4 bg-white text-black rounded-full font-semibold text-base hover:bg-white/90 transition-all shadow-lg"
                >
                  Create Your First Event
                </Link>
              </div>
            </div>

            {/* Right side - Image/Animation placeholder */}
            <div className="relative lg:block hidden">
              <div className="relative w-full h-[600px] flex items-center justify-center">
                {/* Placeholder for animation - dark circular background */}
                <div className="absolute inset-0 bg-gradient-to-br from-gray-800 via-gray-700 to-gray-900 rounded-full blur-3xl opacity-40"></div>

                {/* Mockup placeholder - you'll replace this with your animation */}
                <div className="relative z-10 w-full h-full flex items-center justify-center">
                  <div className="text-center">
                    <div className="w-80 h-[600px] bg-gradient-to-br from-purple-900/10 via-pink-900/10 to-blue-900/10 rounded-3xl border border-white/5 backdrop-blur-sm flex items-center justify-center">
                      <div className="text-white/30 text-sm">
                        Animation will go here
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Optional: Subtle gradient overlays */}
      <div className="absolute top-0 left-0 w-1/2 h-1/2 bg-blue-500/5 blur-[120px] pointer-events-none"></div>
      <div className="absolute bottom-0 right-0 w-1/2 h-1/2 bg-purple-500/5 blur-[120px] pointer-events-none"></div>
    </main>
  )
}
