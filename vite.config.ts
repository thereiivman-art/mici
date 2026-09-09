import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import { VitePWA } from "vite-plugin-pwa";

// https://vite.dev/config/
// Servi depuis https://<user>.github.io/mici/ (GitHub Pages, projet non racine).
const base = process.env.GITHUB_PAGES ? "/mici/" : "/";

export default defineConfig({
  base,
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["favicon.svg", "apple-touch-icon.png"],
      manifest: {
        name: "Carnet MICI",
        short_name: "Carnet MICI",
        description:
          "Carnet de bord personnel pour les patients atteints de MICI (Crohn, RCH) : suivi des prises de médicaments, rappels et documents médicaux, chiffrés localement.",
        theme_color: "#2f7d6e",
        background_color: "#f4f7f6",
        display: "standalone",
        orientation: "portrait",
        start_url: base,
        scope: base,
        lang: "fr",
        icons: [
          { src: "pwa-192.png", sizes: "192x192", type: "image/png" },
          { src: "pwa-512.png", sizes: "512x512", type: "image/png" },
          { src: "pwa-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
        ],
      },
      workbox: {
        globPatterns: ["**/*.{js,css,html,svg,png,ico}"],
      },
    }),
  ],
});
