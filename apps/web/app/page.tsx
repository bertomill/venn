import Link from 'next/link'

export default function Home() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-white to-blue-50">
      {/* Hero Section */}
      <div className="flex flex-col items-center justify-center px-6 pt-32 pb-16 text-center">
        <h1 className="text-6xl font-bold text-gray-900 mb-6 tracking-tight">
          Welcome to Venn
        </h1>
        <h2 className="text-2xl text-gray-600 mb-4 max-w-2xl">
          Connect with Your Community
        </h2>
        <p className="text-lg text-gray-500 mb-12 max-w-xl">
          Find people who share your interests, values, and passions
        </p>

        {/* CTA Buttons */}
        <div className="flex gap-4 mb-20">
          <Link
            href="/auth/signup"
            className="px-8 py-4 bg-blue-600 text-white rounded-full font-semibold text-lg hover:bg-blue-700 transition-all shadow-lg hover:shadow-xl"
          >
            Get Started
          </Link>
          <Link
            href="/auth/login"
            className="px-8 py-4 bg-white text-blue-600 rounded-full font-semibold text-lg hover:bg-gray-50 transition-all border-2 border-blue-600"
          >
            Sign In
          </Link>
        </div>
      </div>

      {/* Features */}
      <div className="max-w-6xl mx-auto px-6 pb-32">
        <div className="grid md:grid-cols-3 gap-8">
          <div className="bg-white rounded-2xl p-8 shadow-sm hover:shadow-md transition-shadow">
            <div className="text-5xl mb-4">🔍</div>
            <h3 className="text-xl font-semibold text-gray-900 mb-3">
              Discover People
            </h3>
            <p className="text-gray-600">
              Get matched with people who share your interests and values
            </p>
          </div>

          <div className="bg-white rounded-2xl p-8 shadow-sm hover:shadow-md transition-shadow">
            <div className="text-5xl mb-4">💬</div>
            <h3 className="text-xl font-semibold text-gray-900 mb-3">
              Make Connections
            </h3>
            <p className="text-gray-600">
              Build meaningful relationships with like-minded individuals
            </p>
          </div>

          <div className="bg-white rounded-2xl p-8 shadow-sm hover:shadow-md transition-shadow">
            <div className="text-5xl mb-4">🌟</div>
            <h3 className="text-xl font-semibold text-gray-900 mb-3">
              Grow Together
            </h3>
            <p className="text-gray-600">
              Join communities and collaborate on shared goals
            </p>
          </div>
        </div>
      </div>
    </main>
  )
}
