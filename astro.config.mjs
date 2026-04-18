import node from "@astrojs/node";
import react from "@astrojs/react";
import { defineConfig, fontProviders } from "astro/config";
import tailwindcss from "@tailwindcss/vite";
import emdash, { local } from "emdash/astro";
import { sqlite } from "emdash/db";
import { forumPlugin } from "emdash-plugin-forum";
import { wikiPlugin } from "emdash-plugin-wiki";
import { resendPlugin } from "./src/plugins/emdash-resend/index.ts";

export default defineConfig({
  output: "server",
  adapter: node({
    mode: "standalone",
  }),
  image: {
    layout: "constrained",
    responsiveStyles: true,
  },
  integrations: [
    react(),
    emdash({
      database: sqlite({ url: "file:./data.db" }),
      storage: local({
        directory: "./uploads",
        baseUrl: "/_emdash/api/media/file",
      }),
      plugins: [forumPlugin(), wikiPlugin(), resendPlugin()],
    }),
  ],
  vite: {
    plugins: [tailwindcss()],
  },
  fonts: [
    {
      provider: fontProviders.google(),
      name: "Inter",
      cssVariable: "--font-sans",
      weights: [400, 500, 600, 700],
      fallbacks: ["sans-serif"],
    },
    {
      provider: fontProviders.google(),
      name: "JetBrains Mono",
      cssVariable: "--font-mono",
      weights: [400, 500],
      fallbacks: ["monospace"],
    },
  ],
  devToolbar: { enabled: false },
});
