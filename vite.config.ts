import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { VitePWA } from "vite-plugin-pwa";
export default defineConfig({
  base: "./",
  resolve: { alias: { "@": new URL("./src", import.meta.url).pathname } },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          charts: ["recharts"],
          database: ["dexie", "dexie-react-hooks"],
        },
      },
    },
  },
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: "prompt",
      includeAssets: ["icons/*.png", "content/*.json"],
      manifest: {
        name: "EXAMINT — Personal Exam Preparation",
        short_name: "EXAMINT",
        description: "Know the News. Crack the Exam.",
        start_url: "./",
        scope: "./",
        display: "standalone",
        background_color: "#0b1020",
        theme_color: "#0b1020",
        icons: [
          { src: "icons/icon-192.png", sizes: "192x192", type: "image/png" },
          { src: "icons/icon-512.png", sizes: "512x512", type: "image/png" },
          {
            src: "icons/maskable-512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "maskable",
          },
        ],
      },
      workbox: {
        globPatterns: ["**/*.{js,css,html,png,svg,json,woff2}"],
        maximumFileSizeToCacheInBytes: 4000000,
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/upload\.wikimedia\.org\//,
            handler: "CacheFirst",
            options: {
              cacheName: "licensed-images",
              expiration: { maxEntries: 40, maxAgeSeconds: 2592000 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
      },
    }),
  ],
});
