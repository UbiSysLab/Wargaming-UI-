import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: true, // Binds dynamically to all network adapters (0.0.0.0)
    port: 5173,
    proxy: {
      // Proxies '/transcribe' requests to the local ASR server to avoid CORS issues
      '/transcribe': {
        target: 'http://127.0.0.1:8000',
        changeOrigin: true,
        secure: false,
      }
    }
  },
})
