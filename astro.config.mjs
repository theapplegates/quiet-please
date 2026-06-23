import { defineConfig } from "astro/config";
import mdx from "@astrojs/mdx";
import tailwindcss from "@tailwindcss/vite";
// Only one import is needed for React support (handles react and react-dom)
import react from "@astrojs/react";
import yaml from '@rollup/plugin-yaml';

const site =
  process.env.SITE_URL || process.env.PUBLIC_SITE_URL || "https://quiet.paulapplegate.com";

export default defineConfig({
  site,
  integrations: [mdx(), react()], // Astro handles the DOM rendering for you
  vite: {
    plugins: [tailwindcss(), yaml()],
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