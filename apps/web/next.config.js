/** @type {import('next').NextConfig} */
const nextConfig = {
  // Disable static generation for error pages to avoid React context issues
  experimental: {
    // This helps with monorepo setups
    outputFileTracingRoot: require('path').join(__dirname, '../../'),
  },
  // Transpile packages that might cause issues
  transpilePackages: ['@supabase/ssr', '@supabase/supabase-js'],
}

module.exports = nextConfig
