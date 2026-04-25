# Hot Reloading in Development

## The Problem

The original `npm run dev` command (`astro build && wrangler dev`) performed a one-time build and then ran the Cloudflare Pages dev server. This meant:

- **No hot reloading** - Changes to source files required manually restarting the dev server
- **Slow iteration** - Full rebuild + restart cycle for every code change
- **Poor DX** - Developers couldn't see changes instantly

## The Solution

The fix uses a **parallel build-watch approach** with `concurrently` to run two processes:

1. `astro build --watch` - Watches source files and rebuilds on changes
2. `wrangler pages dev ./dist --live-reload` - Serves the built output and auto-refreshes the browser on changes

## Changes Made

### package.json

```json
{
  "scripts": {
    "dev": "concurrently \"astro build --watch\" \"wrangler pages dev ./dist --live-reload\"",
    "dev:build": "astro build && wrangler dev"
  }
}
```

- **`dev`** - New hot-reloading dev command (default)
- **`dev:build`** - Legacy command for one-time build + dev (preserved for compatibility)

## How to Run

```bash
npm run dev
```

This starts:
- Astro watching for file changes at `http://localhost:4321` (internal)
- Wrangler Pages dev server at `http://localhost:8788` (public URL shown in terminal)

Open the Wrangler URL (e.g., `http://localhost:8788`) in your browser.

## Tradeoffs and Considerations

| Aspect | Details |
|--------|---------|
| **Refresh behavior** | Browser does a full page reload (not HMR), but live-reload ensures you see changes quickly |
| **Build speed** | First build is slow; subsequent builds during watch are incremental |
| **Memory usage** | Two processes run concurrently, using more RAM |
| **Cloudflare bindings** | D1, KV, R2 and other bindings work correctly in Wrangler dev mode |
| **Alternative** | Use `npm run dev:build` for the old behavior (single build then manual restart) |

## Architecture Note

With `@astrojs/cloudflare` adapter in SSR mode:
- Astro dev server (`astro dev`) doesn't fully emulate Cloudflare Workers environment
- Wrangler provides accurate Workers runtime emulation but can't watch `.astro` files directly
- The build-watch + wrangler pattern is the recommended approach for local development with Cloudflare bindings
