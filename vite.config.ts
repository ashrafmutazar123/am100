import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  base: "/am100/",
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: 'auto',
      base: '/am100/',
      scope: '/am100/',
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
            src: '/am100/organic.gif',
            sizes: '192x192',
            type: 'image/gif',
            purpose: 'any'
          },
          {
            src: '/am100/organic.gif',
            sizes: '512x512',
            type: 'image/gif',
            purpose: 'any'
          },
          {
            src: '/am100/organic.gif',
            sizes: '512x512',
            type: 'image/gif',
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
            icons: [{ src: '/am100/organic.gif', sizes: '192x192', type: 'image/gif' }]
          }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,gif,woff,woff2}'],
        maximumFileSizeToCacheInBytes: 3 * 1024 * 1024, // 3 MB limit
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-cache',
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60 * 24 * 365
              }
            }
          }
        ],
        navigateFallback: '/am100/index.html',
        navigateFallbackDenylist: [/^\/api/],
        // Enable notification handling
        skipWaiting: true,
        clientsClaim: true
      },
      devOptions: {
        enabled: false
      }
    })
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});