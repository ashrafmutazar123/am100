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
      injectRegister: 'auto',
      includeAssets: ['organic.gif', 'robots.txt', 'vite.svg'],
      manifest: {
        name: 'GreenGrow NFT Farm Monitor',
        short_name: 'Farm Monitor',
        description: 'Hydroponic fertilizer monitoring system for GreenGrow NFT Farm',
        theme_color: '#88B04B',
        background_color: '#F5F0E1',
        display: 'standalone',
        orientation: 'portrait',
        scope: '/am100/',
        start_url: '/am100/',
        id: '/am100/',
        icons: [
          {
            src: '/am100/pwa-64x64.png',
            sizes: '64x64',
            type: 'image/png'
          },
          {
            src: '/am100/pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: '/am100/pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png'
          },
          {
            src: '/am100/maskable-icon-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable'
          }
        ],
        categories: ['agriculture', 'monitoring', 'iot'],
        shortcuts: [
          {
            name: 'Dashboard',
            short_name: 'Dashboard',
            description: 'View farm dashboard',
            url: '/am100/',
            icons: [
              {
                src: '/am100/pwa-192x192.png',
                sizes: '192x192'
              }
            ]
          }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,gif,woff,woff2}'],
        maximumFileSizeToCacheInBytes: 3 * 1024 * 1024, // 3 MB limit
        navigateFallback: '/am100/index.html',
        navigateFallbackDenylist: [/^\/api/, /^\/auth/],
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
          },
          {
            urlPattern: /^https:\/\/.*\.supabase\.co\/.*/i,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'api-cache',
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: 60 * 5 // 5 minutes
              },
              cacheableResponse: {
                statuses: [0, 200]
              }
            }
          }
        ]
      },
      devOptions: {
        enabled: true,
        navigateFallback: 'index.html'
      }
    })
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});