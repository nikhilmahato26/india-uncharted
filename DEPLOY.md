# Deploying

Written for whoever runs the deploy — you, or the next developer on this project.

## What the preview is

A password-protected copy of the finished site on Vercel, reading a Neon Postgres
database that holds the full imported content. It exists so the client can see and
comment on the site before the domain moves. It is not the launch.

## State

| Piece | Where | Note |
|---|---|---|
| App | Vercel | Next 16, Node runtime, `proxy.ts` handles redirects and the preview gate |
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
| `PREVIEW_PASSWORD` | a 12-character password | **delete it**, or the live site asks for a password |
| `MEDIA_PROVIDER` | `local` | `cloudinary` if the client will upload images (see below) |
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

## Two things that do not work on Vercel

1. **CMS image uploads.** `MEDIA_PROVIDER=local` writes to `public/media/uploads`, and
   Vercel's filesystem is read-only and thrown away between requests. Existing photos
   are fine — they are part of the build. If the client needs to add images, either
   finish the Cloudinary adapter in `src/lib/media/store.ts` or host on a box with a
   disk (Railway, Render, Fly).
2. **The 60-second redirect cache** (`src/lib/redirect-store.ts`) is per instance, so a
   redirect edited in the CMS can take up to a minute to appear on every instance.

## At launch

1. Set `SITE_INDEXABLE=true` and `NEXT_PUBLIC_SITE_URL` to the real domain.
2. Delete `PREVIEW_PASSWORD`.
3. Point DNS at Vercel, then redeploy so the canonical URLs rebuild.
4. Run `node scripts/check-redirects.mjs https://indiauncharted.com` — all 131 old URLs
   must still resolve in one hop.
5. Submit `https://indiauncharted.com/sitemap.xml` in Search Console and keep the old
   property until the redirects have been crawled.
6. Rotate `JWT_SECRET` and change every admin password created during the preview.
