import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { execSync } from 'node:child_process'

// Unique id for this build (Vercel injects the commit SHA; local builds fall back to
// the current commit / timestamp). Used by the client to detect a new deploy and drop
// stale app caches so every visitor picks up the new bundle.
const commitSha = process.env.VERCEL_GIT_COMMIT_SHA
  || (() => { try { return execSync('git rev-parse HEAD', { stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim() } catch { return '' } })()
const buildId = commitSha || Date.now().toString(36)

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  define: {
    __BUILD_ID__: JSON.stringify(buildId),
  },
})
