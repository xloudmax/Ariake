import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import { visualizer } from 'rollup-plugin-visualizer'
import vitePluginCompression from 'vite-plugin-compression'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    visualizer({ open: false, filename: "stats.html" }), // Do not open automatically in CLI environment
    // 输出 Gzip 压缩文件
    vitePluginCompression({
      verbose: true,
      disable: false,
      threshold: 10240, // 仅压缩大于 10KB 的文件
      algorithm: 'gzip',
      ext: '.gz',
    }),
    // 输出 Brotli 压缩文件
    vitePluginCompression({
      verbose: true,
      disable: false,
      threshold: 10240,
      algorithm: 'brotliCompress',
      ext: '.br',
    }),
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: 'auto',
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        globIgnores: [
          '**/MermaidChart-*.js',
          '**/vendor-mermaid-*.js',
          '**/cytoscape.esm-*.js',
          '**/vendor-cytoscape-*.js',
          '**/MechanismTree-*.js',
          '**/vendor-recharts-*.js',
          '**/EditorPage-*.js',
          '**/LiquidGlassTestPage-*.js',
          '**/vendor-highlight-*.js',
          '**/vendor-hljs-*.js',
          '**/vendor-prism-*.js',
          '**/vendor-katex-*.js',
          '**/KaTeX_*',
          '**/SearchAnalytics-*.js',
          '**/Admin*.js',
        ],
        manifestTransforms: [
          async (entries) => {
            const keepJsPrefixes = [
              'assets/index-',
              'assets/vendor-react-',
              'assets/vendor-antd-',
              'assets/vendor-antd-rc-',
              'assets/vendor-antd-icons-',
              'assets/vendor-apollo-',
            ]
            const keepCssPrefixes = [
              'assets/index-',
            ]

            const manifest = entries.filter((entry) => {
              const { url } = entry

              if (url === 'index.html' || url === 'registerSW.js' || url === 'vite.svg') {
                return true
              }

              if (url.startsWith('assets/inter-latin-') && url.endsWith('.woff2')) {
                return true
              }

              if (url.endsWith('.css')) {
                return keepCssPrefixes.some(prefix => url.startsWith(prefix))
              }

              if (url.endsWith('.js')) {
                return keepJsPrefixes.some(prefix => url.startsWith(prefix))
              }

              return false
            })

            return { manifest, warnings: [] }
          },
        ],
        runtimeCaching: [
          {
            urlPattern: /^https?:\/\/.*\.(?:png|jpg|jpeg|svg|gif|webp)$/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'image-cache',
              expiration: {
                maxEntries: 100,
                maxAgeSeconds: 30 * 24 * 60 * 60, // 30 days
              },
            },
          },
        ],
      },
      manifest: {
        name: 'xloudmax Blog',
        short_name: 'Ariake',
        description: 'A personal blog and playground.',
        theme_color: '#000000',
        icons: [
          {
            src: '/vite.svg',
            sizes: '192x192',
            type: 'image/svg+xml'
          }
        ]
      }
    }) as any // Cast to any to bypass vite/rollup type mismatch
  ],
  server: {
    proxy: {
      '/graphql': {
        target: 'http://localhost:11451',
        changeOrigin: true,
      },
      '/api': {
        target: 'http://localhost:11451',
        changeOrigin: true,
      },
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
      '@kit/utils': path.resolve(__dirname, 'src/utils/cn.ts'),
    },
  },
  optimizeDeps: {
    entries: ['index.html'],
    include: ['@apollo/client'],
  },
  build: {
    modulePreload: false,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules/@ant-design/icons')) {
            return 'vendor-antd-icons';
          }
          if (id.includes('node_modules/@rc-component') || id.includes('/node_modules/rc-')) {
            return 'vendor-antd-rc';
          }
          // Heavy UI framework — load once, cache forever
          if (id.includes('node_modules/antd') || id.includes('node_modules/@ant-design')) {
            return 'vendor-antd';
          }
          // Apollo + GraphQL runtime
          if (id.includes('node_modules/@apollo') || id.includes('node_modules/graphql')) {
            return 'vendor-apollo';
          }
          // KaTeX math renderer
          if (id.includes('node_modules/katex')) {
            return 'vendor-katex';
          }
          // Syntax highlighting: split core and language packs, avoid a monolithic highlight bundle.
          const highlightLanguageMatch = id.match(/node_modules\/highlight\.js\/lib\/languages\/([^/]+)\.js$/)
          if (highlightLanguageMatch) {
            return `vendor-hljs-${highlightLanguageMatch[1]}`;
          }
          if (id.includes('node_modules/highlight.js/lib/core')) {
            return 'vendor-hljs-core';
          }
          if (id.includes('node_modules/refractor') || id.includes('node_modules/prismjs')) {
            return 'vendor-prism';
          }
          if (id.includes('node_modules/highlight.js')) {
            return 'vendor-highlight';
          }
          // React core — tiny but frequently cached
          if (id.includes('node_modules/react/') || id.includes('node_modules/react-dom/') || id.includes('node_modules/react-router')) {
            return 'vendor-react';
          }
        },
      },
    },
    chunkSizeWarningLimit: 1000,
  },
  define: {
    'import.meta.env.VITE_STATIC_EXPORT': JSON.stringify('false'),
  },
})
