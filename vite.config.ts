import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  base: "/am100/",   // For GitHub Pages deployment
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['organic.gif', 'robots.txt'],
      manifest: {
        name: 'GreenGrow NFT Farm Monitor',
        short_name: 'Farm Monitor',
        description: 'Hydroponic fertilizer monitoring system for GreenGrow NFT Farm',
        theme_color: '#88B04B',
        background_color: '#eef5f9',
        display: 'standalone',
        orientation: 'portrait',
        scope: '/am100/',
        start_url: '/am100/',
        icons: [
          {
            src: '/am100/organic.gif',
            sizes: '192x192',
            type: 'image/gif',
            purpose: 'any maskable'
          },
          {
            src: '/am100/organic.gif',
            sizes: '512x512',
            type: 'image/gif',
            purpose: 'any maskable'
          }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,gif}'],
        maximumFileSizeToCacheInBytes: 3 * 1024 * 1024, // 3 MB limit
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-cache',
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60 * 24 * 365 // 1 year
              },
              cacheableResponse: {
                statuses: [0, 200]
              }
            }
          },
          {
            urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'gstatic-fonts-cache',
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60 * 24 * 365 // 1 year
              },
              cacheableResponse: {
                statuses: [0, 200]
              }
            }
          }
        ]
      },
      devOptions: {
        enabled: true
      }
    })
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});