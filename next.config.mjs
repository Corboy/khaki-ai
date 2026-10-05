/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,

  /*
   * `experimental.workerThreads` used to live here to dodge `spawn EPERM`:
   * forked workers talk over pipes, which some confined environments refuse to
   * create. Next 16 moved this behaviour and the option now breaks the build —
   * with it set, the compiler tries to clone a callback across a worker
   * boundary and dies with `DataCloneError: ()=>null could not be cloned`.
   * Next 15.5 builds this project without it.
   */

  eslint: {
    // Lint is a separate, explicit step inside `pnpm check` so a lint warning
    // can never block a deploy; type errors still fail the build.
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;
