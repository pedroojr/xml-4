import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  define: {
    'process.env.VITE_API_URL': JSON.stringify('https://dev-api.xml.lojasrealce.shop'),
    'process.env.VITE_ENV': JSON.stringify('development')
  },
  build: {
    outDir: 'dist-dev',
    sourcemap: true
  }
})
