import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    port: 5173,
    allowedHosts: "all",
    proxy: {
      '/api': {
        target: 'http://172.10.2.70:8000',
        changeOrigin: true
      }
    }
  }
})
