import { defineConfig } from "astro/config";
import mdx from "@astrojs/mdx";
import tailwindcss from "@tailwindcss/vite";
<<<<<<< HEAD
// Only one import is needed for React support (handles react and react-dom)
import react from "@astrojs/react";

const site =
  process.env.SITE_URL || process.env.PUBLIC_SITE_URL || "https://quiet.paulapplegate.com";

export default defineConfig({
  site,
  integrations: [mdx(), react()], // Astro handles the DOM rendering for you
  vite: {
    plugins: [tailwindcss()],
    ssr: {
      noExternal: ['astro-cloudinary', '@radix-ui/*']
    },
    optimizeDeps: {
      exclude: ['astro-cloudinary']
    },
    build: {
      cssMinify: true,
      minify: 'esbuild'
    }
  },
});
=======

const site =
  process.env.SITE_URL || process.env.PUBLIC_SITE_URL || "https://quietpages-eta.vercel.app";

export default defineConfig({
  site,
  integrations: [mdx()],
  vite: {
    plugins: [tailwindcss()],
  },
});
>>>>>>> main
