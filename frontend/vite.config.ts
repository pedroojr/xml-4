import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vitejs.dev/config/
export default defineConfig(({ command, mode }) => {
  const envDir = path.resolve(__dirname, '..')
  // Carregar variáveis de ambiente baseado no modo
  const env = loadEnv(mode, envDir, '')

  return {
    envDir,
    plugins: [react()],
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
    build: {
      outDir: 'dist',
      assetsDir: 'assets',
      sourcemap: mode === 'development',
      minify: mode === 'production' ? 'esbuild' : false,
      rollupOptions: {
        output: {
          manualChunks: {
            vendor: ['react', 'react-dom'],
            ui: ['@radix-ui/react-tabs', '@radix-ui/react-dialog', '@radix-ui/react-popover'],
          },
        },
      },
    },
    server: {
      port: 4000,
      host: true,
    },
    define: {
      __APP_ENV__: JSON.stringify(env.VITE_ENV || mode),
    },
    test: {
      globals: true,
      environment: 'jsdom',
      setupFiles: './vitest.setup.ts'
    }
  }
})
