import { defineConfig } from 'vite'
import { crx } from '@crxjs/vite-plugin'
import manifest from './manifest.config'

const includeGoogle = process.env.INCLUDE_GOOGLE !== '0'

export default defineConfig({
  plugins: [crx({ manifest })],
  define: {
    __INCLUDE_GOOGLE__: JSON.stringify(includeGoogle),
  },
  server: {
    port: 5173,
    strictPort: true,
    hmr: {
      port: 5173,
    },
  },
})
