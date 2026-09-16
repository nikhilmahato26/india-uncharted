# BLUEPRINT — Local Business Enquiry-to-WhatsApp Sites

**What this file is.** Ganga Vedha, generalised. Every decision in this document was made once,
tested against a real build, and is now a *default* — not something to re-derive per project.
Copy this file into a new empty repo, fill in **§2 The Brief**, and hand the whole thing to Claude
with the one-line prompt in §1.

**What kind of app this builds.** A mobile-first public site for a small/medium service business
in India, where the money conversation happens on WhatsApp, not a checkout — plus an admin panel
the non-technical owner runs entirely by themselves. Fits: adventure operators, travel agencies,
tour packages, resorts and homestays, car/bike rental, event and wedding venues, banquet halls,
photography studios, salons and spas, gyms, catering, clinics, coaching centres, real-estate
listings, equipment hire.

**What it does not build.** Payment gateways, real-time seat/room inventory, multi-tenant SaaS,
multi-user role systems, marketplaces with two-sided accounts. The schema leaves room for all of
them; the build does not include them.

---

## 1. THE MASTER PROMPT

Paste this into a fresh Claude Code session in an empty repo, with `BLUEPRINT.md` present.

````
Read BLUEPRINT.md end to end before writing any code. It is the architecture contract
for this build — the stack, data model, layer boundaries, design rules and phase plan
are already decided there. Do not re-litigate them, do not substitute a different stack,
and do not invent a new file layout.

My brief is in section 2 of that file (or pasted below). Your job:

1. Confirm the brief back to me as a filled §2, and flag anything I left ambiguous.
2. Write PRODUCT.md, IMPLEMENTATION_PLAN.md and DESIGN.md for THIS business, following
   the templates in §12. Map my business onto the universal model in §4 and show me the
   entity mapping table before you build.
3. Build phase by phase per §10, stopping at each credential boundary.
4. Hold every gate in §11 before you tell me a phase is done.
5. Finish with HANDOVER.md written for the owner, not for a developer.

Rules that override your defaults:
- Never fabricate ratings, review counts, certifications, customer numbers, press
  mentions or prices. Placeholder them visibly and make them owner-editable.
- If a piece of content would need a code deploy to change, that is a bug. Move it
  into the admin panel.
- Every trap in §5 is a decision already made. Violating one is a defect, not a choice.
````

---

## 2. THE BRIEF (fill this in per project)

The build cannot start without the first six. The rest can arrive during Phase 2+.

| # | Field | Example (Ganga Vedha) | Yours |
|---|---|---|---|
| 1 | Business name | Ganga Vedha | |
| 2 | One line: what they sell | Rishikesh rafting, bungee, hotels | |
| 3 | City / region served | Rishikesh, Uttarakhand | |
| 4 | **Service lines** (2–5 top-level cards) | hotels · rafting · bungee | |
| 5 | **The unit of choice** — the one attribute customers argue about | distance in km | |
| 6 | Conversion channel | WhatsApp, then phone | |
| 7 | Currency + price shape | INR, per-person, seasonal | |
| 8 | **Availability reality** — what closes, when, why | monsoon shuts rafting mid-Jun→mid-Sep | |
| 9 | Reference sites (structure only, never clone) | dronecraft.co.in, honeytripadventures.in | |
| 10 | Craft bar (the standard to be measured against) | Klook, GetYourGuide, Viator | |
| 11 | Visual direction | category canon, executed at full craft | |
| 12 | Real assets on hand | none — no logo, no photos, no reviews | |
| 13 | Who edits the site | owner, non-technical, on a phone | |
| 14 | Out of scope | payments, multi-user, multilingual | |

### The five questions that shape the schema

1. **What is the sellable unit?** A stretch? A room-night? A car-day? A package? Name it. That
   noun becomes a catalog table (§4.2).
2. **Does one thing contain another?** Hotel → rooms. Package → itinerary days. Venue → halls.
   Containment means a child table with `CASCADE`.
3. **Is anything grouped by place?** If yes you need `destinations` and every catalog row gets a
   `destination_id`. Travel, tours and multi-city rentals always do. A single-location salon does not.
4. **Is anything grouped by brand/operator/vendor?** If yes, an `operator` column plus a grouped
   listing view (Ganga Vedha does this for bungee).
5. **What is quote-only?** Anything the owner refuses to publish a price for gets a `quote_only`
   boolean and a nullable price. Rental cars, corporate packages and wedding venues always do.

---

## 3. FIXED STACK — do not substitute

| Layer | Choice | Why it is not negotiable |
|---|---|---|
| Framework | **Next.js App Router + TypeScript** | Server Components mean the catalog renders without shipping the data layer to the browser. Server Actions mean admin CRUD needs no API routes. |
| Styling | **Tailwind CSS v4**, tokens in `@theme` | One `globals.css` holds the whole design system. No config file drift. |
| Database | **Neon serverless Postgres**, `@neondatabase/serverless`, **pooled** connection string | Free tier, HTTP driver, no connection pool to manage. Must be the `-pooler` host. |
| ORM | **Drizzle** + `drizzle-kit` migrations | Real SQL migrations checked into `drizzle/`. Schema is TypeScript, so types flow to every layer. |
| Images | **Cloudinary**, **server-signed uploads only** | Client-side resize before upload; no public upload preset ever. |
| Validation | **Zod v4** | One schema per entity in `src/lib/schemas/`, shared by the admin form and the server action. |
| Auth | **jose** JWT in an httpOnly cookie + **bcryptjs** cost 12 | Single owner account. No session table to garbage-collect. |
| Email | **nodemailer** over Gmail SMTP + App Password | Zero-cost owner alerts. Optional — the site works without it. |
| Icons | **lucide-react**, one stroke weight | Never emoji as icons. |
| Tests | `node --test` with `--experimental-strip-types` | No test framework dependency. Pure-logic units only. |

Runtime deps, complete: `@neondatabase/serverless drizzle-orm zod jose bcryptjs cloudinary
nodemailer lucide-react clsx tailwind-merge server-only next react react-dom`.

If the client hands you different infrastructure (Supabase, S3, Resend), swap the *adapter file*
(`src/db/index.ts`, `src/lib/cloudinary.ts`, `src/lib/email.ts`) and nothing else. The rest of the
architecture does not know or care.

---

## 4. THE UNIVERSAL DATA MODEL

Every build in this family is **a fixed spine plus 1–4 catalog tables**. The spine never changes.
The catalog tables are the only place the business shows up in the schema.

### 4.1 The spine — identical in every project

| Table | Purpose | Notes |
|---|---|---|
| `admin_users` | owner login | email UNIQUE (functional lower() index), `password_hash`, `last_login_at`, `updated_at` doubles as the **session revocation watermark** |
| `site_settings` | singleton row | brand, tagline, whatsapp, phone, email, address, map_url, socials JSONB, hero heading/sub/media, announcement + active flag, logo_media_id |
| `media` | every image ever uploaded | `cloudinary_public_id` UNIQUE, secure_url, width/height/format/bytes, `placeholder` (blur-up), alt_text, folder. **No table anywhere stores a raw image URL — only `media_id`.** |
| `media_links` | polymorphic galleries | media_id, entity_type, entity_id, sort_order, UNIQUE(entity_type, entity_id, media_id). One table gives every entity an ordered gallery. |
| `gallery_items` | the site-wide gallery page | media_id, caption, album, sort_order, is_published |
| `content_blocks` | homepage sections without new tables | `key` UNIQUE, title, subtitle, body, `items` JSONB, is_active, sort_order. Powers "Why choose us", "Our promise", trust rows. |
| `enquiries` | **the product** | see §4.4 |
| `closures` | the availability switch | see §4.5 |
| `reviews` | testimonials | author, rating, body, avatar_media_id, is_published, sort_order |
| `promotions` | offer strip | label, body, media_id, is_active, sort_order |
| `audit_log` | who changed what | admin_user_id, action, entity_type, entity_id, `diff` JSONB |

### 4.2 The catalog pattern

Every sellable thing — whatever the vertical calls it — gets these columns. Copy them verbatim:

```
id serial PK
slug            text UNIQUE      -- auto from name, collision-suffixed, editable
name            text
summary         text             -- one line, card
description     text             -- detail page
price_*_inr     integer          -- nullable IF quote_only exists
compare_at_price_inr integer     -- strike-through
quote_only      boolean          -- when the owner won't publish a number
rating          numeric(2,1)     -- placeholder until real
review_count    integer
badge           text             -- "Most Popular"
inclusions      jsonb []
exclusions      jsonb []
terms           jsonb []
faqs            jsonb [{q,a}]
cover_media_id  integer FK media ON DELETE SET NULL
sort_order      integer NOT NULL -- explicit. Never rely on id or insert order.
is_published    boolean DEFAULT false
seo_title       text
seo_description text
created_at / updated_at  timestamptz
```

Then add **three to eight vertical columns** — no more. If you need more than eight, you have two
entities, not one.

**One table, one `kind` enum discriminator, serves related products.** Ganga Vedha's `adventures`
table covers rafting *and* bungee *and* paragliding *and* zip-lining via `kind`. One admin form,
one detail template, one set of actions. Split into a separate table only when more than half the
columns differ (that is why `hotels` is separate from `adventures`, and `rentals` from both).

### 4.3 Vertical mappings

| Vertical | Catalog tables | Discriminator | Child tables | Unit of choice | Quote-only? |
|---|---|---|---|---|---|
| **Adventure operator** (Ganga Vedha) | `adventures`, `hotels`, `packages`, `rentals` | `adventure_kind` | `hotel_rooms` | distance km | rentals |
| **Travel agency / tour operator** | `packages`, `destinations` | `package_kind` (domestic/international/pilgrimage) | `itinerary` (JSONB is enough) | nights + destination | group & custom tours |
| **Resort / hotel group** | `properties`, `room_types`, `experiences` | — | `room_types` CASCADE | room type + occupancy | banquets, events |
| **Car & bike rental** | `vehicles` | `vehicle_kind` (car/bike/tempo) | — | per-day rate + seats | self-drive vs. with-driver |
| **Wedding / event venue** | `venues`, `packages` | `venue_kind` (lawn/hall/resort) | `halls` CASCADE | seated capacity | always |
| **Photography studio** | `services`, `portfolios` | `shoot_kind` | — | shoot duration | weddings |
| **Salon / spa** | `treatments` | `treatment_kind` | — | duration | packages |
| **Gym / fitness** | `plans`, `trainers` | `plan_kind` | — | months | personal training |
| **Coaching institute** | `courses`, `batches` | `course_kind` | `batches` CASCADE | duration + batch time | no |
| **Real estate** | `listings` | `listing_kind` (rent/sale) | — | BHK + carpet area | always |
| **Catering** | `menus`, `packages` | `cuisine_kind` | `menu_items` CASCADE | per-plate | always |
| **Equipment hire** | `equipment` | `equipment_kind` | — | per-day rate | bulk orders |

`destinations` is a spine table **only for verticals that span places**. When present it carries
intro, highlights JSONB, best time, how to reach, faqs, cover — and its page auto-assembles from
every catalog row pointing at it.

### 4.4 `enquiries` — the only table that matters commercially

```
ref_code                 text     -- short human code, e.g. GV-7Q4KD2
kind                     enum     -- which service line
<entity>_id              integer FK ON DELETE SET NULL   -- one nullable FK per catalog table
product_name_snapshot    text     -- frozen at submit
product_price_snapshot_inr integer-- frozen at submit
name / phone / email
travel_date              date     -- bare DATE, not timestamptz
group_size               integer
message                  text
source                   enum     -- hero | card | detail | floating | contact
status                   enum     -- new | contacted | confirmed | completed | lost
admin_note               text
utm                      jsonb
ip_hash / user_agent
contacted_at / created_at / updated_at
```

The snapshot columns are why raising a price does not rewrite history, and why hard-deleting a
product does not destroy the enquiry. Both are non-negotiable.

### 4.5 `closures` — availability as a first-class feature

```
scope        enum  -- global | service | entity
service_key  enum  -- which service line
entity_type / entity_id
is_active    boolean
icon         enum  -- rain | wrench | calendar | alert
title / body / footnote / cta_label
starts_at / ends_at
version      integer   -- bumping the message brings the modal back
```

Resolution is **most-specific-wins: `global > service > entity`**, computed in exactly one place
(`src/lib/closure.ts`). There is deliberately **no `is_bookable` column** on any catalog table —
two places to say "closed" means one place to forget, and the forgotten one takes an enquiry for
something that cannot happen.

Every vertical has a closure story. Find it in the brief: monsoon (rafting), off-season (hill
resorts), fully booked (venues), maintenance (equipment), holidays (clinics), exam season
(coaching). If the client says "we never close," build it anyway and leave it off — it costs one
table and saves an angry phone call.

---

## 5. THE ANTI-BUG CONTRACT

These are decided. Violating one is a defect.

| # | Trap | Decision |
|---|---|---|
| 1 | Closing one service kills enquiries for all | Closure is **scoped**. `global > service > entity`. |
| 2 | Price rises; old enquiries silently reprice | Enquiries store name + price **snapshots** at submit. |
| 3 | Deleting a product with 40 enquiries → FK explosion | `entity_id` is `ON DELETE SET NULL`; snapshots keep the row readable. Default to **unpublish**, not delete. |
| 4 | Two listings with the same name collide on slug | `slug` UNIQUE, auto-generated, collision-suffixed (`-2`), editable. Changing a live slug warns about broken links. |
| 5 | Public Cloudinary upload preset gets scraped | Uploads are **signed server-side**, after the admin is authenticated. No public preset, ever. |
| 6 | Deleted listing leaves orphan images burning quota | `media` is a real table; an admin "unused media" screen deletes from Cloudinary **and** the DB together, never one without the other. |
| 7 | Serverless + Postgres = connection exhaustion | **Pooled** Neon string only. Warn loudly in production if the host lacks `-pooler`. |
| 8 | Pages either hit the DB every request, or cache forever and ignore admin edits | `unstable_cache` with **tags**, plus a time-based backstop (30s for closures → 300s for low-churn). Every admin mutation calls `revalidateTag` + `revalidatePath`. |
| 9 | Ordered lists reshuffle between deploys | Explicit `sort_order` on every ordered collection. Never `id`, never insert order. |
| 10 | Dates land on the wrong day for Indian users | All timestamps `timestamptz`; user-chosen dates are bare `DATE`; "today" comparisons pin to `Asia/Kolkata`. |
| 11 | Owner edits a closure message after visitors dismissed it | Closure `version`; dismissal stored in `sessionStorage` keyed `closureId:version`. |
| 12 | Enquiry form fills with spam within a week | Honeypot field **silently accepted** (a bot never learns it was caught) + per-IP rate limit. |
| 13 | WhatsApp deep link breaks on `+91` / `0` / spaced numbers | Phone normalised to a single 10-digit stored value at submit. |
| 14 | Changing the password doesn't log other devices out | `admin_users.updated_at` is the **revocation watermark**; `getVerifiedSession()` rejects any token issued before it. Floor both to whole seconds — JWT `iat` has no milliseconds. |
| 15 | A login form reveals which emails exist | Identical error for "no account" and "wrong password", and hash anyway on miss so timing can't separate them. |
| 16 | The site is unbrowsable before credentials arrive | `content.ts` falls back to a static seed when `DATABASE_URL` is absent. Credentials validate **lazily**, per accessor. |
| 17 | Two states share a colour and become confusable | Availability and severity are separated **structurally** (filled vs. soft-tinted), not by hue. Colour is never the only signal. |
| 18 | Owner accidentally publishes something | **A switch takes effect immediately; a checkbox waits for Save.** Never mix them up. |

---

## 6. REPO LAYOUT

```
src/
  app/
    (site)/                    public routes — layout, page, error, not-found
      <service>/page.tsx       listing
      <service>/[slug]/page.tsx  detail
    admin/
      login/                   page + login-form
      (dashboard)/             layout + one folder per entity:
        <entity>/page.tsx            list
        <entity>/new/page.tsx        create
        <entity>/[id]/edit/page.tsx  edit
        bookings/ closures/ media/ activity/ settings/
    actions/                   one file per entity — "use server"
    globals.css                the entire design system, in @theme
    layout.tsx  robots.ts  sitemap.ts  styleguide/
  components/
    ui/                        primitives only, zero business knowledge
    site/                      public composites
    admin/                     admin composites (forms, lists, editors)
  db/
    schema.ts                  every table + enum + relation
    index.ts                   getDb() — the only place Neon is constructed
    seed/                      data.ts, index.ts, wipe.ts
  lib/
    content.ts                 THE read layer — every public page imports from here
    content.seed.ts            static fallback + the exported domain types
    schemas/<entity>.ts        one Zod schema per entity
    auth.ts closure.ts audit.ts cloudinary.ts email.ts env.ts format.ts utils.ts
  middleware.ts                edge gate on /admin/*
drizzle/                       generated SQL migrations, committed
tests/                         pure-logic unit tests
PRODUCT.md IMPLEMENTATION_PLAN.md DESIGN.md HANDOVER.md .env.example
```

---

## 7. LAYER CONTRACTS

### 7.1 The read layer — `src/lib/content.ts`

`import "server-only"` at the top. Every public page imports **only** from here; no page touches
Drizzle directly. Every export follows the same shape:

- wrapped in `unstable_cache` with a **tag** (`hotels`, `hotel:${slug}`) and a `revalidate` backstop
- returns the domain type from `content.seed.ts`, never a raw Drizzle row
- falls back to the static seed when `hasDatabase()` is false
- resolves `media_id` → a `MediaSource` object with `placeholder`, so callers never join media

Tags are exported as `contentTags` so the write layer imports the same constants. Two hand-typed
tag strings that drift is the classic "admin edit doesn't show up" bug.

### 7.2 The write layer — `src/app/actions/<entity>.ts`

`"use server"` at the top. Every entity file exports the same eight functions, in this order:

```
requireAdmin()                     -- getVerifiedSession() or redirect("/admin/login")
revalidate<Entity>Paths(slug, prev?) -- tag + path, including the OLD slug on rename
toShape(data)                      -- Zod output → DB columns, one place
create<Entity>(input)              -- parse → dup-slug check → max(sort_order)+1 → insert → revalidate → audit
update<Entity>(id, input)          -- parse → exists → dup-slug excluding self → update → revalidate → audit
delete<Entity>(id)                 -- read slug/name first → delete → revalidate → audit
set<Entity>Published(id, bool)     -- returning() the slug → revalidate → audit
move<Entity>(id, "up" | "down")    -- swap sort_order with the adjacent row → revalidate
```

Return `{ ok: true, id }` or `{ ok: false, error, fieldErrors }`. Field errors are keyed by the
first path segment so the form highlights the right input. Every mutation logs to `audit_log`.

### 7.3 Validation — `src/lib/schemas/<entity>.ts`

One Zod schema, imported by both the client form and the server action. `z.coerce` on numbers and
booleans (HTML forms only send strings). Slug regex `^[a-z0-9]+(-[a-z0-9]+)*$`. Cross-field rules
are `.refine()` with an explicit `path` — e.g. *"Set a per-day price, or mark it quote-only."*

### 7.4 UI primitives — `src/components/ui/`

Zero business knowledge. If a primitive imports from `@/lib/content`, it is in the wrong folder.
The inventory to build, once: `Button` `LinkButton` `Chip` `Card` `CardBody` `SectionHeading`
`StatRow` `Field` `Input` `Textarea` `Select` `Checkbox` `Radio` `Switch` `Modal` `ToastProvider`
`Rating` `AvailabilityPill` `Skeleton` `EmptyState` `Table` family `MediaFrame` `Alert`
`Breadcrumb` `StickyActionBar` `Tabs` `Accordion`.

`MediaFrame` is the **only** component that renders a photograph: fixed aspect ratios, `next/image`
with `fill` + `sizes`, blur-up from `media.placeholder`, a two-gradient scrim so chips stay legible
over a *bright* frame, and an honest empty state for an unphotographed product.

`EntityList` is the shared admin table — search, publish switch, move up/down, view-on-site, edit,
delete. A new entity supplies only `columns`, the noun, and three action functions.

Overlays are native: `<dialog>` for modals (focus trap, Escape and top layer come free),
`<details>` for accordions (find-on-page can open them), and the toast viewport is
`popover="manual"` so a toast fired from inside a modal is actually visible.

---

## 8. DESIGN RULES

Write `DESIGN.md` **from the built system**, measured in a browser — never as an upfront wish list.

**Colour.** Tokens live in `globals.css` under `@theme`; nothing else defines a colour. Pick the
brand hue from something real in the business (Ganga Vedha's jade is the actual colour of the river
at Rishikesh; the orange is lifted off a life jacket). Every ramp gets 50→950. Then:

- Body and control text ≥ 4.5:1, large text ≥ 3:1. Measure with translucency flattened.
- A vivid tone that fails contrast is a **surface and hover tone only**, never a text or button fill.
- **Two different meanings must never share a visual treatment.** Separate them structurally —
  filled-with-white-text vs. soft-tinted — not by hue alone.
- Colour is never the sole signal. Every state chip carries its word.
- The action colour is singular. Nothing else in the palette competes with it.

**Type.** One variable family. A second face costs a round trip on 4G and buys nothing. Define a
named step scale (`display-xl → display-lg → display-md → title → subtitle → body → small →
caption → micro → label`), fluid via `clamp()`. Bake width-axis and tracking **into the steps**, not
into a utility somebody has to remember. Tabular figures automatic on `th, td, time, data, output`.
Body measure enforced by a `.measure` class (68ch), not hoped for. **`grep -rn "text-\[" src/`
must return nothing.**

**Surfaces.** Radii: 8 chips / 10 inputs & buttons / 14 cards & dialogs / 18 hero media. A surface
carries a shadow **or** a border, never both. Shadows have an offset — a zero-offset coloured halo
is decoration, not depth. Stacking is a named scale (`--z-raised … --z-toast`); no arbitrary
`z-[…]` anywhere. `viewportFit: cover` plus `.pb-safe` / `.pt-safe` on anything pinned to an edge.

**Motion.** 140 / 240 / 420ms, exponential easing, no bounce or elastic. Entrances start from an
already-visible default so a failed animation never hides content. `prefers-reduced-motion`
collapses every duration.

**Also themed, because leaving them default is the cheapest tell that a page was assembled rather
than built:** text selection, caret, scrollbar, focus ring, underline offset, inline `<code>`, the
native date-picker indicator.

**Refused by default:** eyebrow/kicker above a heading, gradient text, glassmorphism, hard offset
shadows, nested cards, emoji as icons, monospace as a costume for "technical", section numbers,
sketch-style SVG filters.

**Accessibility floor:** public tap targets ≥ 44px (the 36px size is for dense admin tables only);
body text ≥ 16px; no reliance on hover for any primary action; no horizontal page overflow at any
width — wide tables scroll inside their own focusable region.

**Loading is not disabled.** A loading button keeps full opacity and shows a spinner; only a
genuinely disabled one dims.

---

## 9. ADMIN PANEL SPEC

The admin panel is **half the product**, not an afterthought. It is what the client actually
touches every day, and it is why they stop calling you.

**Must ship, always**

1. **Enquiry inbox with a status pipeline** — new → contacted → confirmed → completed → lost, plus
   private notes. Without this the owner tracks leads in their head and loses them.
2. **One-tap WhatsApp reply** per enquiry, prefilled with name, product, date, group size, ref code.
3. **The closure switch on the dashboard**, not buried in settings. Per service, with an
   **Edit message** and a **Preview** that renders the real interstitial. They will use it under
   pressure, twice a year; it must be findable in three seconds.
4. **A dashboard that answers "how are we doing"** — enquiries today / this week / this month,
   which product is selling, new → confirmed conversion. One screen, no configuration.
5. **Email alert on every enquiry**, with tap-to-WhatsApp and tap-to-call. Failure is non-fatal:
   the enquiry is already in the database.
6. **View as visitor** — every edit form links to the public page it affects. Non-technical clients
   do not trust an edit they cannot see.
7. **Publish/unpublish switch** on every listing, more prominent than delete.
8. **Reorder** on every ordered collection. Never expose a raw sort-order number field.
9. **Bulk image upload with client-side resize** to max 2000px. The owner's 8MB camera JPEGs must
   never reach a visitor.
10. **Unused-media cleanup screen** — deletes from Cloudinary and the DB together.
11. **Activity log** — who changed what, when, with the diff already in `audit_log`.
12. **Mobile-first admin.** Sidebar collapses to a drawer, tables become cards, forms are
    single-column. The owner will edit prices from a phone, standing outside.

**Worth it when there's room:** duplicate-this-listing, a single price editor across every product,
blackout dates, undo from the audit diff, per-page SEO fields with a search-result preview, CSV
export of enquiries.

---

## 10. PHASE PLAN

Each phase ends at a credential boundary. Never block Phase 0 on anything.

| Phase | Needs | Delivers |
|---|---|---|
| **0 — Foundation** | nothing | Next.js + Tailwind + tokens + the full `ui/` inventory + `/styleguide` + `DESIGN.md` written from the built system |
| **1 — Data + auth** | Neon URL | `schema.ts`, migrations, `content.ts` with seed fallback, `auth.ts`, middleware, `db:seed` creating the owner account |
| **2 — Admin CRUD + media** | Cloudinary keys | Every entity's list / new / edit, signed uploads, `EntityList`, `media_links` galleries |
| **3 — Landing page** | brand details | Hero, service cards, catalog rows, why-us, reviews, gallery, promo strip, sticky WhatsApp |
| **4 — Detail pages** | photos, prices | Per-entity detail templates, breadcrumbs, related items, SEO metadata, sitemap |
| **5 — Enquiry + closures** | WhatsApp number | Enquiry modal + form, honeypot, rate limit, phone normalisation, snapshots, the closure interstitial |
| **6 — Admin power** | SMTP creds | Dashboard stats, inbox pipeline, WhatsApp reply, activity log, media cleanup, email alerts |
| **7 — Harden + launch** | domain | Contrast audit at 1440 and 390, Lighthouse, `robots.ts`, `sitemap.ts`, error/not-found at both roots, `HANDOVER.md` |

---

## 11. GATES — a phase is not done until every line passes

```
npm run typecheck      # zero errors
npm run lint           # zero warnings
npm run build          # clean production build
npm test               # all pass
grep -rn 'text-\[' src/          # no output
grep -rn 'z-\[' src/             # no output
grep -rn 'http' src/db/schema.ts # no raw image URLs in the schema
```

Plus, by hand:

- Every page renders at **390px and 1440px** with no horizontal overflow.
- Contrast measured on the built page, not on the token table. Zero failures.
- **Unplug the database** (`DATABASE_URL` unset) — the public site still browses on seed data.
- **Every admin edit appears on the public site within one request.** If it needs a rebuild, the
  `revalidateTag` call is missing.
- Submit an enquiry and confirm: row persisted, snapshot frozen, ref code shown, email sent,
  WhatsApp link opens with a correct 10-digit number.
- Flip a closure and confirm it shuts **that service only**.
- Change the password and confirm a second browser is logged out and the first is not.
- Keyboard-only pass through the enquiry modal and the closure interstitial: focus trapped,
  Escape closes, focus returns.
- No fabricated rating, review count, certification or price is visible anywhere.

---

## 12. THE FOUR DOCUMENTS

Every project ships these. They are not optional and they are not README padding.

**`PRODUCT.md`** — platform, stack, **users** (primary and secondary, written as real people with a
job to do, not personas), product purpose, positioning, operating context, capabilities and
constraints, brand commitments, **evidence on hand** (an explicit list of what is real vs. what is
placeholder), product principles, accessibility commitments.

**`IMPLEMENTATION_PLAN.md`** — the anti-bug decisions table (§5, extended with anything specific to
this business), the data model in prose, the phase table, the admin suggestions ranked by *what the
client will feel*, and a final table of exactly what you need from the client and what it blocks.

**`DESIGN.md`** — written **after** Phase 0, measured in a browser. Direction and its rationale,
the colour table with contrast ratios, the rule that matters most for this palette, type scale,
surfaces, media, motion, accessibility floor, component inventory, and an explicit **Refused**
section.

**`HANDOVER.md`** — written for the owner, in plain language, assuming no technical background.
Ganga Vedha's opens with *"Everything you do inside the admin panel is safe and shows up on the
live site within seconds"* and *"never edit the database directly"* — then walks the admin menu
section by section, in the order it appears on screen. If a word in it needs explaining, that is a
documentation bug.

---

## 13. STARTING A NEW PROJECT — the checklist

1. `npx create-next-app@latest --typescript --tailwind --app --src-dir`
2. Copy in `BLUEPRINT.md`. Fill §2. Paste the §1 master prompt.
3. Install the dependency list from §3 verbatim.
4. Write the entity mapping table (§4.3) and get it approved **before** writing `schema.ts`.
5. Rename per project: session cookie name (`gv_session` → `<prefix>_session`), ref-code prefix
   (`GV-`), Cloudinary folder root, brand tokens in `@theme`, `package.json` name, seed data.
6. Copy `.env.example` and change only the example values.
7. Phase 0 first, always. It needs no credentials and it is where the design system is decided.

**Reusable almost verbatim across every project:** `src/components/ui/*`, `src/lib/env.ts`,
`auth.ts`, `audit.ts`, `cloudinary.ts`, `email.ts`, `format.ts`, `closure.ts`, `middleware.ts`,
`components/admin/entity-list.tsx`, `uploader.tsx`, `booking-inbox.tsx`, `media-cleanup.tsx`,
`activity-log.tsx`, and the eight-function shape of every action file.

**Rewritten per project:** `db/schema.ts` catalog tables, `lib/schemas/*`, the admin forms, the
public listing and detail pages, the seed data, and every colour and type token.

---

## 14. THE PRINCIPLES BEHIND ALL OF IT

1. **Availability is the first fact.** If something can't be booked today, the site says so before
   it sells. Never take an enquiry for something that is shut.
2. **The owner ships, not the developer.** Anything that changes seasonally — price, photo,
   listing, closure, review, hero copy — is editable in the admin panel. If a change needs a
   deploy, that is a design bug.
3. **Every path ends in a human.** The site's job is to get a confident customer into a WhatsApp
   conversation, **with their details already captured** so nothing is lost if they never send it.
4. **Phone first, weak signal.** Mobile layout, image weight and admin ergonomics are designed for
   a phone on 4G, not a desktop on fibre.
5. **Never invent evidence.** No fabricated ratings, review counts, certifications, customer
   numbers or prices. Placeholders are visibly placeholder and owner-editable.
6. **One place per answer.** Bookability, tags, media rendering, price formatting, phone
   normalisation — each computed in exactly one file. Two places to say a thing is one place to
   forget it.
