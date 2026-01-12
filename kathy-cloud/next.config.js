/** @type {import('next').NextConfig} */
const nextConfig = {
  // Disable type checking during build (we'll do it separately in CI)
  typescript: {
    ignoreBuildErrors: true,
  },
  // Disable ESLint during build
  eslint: {
    ignoreDuringBuilds: true,
  },
  // Skip pre-rendering pages that require database connections
  experimental: {
    // Skip page pre-rendering for API routes
    workerThreads: false,
    cpus: 1,
  },
  // Output standalone for better serverless deployments
  output: 'standalone',
}

module.exports = nextConfig

