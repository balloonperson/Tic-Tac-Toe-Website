import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const root = path.dirname(fileURLToPath(import.meta.url))

function isIgnoredPath(filePath) {
  const normalized = filePath.replaceAll('\\', '/')
  return (
    normalized.includes('/venv/') ||
    normalized.includes('/.venv/') ||
    normalized.includes('/__pycache__/') ||
    normalized.includes('/dist/') ||
    normalized.includes('/.git/')
  )
}

export default defineConfig({
  plugins: [react()],
  server: {
    fs: {
      strict: true,
      deny: [path.join(root, 'venv'), path.join(root, '.venv')],
    },
    watch: {
      ignored: isIgnoredPath,
    },
  },
})
