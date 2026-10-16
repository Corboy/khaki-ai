/**
 * @type {import('next').NextConfig}
 *
 * `outputFileTracingRoot` is set explicitly, and it is not cosmetic.
 *
 * Next walks up from this directory looking for a lockfile to decide the
 * project root. The home directory on this machine carries its own
 * `package-lock.json` (unrelated to this project), so Next found two lockfiles,
 * chose `/Users/imac` as the root, and said so on every build:
 *
 *   ⚠ We detected multiple lockfiles and selected the directory of
 *     /Users/imac/package-lock.json as the root directory.
 *
 * The consequence is not the warning. File tracing resolves every deployed file
 * against that root, so the server bundle was being assembled relative to the
 * home directory rather than to this repository.
 *
 * Pinned to this file's own directory rather than to a literal path, so the
 * config stays correct if the project is cloned elsewhere.
 */
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = dirname(fileURLToPath(import.meta.url));

const nextConfig = {
  reactStrictMode: true,
  outputFileTracingRoot: projectRoot,

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
