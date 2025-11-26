const path = require('path')

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Helps with monorepo setups - moved out of experimental in Next.js 15
  outputFileTracingRoot: path.join(__dirname, '../../'),
  // Transpile packages that might cause issues
  transpilePackages: ['@supabase/ssr', '@supabase/supabase-js'],
  // Skip ESLint during build (we can run it separately)
  eslint: {
    ignoreDuringBuilds: true,
  },
}

module.exports = nextConfig
