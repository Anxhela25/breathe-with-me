import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    // /api goes to the python backend
    proxy: { '/api': 'http://localhost:8001' },
  },
})
