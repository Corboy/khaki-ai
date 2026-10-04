/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,

  experimental: {
    // Run compilation work on worker threads instead of forking child
    // processes. Forked workers communicate over pipes, which some confined
    // and containerised environments refuse to create — threads do not.
    workerThreads: true,
    cpus: 4,
  },

  eslint: {
    // Lint is a separate, explicit step (`pnpm lint`) so a lint warning can
    // never block a deploy; type errors still fail the build.
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;
