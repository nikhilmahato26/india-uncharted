# Deploying

Written for whoever runs the deploy — you, or the next developer on this project.

## What the preview is

A copy of the finished site on Vercel, reading a Neon Postgres database that holds
the full imported content. It exists so the client can see and comment on the site
before the domain moves. It is not the launch.

Anyone with the link can open it — there is no password on it. `SITE_INDEXABLE=false`
still keeps it out of Google (`robots.txt` disallows everything, every page carries
`noindex`), but that only stops search engines finding it on their own; it does
nothing once the link itself is shared.

## State

| Piece | Where | Note |
|---|---|---|
| App | Vercel | Next 16, Node runtime, `proxy.ts` handles redirects |
| Database | Neon (`ep-shiny-glade-b5lk2lc8`, us-east-2) | Restored from the local dump: 36 destinations, 30 journeys, 12 experiences, 105 images, 129 redirects |
| Images | `public/media/wp`, committed | 17 MB, served as static assets |
| Secrets | `.env.production.local` (git-ignored) and the Vercel project | Never in a commit |

## Environment variables

Set these in Vercel → Project → Settings → Environment Variables, for Production.
The values are in `.env.production.local` on the build machine.

| Variable | Preview value | At launch |
|---|---|---|
| `DATABASE_URL` | the Neon **pooled** URL | a production database |
| `JWT_SECRET` | 48 random bytes, generated for this deploy | rotate — it signs admin sessions |
| `NEXT_PUBLIC_SITE_URL` | the vercel.app URL | `https://indiauncharted.com` |
| `SITE_INDEXABLE` | `false` | `true` — this is the only switch that lets Google in |
| `MEDIA_PROVIDER` | `cloudinary` | `cloudinary` |
| `CLOUDINARY_CLOUD_NAME` / `CLOUDINARY_API_KEY` / `CLOUDINARY_API_SECRET` | the client's account | same |
| `CLOUDINARY_FOLDER` | optional, defaults to `india-uncharted` | same |
| `EMAIL_PROVIDER` | `log` | `smtp`, plus `SMTP_URL`, `EMAIL_FROM`, `EMAIL_TO_ENQUIRIES` |

`SHADOW_DATABASE_URL` is only for `prisma migrate dev` on a developer machine. It is
not needed on the host.

## Deploy

```bash
npx vercel login            # once, interactive
npx vercel link             # once, creates .vercel/
npx vercel deploy --prod    # every time
```

The CLI uploads the working directory and honours `.gitignore`, so `.env*` stays on
your machine and `public/media` ships.

## Moving the database

The schema and content travel together, `_prisma_migrations` included, so the target
database ends up identical to the source and later migrations still apply.

```bash
pg_dump "$LOCAL_URL" --no-owner --no-privileges --no-comments -Fp -f dump.sql
psql "$TARGET_URL" -v ON_ERROR_STOP=1 -f dump.sql
```

## Images

Photographs imported from the old site ship with the code (`public/media/wp`).
Anything uploaded through the CMS goes to Cloudinary under `india-uncharted/`,
through the same processing as before (rotated, capped at 2400px, re-encoded,
blur placeholder), so the two kinds behave identically on the page. Only this
account's image path is allowed through the Next image optimiser
(`images.remotePatterns` in `next.config.ts`).

Local development shares the preview's database, so it must use `cloudinary`
too: an image stored on a laptop's disk would appear on the preview as a
broken picture.

## One thing to know on Vercel

The 60-second redirect cache (`src/lib/redirect-store.ts`) is per instance, so a
redirect edited in the CMS can take up to a minute to appear on every instance.

## At launch

1. Set `SITE_INDEXABLE=true` and `NEXT_PUBLIC_SITE_URL` to the real domain.
2. Point DNS at Vercel, then redeploy so the canonical URLs rebuild.
3. Run `node scripts/check-redirects.mjs https://indiauncharted.com` — all 131 old URLs
   must still resolve in one hop.
4. Submit `https://indiauncharted.com/sitemap.xml` in Search Console and keep the old
   property until the redirects have been crawled.
6. Rotate `JWT_SECRET` and change every admin password created during the preview.
