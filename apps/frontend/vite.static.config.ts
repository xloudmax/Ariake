// vite.static.config.ts
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import Unfonts from 'unplugin-fonts/vite'
import path from 'path'
import { visualizer } from 'rollup-plugin-visualizer'
import vitePluginCompression from 'vite-plugin-compression'

export default defineConfig({
  plugins: [
    react(),
    Unfonts({
      fontsource: {
        families: [
          {
            name: 'Inter',
            weights: [400, 500, 600, 700],
            subset: 'latin',
          }
        ]
      }
    }),
    visualizer({ open: false, filename: "stats-static.html" }),
    vitePluginCompression({
      verbose: true,
      disable: false,
      threshold: 10240,
      algorithm: 'gzip',
      ext: '.gz',
    }),
    vitePluginCompression({
      verbose: true,
      disable: false,
      threshold: 10240,
      algorithm: 'brotliCompress',
      ext: '.br',
    }),
  ],
  build: {
    outDir: 'dist-static',
    emptyOutDir: true,
    rollupOptions: {
      input: {
        main: path.resolve(__dirname, 'index.static.html'),
      },
      output: {
        manualChunks: {
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          'vendor-antd': ['antd', '@ant-design/icons'],
          'vendor-utils': ['dayjs', 'clsx', 'tailwind-merge'],
        }
      }
    },
    chunkSizeWarningLimit: 1000,
  },
  base: './', // Use relative paths for GitHub Pages
  define: {
    'import.meta.env.VITE_STATIC_EXPORT': JSON.stringify('true'),
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
      '@kit/utils': path.resolve(__dirname, 'src/utils/cn.ts'),
    },
  },
})
