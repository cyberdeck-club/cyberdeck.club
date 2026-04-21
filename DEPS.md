# Migration Dependency Pin List

## Direct dependencies (exact versions)

better-auth           1.6.5   # >=1.5 required for D1 support; magic link plugin is bundled
@astrojs/cloudflare   13.1.10 # Cloudflare Workers adapter
drizzle-orm           0.45.2  # D1-compatible ORM
drizzle-kit           0.31.10 # migration tooling
resend                6.12.2  # email delivery, Workers-compatible
marked                18.0.2  # Markdown rendering

## Existing pinned versions (from package.json)

astro                 6.1.7