import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss  from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
      host: true,
      allowedHosts: true,
    proxy: {
      '/api/user': {
        target: 'http://localhost:5280',
        changeOrigin: true,
        secure: false,
      },
      '/api/company': {
        target: 'http://localhost:5158',
        changeOrigin: true,
        secure: false,
      },
      '/api/auth': {
        target: 'http://localhost:5000',
        changeOrigin: true,
      },
      '/api/send-verification': {
        target: 'http://localhost:5000',
        changeOrigin: true,
      },
      '/api/check-verification': {
        target: 'http://localhost:5000',
        changeOrigin: true,
      },
      '/api/verify': {
        target: 'http://localhost:5000',
        changeOrigin: true,
      },
      '/api/verification': {
        target: 'http://localhost:5003',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/verification/, '')
      },
      '/api/coding': {
        target: 'http://localhost:8000',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/coding/, '')
      },
      '/api/interview': {
        target: 'http://localhost:8001',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/interview/, '')
      },
      '/api/communication': {
        target: 'http://localhost:8002',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/communication/, '')
      },
      '/api/aptitude': {
        target: 'http://localhost:5002',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/aptitude/, '')
      },
      '/api/contact': {
        target: 'http://localhost:5000',
        changeOrigin: true,
      },
      '/api/screening': {
        target: 'http://localhost:5001',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/screening/, '')
      },
      '/api/proctor/face': {
        target: 'http://localhost:8004',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/proctor\/face/, '')
      },
      '/api/proctor/live': {
        target: 'http://localhost:8005',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/proctor\/live/, '')
      }
    }
  }
})
