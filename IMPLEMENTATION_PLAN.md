# India Uncharted: Implementation Plan

This plan rebuilds indiauncharted.com, currently WordPress 7 with Yoast, as a Next.js, PostgreSQL and Prisma platform. It covers the public site, a CMS, an SEO manager and a lead pipeline.

**Sources, in order of authority:**
1. The master prompt
2. `India_Uncharted_Premium_React_Developer_Brief.docx` (the "brief")
3. `BLUEPRINT.md` (patterns only)
4. The live-site crawl of 2026-09-15 (`docs/migration/`)

Product facts live in `PRODUCT.md`. `DESIGN.md` gets written after Phase 0, measured from the built system.

---

## 0. Decisions already made

| # | Conflict | Decision | Why |
|---|---|---|---|
| D1 | Old HTML, screenshots, logo and Swan Tours HTML were never supplied | Crawl the live site instead (all 131 sitemap URLs captured) | The live site holds the same content, plus metadata the HTML export would lack |
| D2 | Prisma (master) vs Drizzle + Neon (BLUEPRINT) | **PostgreSQL + Prisma** | The master prompt is authoritative. Any managed Postgres works; if hosting is serverless, use a pooled connection string |
| D3 | Three roles (master) vs a single owner (BLUEPRINT) | **SUPER_ADMIN / ADMIN / EDITOR** | Required by the master prompt |
| D4 | URL vocabulary | **Brief's terms:** `/destinations`, `/regions`, `/journeys`, `/bike-tours`, `/experiences`, `/travel-guide`, plus `/services` and `/plan-my-journey` | Fits the "private journeys" positioning |
| D5 | Blogs and travel guides as separate sections (master) vs one `/travel-guide` (brief) | One `Article` model with `kind: BLOG \| GUIDE`, both under `/travel-guide/[slug]`, filterable | One URL space and one template, while still allowing long-form guide layouts |
| D6 | Services (master) vs no services (brief) | A `Service` model at `/services/[slug]`. It launches with **Transfers** (from `/transfers/`) | Transfers is a real client service line |
| D7 | Activity URLs | **Flat `/experiences/[slug]`.** Theme hubs live at `/experiences/themes/[theme]` | A flat URL survives changes to an experience's theme. Nested URLs would churn |
| D8 | "One variable font" (BLUEPRINT) vs serif + sans pairing (brief) | The brief wins: editorial serif display face + sans body | The brand brief pins the pairing |
| D9 | "No eyebrow text" (BLUEPRINT) vs a "PRIVATE JOURNEYS • INDIA" hero overlay (brief) | The brief wins for the homepage hero only. No other eyebrows | The brief pins the hero overlay |
| D10 | BLUEPRINT's "site browses without a database" fallback | Dropped. Local development runs against a seeded Postgres in Docker | 130+ relational records make a static mirror a second source of truth |
| D11 | BLUEPRINT's closures | Kept as **SeasonalNotice**: optional, scoped, nothing seeded | Real in travel (monsoon, Himalayan passes, park closures). Facts must come from the client |

---

## Build status — 16 September 2026

Phases 0–7 are built and running against a local Postgres. `npm run build` produces 159 static pages; typecheck, 32 unit tests and the redirect gate all pass. A fresh-eyes design review ran on 16 September and its findings are fixed — see *Review pass* below.

| Phase | State | Notes |
|---|---|---|
| 0 — Foundation & direction | **Done** | Direction chosen (The Miniature Folio), tokens, type scale, UI primitives, motion grammar. `DESIGN.md` written from the built system |
| 1 — Data & auth | **Done** | 40-model Prisma schema, migrations, JWT sessions with a revocation watermark, three roles enforced server-side, audit log, Postgres rate limiting |
| 2 — Migration import | **Done** | 113 images, 36 destinations, 30 journeys, 12 experiences, 10 articles, 5 vehicles, 129 redirects. `docs/migration/import-report.md` lists everything a human must check |
| 3 — Public templates | **Done** | Destination, region, journey, bike tour, experience, article, service, theme and style hubs, about, contact, plan, search, 404, 410, sitemap, robots, JSON-LD |
| 4 — Homepage | **Done** | 16 CMS-driven sections with content gates; hero, parallax plates, region carousel, coordinate map |
| 5 — CMS | **Done** | 9 entity types through one registry: list, editor, publish, reorder, duplicate, delete, preview (Draft Mode), media library, settings, users, activity |
| 6 — SEO manager | **Done** | Global defaults, title patterns, per-entity SEO tab with Google preview and checks, keyword map with cannibalisation warnings, health report, redirect manager with a 404 log |
| 7 — Lead generation | **Done** | Contextual enquiry dialog, Plan My Journey, honeypot + timing + rate limit, email adapter, inbox with pipeline, notes and assignment |
| 8 — Content pass | **In progress** | Everything that doesn't need the client is done — see *Phase 8* below. Waiting on the client for destination facts, region and category intros, verified reviews, image licences and legal text |
| 9 — QA & launch | **Partly** | Gates green locally; still to do: Lighthouse, full axe pass, staging deploy, DNS cutover, Search Console |

**Verified so far**

- All 131 old URLs resolve in one hop to a live page (`node scripts/check-redirects.mjs`)
- No horizontal overflow at 320 / 390 / 414 / 768 / 1024 / 1440px
- No console errors on home, destination, journey or plan pages in production
- Admin sign-in, list, editor, SEO tab and save all work end to end
- The design detector reports zero findings

**Review pass — 16 September 2026**

An independent review of the built site returned "ship with fixes" and 16 defects. Fixed, in the order they mattered:

| Defect | Fix |
|---|---|
| Destination and journey pages printed their opening paragraph twice | The hero cartouche drops its lead when the page has body copy of its own |
| "Rajasthan · Rajasthan", "Private journey · … · Private / On Demand" | `dedupeMeta()` — a meta line claims each idea once (unit-tested) |
| Header illegible over a bright hero (measured 1.03:1) | The header carries its own scrim while transparent; the hero's top stop raised. Measured 9.9:1 on the live hero |
| Intros clipped mid-word ("…heritage monum") | `summarize()` cuts on a sentence, or on a word with an ellipsis. 35 imported intros repaired by `scripts/fix-intros.mts` |
| Duration stated twice on journey cards | `displayName()` also strips a leading "2 Nights 3 Days" |
| "beyond the obvious" three times on the homepage | The brand line keeps the hero; the offbeat section is "Off the usual route", the map legend "Quieter stop" |
| Empty third cell in the destination fact band | `FactRow` takes its column count from the facts it has |
| "Discover India" stopped 115px short of the right margin | Lead plate 6 columns, followers 3 — twelve, not eleven |
| Kashmir published with 0 journeys | A destination counts journeys through its children, by journey id so a two-stop route counts once |
| Orphan grid rows (5-in-4, 6-in-4, 1-in-3) | `wholeRows()` on homepage, destination and journey grids; a single article no longer opens a section |
| Card rows not aligned | A two-line well (`lines-2`) for card titles |
| Imageless tiles printed the name twice | An empty plate inside a card shows the sun mark alone |
| The bike section abandoned the folio | Its plate sits in a forest band like every other |
| Body copy at 88–97ch with a blank right column | `measure` on overview, itinerary and destination copy; the plan strip is sticky |
| Two themes sharing one photograph | A borrowed hero is claimed, so it stands for one idea per row |
| Mobile carousel clipped text mid-word | 85% cards, so the peek is picture, not half a sentence |
| CMS: "Hello, India", `SITE_INDEXABLE` in owner copy, counter counting the fallback, tickless checkboxes, duplicated status badge, unlabelled icons, raw `bike_tour`, "1 images", "India Uncharted login user", SEO nav below the fold | All fixed; the activity log now reads in sentences (`src/lib/admin/audit-text.ts`) |

Not acted on, with reasons: the four homepage headlines the reviewer read as AI-written are the client's own brief copy, pinned; the sidebar-height and dev-badge findings were artefacts of full-page screenshots of a dev build; the "images without alt text" figure does link to a filtered media library. Nine photographs stand for two pages each — that is the client's content, now item 7 of the handover checklist.

**Phase 8 — 17 September 2026**

Content decisions live in `docs/content/*.json` (reviewable in git); scripts in `scripts/content/` apply them. Every script dry-runs by default, only fills empty fields, and is safe to run again. The Neon database was backed up to `backups/` first.

| Work | Result |
|---|---|
| Search descriptions | 96 written from each record's own copy and real links; no prices, "best", certifications or claims. 0 pages now lack one (was 100 records / 17 pages on the gate) |
| Focus keywords | 115 assigned, none shared, checked against every keyword already in the database |
| Alt text | 109 written by looking at each photograph; a place is named only where the picture shows it. 0 images left without |
| Import bug: wrong heroes | `uploadKey()` dropped the file extension, so `1-1.webp` (journey photo) and `1-1.png` (car) merged — five pages showed cars. Four more fell back to a shared AI collage. Fixed in the importer (tested), and `repair-heroes.mts` restored the 10 original photos from the live site, guarded to change only heroes still holding the wrong image |
| Imported text | 3 descriptions with literal `&amp;` repaired; 4 best-time texts had lost their line breaks, restored without rewording; a new `seasonSummary()` shows the actual months in the fact strip instead of "Ideal flying seasons:" |
| Empty hubs | 4 categories with nothing in them set to draft (Food & Culture, Photography, Wellness, Wildlife themes); they return when content is tagged |
| Found, left for the client | A copied sentence ("desert activities" on a Kashmir tour); two near-duplicate yoga products and articles; two Kashmir packages with the same displayed name; destination facts the old site never had |

Verified after a fresh build: page gate clean on 119 pages, 131/131 redirects, lint and types clean, 33 unit tests.

**Known gaps**

- Section reordering exists in the data model and the homepage renders from it, but the admin has no drag-and-drop page builder yet — sections are seeded and editable in the database
- Newsletter storage exists; no provider is wired, and the section stays hidden
- Cloudinary adapter is stubbed behind `MEDIA_PROVIDER`; local disk storage is active
- Search is Postgres `ILIKE`, which is exact and fast at this catalogue size; a `tsvector` index is the upgrade when content grows
- No e2e (Playwright) suite in the repo yet; the flows above were verified by script during the build

---

## 1. Audit: what exists today

Full per-URL data: `docs/migration/url-map.csv` (old URL, new URL, status, entity, word count, meta presence, notes) and `docs/migration/crawl-2026-09-15.json`.

### 1.1 Content inventory

| Old content | Count | Quality | Becomes |
|---|---|---|---|
| Multi-day packages (flat root slugs) | 30 | 350–820 words. Structured as Overview (Duration / Destinations Covered / Pickup & Drop / Tour Type / Ideal For), day-by-day H3s, Inclusions, Exclusions, Why Choose, Best Time | `Journey`: 17 JOURNEY, 6 RETREAT, 4 COURSE, 3 BIKE_TOUR |
| Day experiences | 12 | About 500 words: overview, highlights, itinerary steps (emoji headings, which get stripped) | `Experience` |
| `{place}-tour-packages` landing pages | 21 | 350–580 words: "Why Visit X?" plus a package list | Merged into `Destination` intro and why-visit copy |
| `/destination/{term}/` taxonomy archives | 36 | 99–284 words, list only, title "AGRA Archives" | `Destination` records. 8 have no products; 3 need fixing: ranthombore (duplicate), jaispa (probably Jispa), khivhan (probably Khichan) |
| `/activity/{type}/` and root-level format pages | 10 | Thin lists | Filter values on `/experiences` (`format`) |
| Blog posts | 10 | 526–1,956 words. 8 of 10 are about yoga or wellness in Goa | `Article (BLOG)` |
| Testimonials | 2 | No source or date | `Testimonial`, seeded **DRAFT / unverified** |
| About, Contact, Transfers, Home | 4 | Real mission copy, fleet details, contact details | `Page` sections, `Service`, `SiteSettings` |
| Images in wp-content/uploads | about 322 | Licensing unknown | `Media` (Cloudinary), with alt text reviewed |

### 1.2 Facts extracted for SiteSettings

- **Address:** Killi khana, Sodagoran ka Mohalla, Jodhpur, Rajasthan, India 342001
- **Phone:** +91 80059 67178. Stored normalised as `918005967178`. **WhatsApp not confirmed.**
- **Email:** indiaunchartedtravel@gmail.com
- **Social:** facebook.com/IndiaUncharted47 · youtube.com/@indiaunchartedtravel · x.com/india_uncharted (tracking query strings removed)
- **Footer mission:** "At India Uncharted, our mission is to showcase the true essence of India…"
- **Old navigation:** Home · About Us · Destinations · Activity · Transfers · Blogs · Contact Us

### 1.3 Destination → product links (from the archive pages)

These seed the `JourneyStop` and `Experience.destinationId` relations. The strongest hubs:

- **Jaisalmer:** 9 products
- **Delhi, Jaipur:** 8 each
- **Jodhpur:** 7
- **Rishikesh, Udaipur:** 6 each
- **Agra, Goa, Srinagar, Gulmarg:** 4 each

No products yet: Chandigarh, Doodhpathri, Khichan, Sarchu, Sariska, Sonamarg, Tal Chhapar, Yusmarg. They are seeded as DRAFT until the client supplies content. Sariska appears in the Rajasthan Wildlife package's route text, so the importer also links it from there.

### 1.4 SEO baseline (what the migration must fix, not repeat)

- **Meta descriptions:** only 20 of 129 pages have one. Every destination and most packages have none.
- **Destination titles:** "{NAME} Archives - India Uncharted", in capitals.
- **Homepage H1:** "Special Packages". There is also a stray "Agriculture (4)" widget.
- **Duplicates:** ranthambore and ranthombore serve the same list.
- **Thin pages:** 8 empty destination archives, 10 thin activity archives.
- **Structured data:** Yoast outputs WebSite, WebPage, BreadcrumbList and Article only. No TravelAgency or TouristTrip.
- **Stray WordPress author:** `/author/saragamhospitaludaipur/`. **Tell the client to audit WordPress user access now**, regardless of the rebuild.

### 1.5 What the content says about positioning

The brief positions the brand around heritage, luxury and offbeat travel. The client's actual content is weighted differently:

- **Wellness and yoga is the largest cluster:** 10 packages and courses plus 8 of 10 articles, all ranking-oriented and dated 2026.
- **Offbeat inventory already exists** as thin archives: Khichan, Tal Chhapar, Jawai, Jispa, Sarchu, Doodhpathri, Yusmarg.

The IA gives **Wellness & Ayurveda** first-class status: a travel style, a theme hub, and a Travel Guide cluster. "Beyond the Obvious" is built from the client's real offbeat destinations. Shekhawati, Bundi, Chettinad and Turtuk come in only once the client supplies content.

---

## 2. Information architecture

### 2.1 Public routes

```
/                                    Home (17 sections, content-gated — §6.3)
/destinations                        Index: region filter, map, search
/destinations/[slug]                 Destination (city, park, valley, state) — parent/child aware
/regions                             Index
/regions/[slug]                      Region hub (Rajasthan, North India, Himalayas, Ladakh, Goa, Central India…)
/journeys                            Index: filters destination, region, duration band, travel style, kind
/journeys/styles/[style]             Travel-style hub (honeymoon, wellness-ayurveda, wildlife, family…)
/journeys/[slug]                     Journey (JOURNEY | RETREAT | COURSE)
/bike-tours                          Index
/bike-tours/[slug]                   Journey (BIKE_TOUR) — motorcycle template
/experiences                         Index: filters theme, destination, format
/experiences/themes/[theme]          Theme hub (heritage, food, wellness, spiritual-india, wildlife, photography, adventure, village-life)
/experiences/[slug]                  Experience
/travel-guide                        Journal index: kind, category, destination filters
/travel-guide/[slug]                 Article (BLOG | GUIDE)
/services  /services/[slug]          Service (transfers first)
/about  /contact  /plan-my-journey   CMS pages (section builder)
/faqs                                Published FAQs grouped by category
/search                              Site search (server-rendered results)
/privacy-policy  /terms-and-conditions  /cookie-policy   CMS legal pages (client-supplied text)
/sitemap.xml  /robots.txt            Generated
```

**Reserved slugs** (validated so a record can't take them): `styles`, `themes`, `new`, `edit`, `preview`, `search`, `page`.

**Canonical rules:**
- Filter and sort query strings canonicalise to the base index.
- Paginated pages (`?page=2`) canonicalise to themselves.
- A journey's canonical uses its kind's route: bike tours only ever resolve at `/bike-tours/…`, and `/journeys/{bike-slug}` returns a 308 there.

### 2.2 Admin routes

```
/admin/login
/admin                                Dashboard
/admin/{destinations|regions|journeys|experiences|services|articles|faqs|testimonials|pages}
      /            list   /new   /[id]  (tabs: Content · Relations · Media · SEO · History)
/admin/media            Library
/admin/navigation       Menus
/admin/enquiries        Inbox + pipeline      /admin/newsletter
/admin/seo              Global · Title patterns · Head & verification · Custom meta · Health report · Keyword map
/admin/seo/redirects    Redirects + 404 log
/admin/notices          Seasonal notices
/admin/settings         Site settings
/admin/users            SUPER_ADMIN only
/admin/activity         Audit log
/preview/[type]/[id]    Draft preview (draftMode, noindex, auth-gated)
```

### 2.3 Navigation

The header, from the brief, is driven by the Navigation CMS:

- **Destinations:** mega menu by region, populated from published regions
- **Experiences:** themes
- **Journeys:** travel styles, plus featured journeys
- **Bike Tours**
- **Travel Guide**
- **About**
- **Services:** in the footer, and in the header only if the client wants it
- **CTA:** "Plan My Journey"

The footer follows master prompt §93. Legal links appear only when the legal pages are published.

---

## 3. Data model (Prisma)

Relational throughout. JSON only for section props validated by Zod, plus Tiptap document bodies. All timestamps `timestamptz`; traveller-chosen dates are `@db.Date`. Every ordered collection has an explicit `sortOrder`.

### 3.1 Shared building blocks

| Model | Key fields | Notes |
|---|---|---|
| `User` | email (unique, case-insensitive), passwordHash, name, role `SUPER_ADMIN\|ADMIN\|EDITOR`, isActive, lastLoginAt, `sessionsValidFrom` | Tokens issued before `sessionsValidFrom` are rejected (logout-everywhere, password change) |
| `AuditLog` | userId, action, entityType, entityId, diff Json, createdAt | Written by every mutation |
| `Media` | provider, publicId (unique), url, width, height, format, bytes, blurDataUrl, **altText**, title, caption, description, credit, licence `OWNED\|LICENSED\|UNKNOWN`, folder, sha256 | No other table stores an image URL, only `mediaId`. Licence UNKNOWN is flagged in the health report |
| `MediaUsage` | mediaId, entityType, entityId, role (`HERO\|GALLERY\|OG\|INLINE`), sortOrder | Powers galleries, "where used", and unused-media cleanup |
| `SeoMeta` | metaTitle, metaDescription, h1Override, focusKeyword, secondaryKeywords String[], keywordVariants String[], relatedTerms String[], canonicalUrl, robotsIndex Bool, robotsFollow Bool, ogTitle, ogDescription, ogImageId, twitterTitle, twitterDescription, twitterImageId, schemaType, customJsonLd Json? | 1:1 with every indexable entity (`seoId @unique`) |
| `CustomMetaTag` | seoId? (null = global), attribute `NAME\|PROPERTY\|HTTP_EQUIV`, key, content, sortOrder | Validated key pattern; reserved keys (description, robots, og:title…) rejected because dedicated fields own them |
| `Category` | type `TRAVEL_STYLE\|EXPERIENCE_THEME\|ARTICLE_CATEGORY\|FAQ_CATEGORY`, slug, name, intro, heroId, seoId, sortOrder, status | Style and theme hubs are Category rows, so they have SEO too |
| `Tag` | slug, name | Articles and experiences, for automatic related content |
| `Faq` / `FaqAssignment` | question, answer (rich), categoryId, status / faqId, entityType, entityId, sortOrder | Reusable across entities |
| `RelatedLink` | fromType, fromId, toType, toId, sortOrder, origin `MANUAL\|SUGGESTED` | Editorial "related" picks. Polymorphic by design; integrity enforced in the write layer, with cleanup on delete |
| `Section` | ownerType (`PAGE\|DESTINATION\|JOURNEY\|…`), ownerId, type (enum §5.6), props Json, isVisible, sortOrder | Page builder, plus extra blocks appended to templates |
| `ContentStatus` enum | `DRAFT\|PUBLISHED\|ARCHIVED` | On every content model, with `publishedAt` |

### 3.2 Travel content

| Model | Fields beyond the common set* | Children and relations |
|---|---|---|
| `Region` | name, tagline, intro (rich), mapKey (SVG region id) | → destinations; hub lists region journeys automatically |
| `Destination` | type `STATE\|CITY\|TOWN\|NATIONAL_PARK\|WILDLIFE_SANCTUARY\|VALLEY\|LAKE\|VILLAGE`, title ("The Pink City"), state, country, regionId, **parentId** (self: Kashmir → Srinagar, Gulmarg…), lat/lng, intro, whyVisit, bestTime, weather, howToReach, localTransport, recommendedDuration, food, culture, festivals, travelTips, whereToStay (areas, not invented hotels), isOffbeat | `DestinationHighlight` (kind `PLACE_TO_VISIT\|THING_TO_DO\|BEYOND_OBVIOUS\|FOOD\|LOCAL_EXPERIENCE`, title, body, mediaId, sortOrder). Sample itinerary is a Section |
| `Journey` | kind `JOURNEY\|RETREAT\|COURSE\|BIKE_TOUR`, days, nights, summary, overview, idealFor, tourType ("Private / On Demand"), pickupDrop, highlights String[], inclusions String[], exclusions String[], accommodationNote, transportNote, practicalInfo, bestTime, **priceFromInr Int? + quoteOnly Bool (default true)**, isFeatured | `JourneyStop` (destinationId, sortOrder, nights), which gives the route and the auto destination → journeys link. `ItineraryDay` (dayNumber, title, body, overnightDestinationId?, meals?). `JourneyStyle` ↔ Category(TRAVEL_STYLE). `JourneyExperience` ↔ Experience |
| `BikeTourDetail` (1:1, BIKE_TOUR only) | totalDistanceKm?, terrain?, difficulty `EASY\|MODERATE\|CHALLENGING\|EXPERT`?, supportVehicle?, motorcycleModel?, riderRequirements?, safetyInfo?, bestRidingSeason? | Null fields hide their row. Nothing is invented |
| `Experience` | format `WALKING\|FOOD_WALK\|CYCLING\|SIGHTSEEING\|DESERT_EVENING\|OTHER`, destinationId, location, duration, bestTime, whatToExpect, thingsToKnow, travelTips, pickupDrop, idealFor, highlights String[], inclusions String[], exclusions String[], priceFromInr?, quoteOnly | `ExperienceStep` (title, body, sortOrder), which holds the old emoji-headed steps with the emoji removed. Themes ↔ Category(EXPERIENCE_THEME) |
| `Service` | summary, description, benefits String[], features String[], process (steps) | `Vehicle` (name, class, seats incl. driver, features String[], mediaId, sortOrder). Transfers fleet from the old page |
| `Article` | kind `BLOG\|GUIDE`, excerpt, body (Tiptap JSON), authorId, categoryId, readingMinutes (computed), updatedAtDisplay, tocEnabled | `ArticleDestination`, `ArticleJourney`, `ArticleExperience` ↔; tags |
| `Author` | name, bio, avatarId | Real people only. Default: "India Uncharted" as the organisation |
| `Testimonial` | authorName, body, location?, avatarId?, rating?, source `DIRECT\|GOOGLE\|TRIPADVISOR\|OTHER`, sourceUrl?, travelledOn?, **verifiedAt?, verifiedById?**, journeyId?, serviceId?, status | **Publishing requires `verifiedAt`** (enforced by Zod `refine` and the server action) |
| `Page` | key (`home\|about\|contact\|plan-my-journey\|privacy\|terms\|cookies\|custom`), title, slug | Built from `Section`s |

*Common set on each: `id, slug @unique, name, shortDescription, heroId, status, publishedAt, sortOrder, seoId, createdAt, updatedAt, createdById, updatedById`.

### 3.3 Operations

| Model | Key fields |
|---|---|
| `Enquiry` | refCode (`IU-7Q4KD2`), name, email, phoneE164, whatsappOptIn, country, travelDateFrom?/To? `@db.Date`, flexibleDates, adults, children, destinationsWanted String[], travelStyles String[], budgetBand (enum, not free text), message, **sourcePath, entityType?, entityId?, entityNameSnapshot**, channel `FORM\|WHATSAPP_CLICK\|PHONE_CLICK`, status `NEW\|CONTACTED\|QUOTED\|CONFIRMED\|COMPLETED\|LOST`, assignedToId?, utm Json, ipHash, userAgent, consentAt, spamScore |
| `EnquiryNote` | enquiryId, userId, body |
| `NewsletterSubscriber` | email @unique, status `PENDING\|CONFIRMED\|UNSUBSCRIBED`, confirmToken, source, consentAt |
| `SeasonalNotice` | scope `GLOBAL\|REGION\|DESTINATION\|JOURNEY\|EXPERIENCE`, targetId?, title, body, startsOn, endsOn, blocksEnquiry Bool, version, isActive. Most specific scope wins, resolved in one function |
| `Redirect` | fromPath @unique (normalised: lowercase, no trailing slash, no query), toPath?, statusCode `301\|302\|307\|308\|410`, origin `MIGRATION\|SLUG_CHANGE\|MANUAL`, hits, lastHitAt, isActive, note |
| `NotFoundLog` | path @unique, hits, lastReferrer, lastSeenAt, resolved. One-click "create redirect" in admin |
| `NavigationMenu` / `NavigationItem` | key (`header\|footer-*\|mobile`) / label, href or (entityType, entityId), parentId, kind `LINK\|MEGA\|CTA\|HEADING`, isVisible, openInNewTab, sortOrder. Entity links resolve at render, so renamed slugs never break menus |
| `SiteSettings` (singleton) | businessName, tagline, logoId, logoDarkId, faviconId, phoneE164, whatsappE164?, email, address fields, mapUrl, socials Json, businessHours Json, footerDescription, copyright, defaultCta, defaultOgImageId |
| `SeoSettings` (singleton) | siteTitle, titleSeparator, per-type title & description **patterns** (`{name} Tour Packages & Travel Guide`), defaults for every SeoMeta field, verification codes (Google, Bing, Yandex, Pinterest), GA4 ID, GTM ID, Meta Pixel ID, consentMode, organisation schema fields, `customHeadTags` (SUPER_ADMIN; meta and link only) |
| `RateLimit` | key, windowStart, count. Postgres fixed window, no extra infrastructure |

Search uses Postgres full-text search: a generated `tsvector` column plus a GIN index on destinations, journeys, experiences, services and articles, and `pg_trgm` for typo tolerance. It only ever queries `status = PUBLISHED`.

---

## 4. Layers and cross-cutting rules

```
src/
  app/(site)/…              public routes (Server Components)
  app/admin/…               CMS (Server Components + client islands for editors)
  app/preview/…             draftMode preview
  app/api/…                 only: media sign, enquiry (for non-JS fallback), newsletter confirm, revalidate webhook
  actions/<entity>.ts       "use server" — create/update/delete/setStatus/reorder/duplicate
  components/ui/            primitives, zero business knowledge
  components/site/          public composites        components/admin/  CMS composites
  components/motion/        GSAP + Framer wrappers (client, lazy)
  lib/content/<entity>.ts   THE read layer — server-only, cached by tag, returns domain types
  lib/seo/                  resolveMetadata, jsonld builders, analyzeSeo (pure), keyword map
  lib/schemas/<entity>.ts   Zod — shared by form + action
  lib/auth/                 jwt, session, rbac (can(user, action, resource))
  lib/richtext/             Tiptap schema, server renderer → semantic HTML, sanitiser
  lib/redirects.ts  lib/notices.ts  lib/phone.ts  lib/slug.ts  lib/media/<provider>.ts  lib/email/<provider>.ts
  proxy.ts                  admin gate + redirect resolution (named middleware.ts before Next.js 16)
prisma/schema.prisma  prisma/migrations/  prisma/seed/  scripts/import-wordpress/
```

- **Read layer:** public pages import only from `lib/content`. Each accessor is cached with entity tags (`journey`, `journey:{slug}`, `destination:{id}:journeys`). Tag names are exported constants shared with the write layer. Every admin mutation revalidates the entity tag, the tags of related entities, `sitemap` and `nav`, including the old slug when a record is renamed.
- **Write layer:** every action does `requireRole()` → Zod parse → slug uniqueness and reserved-slug check → transaction → auto-redirect on slug change → revalidate → audit log. It returns `{ ok, id } | { ok:false, error, fieldErrors }`.
- **RBAC:**

  | Capability | EDITOR | ADMIN | SUPER_ADMIN |
  |---|---|---|---|
  | Create or edit content | ✓ | ✓ | ✓ |
  | Publish | ✗ | ✓ | ✓ |
  | Delete | ✗ | ✓ | ✓ |
  | Edit SEO fields on their own content | ✓ | ✓ | ✓ |
  | Edit custom JSON-LD | ✗ | ✓ | ✓ |
  | Global SEO and redirects | ✗ | ✓ | ✓ |
  | Head and analytics settings | ✗ | ✗ | ✓ |
  | Enquiries | ✓ (read, notes) | ✓ | ✓ |
  | Site settings | ✗ | ✓ | ✓ |
  | Users | ✗ | ✗ | ✓ |

  Editors submit for review (`DRAFT` with a `reviewRequested` flag). Checked server-side in every action, not only in the UI.
- **Auth:**
  - HS256 JWT via `jose`, 7-day expiry, rotated on use after 24h
  - cookie `iu_session`: httpOnly, Secure, SameSite=Lax, path `/`
  - bcryptjs cost 12
  - identical errors for an unknown email and a wrong password, with the hash computed anyway on a miss
  - login rate-limited per IP and per email
  - `sessionsValidFrom` watermark, stored in whole seconds
  - CSRF: server actions are same-origin by default in Next.js; API routes check `Origin`
- **Rich text:**
  - Tiptap stored as JSON, rendered on the server to semantic HTML through an allowlisted node schema
  - H1 is not available in body content; H2–H4 are in the toolbar, H5–H6 under "More"
  - an outline panel warns about skipped heading levels
  - links to internal entities are stored by ID and resolved at render, so they never break
  - legacy WordPress HTML goes through `sanitize-html` once at import, then is converted to Tiptap JSON
- **Images:**
  - `next/image` with a Cloudinary loader, blur placeholder and explicit `sizes`
  - one `MediaFrame` component renders every photograph, with a fixed ratio set (21:9 hero, 4:5 card, 3:2 editorial, 1:1 thumb)
  - uploads are resized in the browser to a maximum of 2400px, and signed on the server after an auth check
  - alt text is required to publish any media with the HERO or GALLERY role
- **Redirects:**
  - `proxy.ts` checks non-asset paths against an in-memory map loaded from `Redirect` (60s TTL, and flushed when an admin saves)
  - exact status codes are honoured; 410 rewrites to a "gone" page
  - hits are logged asynchronously
  - on save: redirect chains are collapsed (A→B→C becomes A→C) and loops rejected
  - a slug change creates a redirect automatically
  - unmatched 404s are recorded in `NotFoundLog`
- **Phone and WhatsApp:**
  - normalised to E.164 in one function
  - `wa.me/{digits}?text=` built in one helper with context ("Hello, I'm interested in the Kashmir Honeymoon Tour Package (6 Days / 5 Nights) — ref /journeys/…")
  - WhatsApp buttons render **only when `SiteSettings.whatsappE164` is set**
- **Spam:**
  - honeypot field, silently accepted
  - minimum time to submit
  - per-IP rate limit
  - a Cloudflare Turnstile adapter is ready but off by default
- **Dates:** "today" is computed in `Asia/Kolkata`. Enquiry travel dates are bare dates.

---

## 5. SEO architecture

### 5.1 Metadata resolution (one function, `resolveMetadata(entity, type)`)

The first non-empty source wins:

1. The entity's `SeoMeta` field
2. The per-type pattern in `SeoSettings`, filled from entity fields (`{name}`, `{days}`, `{region}`)
3. Global defaults

**Other rules:**
- **H1:** `h1Override`, otherwise the entity name, and exactly one per page. Meta title and H1 are separate fields.
- **Canonical:** `SeoMeta.canonicalUrl`, otherwise `NEXT_PUBLIC_SITE_URL + path`, with no query string and no trailing slash.
- **Robots:**
  - per-entity index and follow
  - **the environment gate `SITE_INDEXABLE=true` exists only in production**, so staging is always noindex and production can't be noindexed by accident
  - the admin shows a red banner if the site-wide default is set to noindex
- **Open Graph and Twitter:** fall back through og → meta → pattern. The image falls back to the hero, then the default OG image. `og:locale en_IN`, `twitter:card summary_large_image`.
- **Custom meta tags:** rendered after the generated tags. Keys owned by dedicated fields are rejected.

### 5.2 Structured data (visible content only)

| Page | JSON-LD |
|---|---|
| All | `Organization` (TravelAgency) with real address, phone, email and sameAs socials. `WebSite` with `SearchAction` on the homepage only |
| Deep pages | `BreadcrumbList` built from CMS relations (Home → Destinations → Kashmir → Gulmarg) |
| Destination | `TouristDestination`, including `containsPlace` for child destinations |
| Journey / bike tour | `TouristTrip` with `itinerary` as an `ItemList` of stops, and `touristType` from idealFor. **No `offers`** while the journey is quote-only |
| Experience | `TouristTrip` with the destination as `itinerary`. No invented schedule, times or offers |
| Article | `BlogPosting` (BLOG) / `Article` (GUIDE) with author, datePublished, dateModified, image |
| FAQ block | `FAQPage` only when the FAQs are visible on the page. The CMS help text says Google limits FAQ rich results; the markup is still valid |
| Testimonials | **No `AggregateRating` or `Review` markup** unless reviews are verified, meet the count threshold, and ADMIN explicitly enables it |

Custom JSON-LD rules: it must parse, must contain `@context` and `@type`, is size-capped, and is serialised with `<` escaped so it can't break out of the script tag. Editing requires ADMIN or above. The preview shows the merged graph.

### 5.3 Sitemaps and robots

- **Sitemaps:** `generateSitemaps` splits them by type (pages, destinations, regions, journeys, bike tours, experiences, articles, categories). `lastModified` comes from `updatedAt`. Only PUBLISHED records that are indexable and self-canonical are included.
- **robots.ts:** allows `/` and disallows `/admin`, `/api`, `/preview`, `/login`, `/search`. Points at the sitemap index. In non-production environments it returns `Disallow: /`.

### 5.4 Keyword management and health

- **Keyword fields:** focus keyword, secondary keywords, variants and related terms, entered as chip inputs.
- **Site keyword map** (`/admin/seo/keywords`): every focus keyword and its page. **It warns on cannibalisation**, when two pages target the same focus keyword. Old "Kashmir tour packages" landing copy and the Kashmir destination merge into one page for exactly this reason.
- **`analyzeSeo(entity, context)` is a pure, unit-tested function.** Its checks:
  - meta title missing, or too long (over about 60 characters or 580px estimated)
  - meta description missing, or outside 70–160 characters
  - H1 missing
  - focus keyword missing from the title, H1, first paragraph, slug or any image alt (each a *suggestion*)
  - canonical conflict
  - OG image missing
  - hero alt text missing
  - image licence unknown
  - fewer than 2 internal links in or out (orphan check)
  - no related content
  - duplicate title or description elsewhere on the site
  - thin content (word-count threshold per type)
  - broken internal links
  - noindex on a record linked from the nav
- **Presentation:** as ✓ / ⚠ lists. **No numeric "SEO score"**, and the copy never implies a ranking guarantee.
- **Search preview:** a Google-style snippet (desktop and mobile widths) plus social card previews in every editor's SEO tab.

### 5.5 Internal linking engine

- **Automatic and relational:**
  - destination → journeys (via `JourneyStop`), experiences, articles, child destinations, parent, sibling destinations in the region
  - journey → stops, experiences, same-style journeys
  - experience → destination, other experiences in the same destination, journeys passing through
- **Suggested:** `suggestRelated(entity)` scores candidates by shared destination (3), region (2), style or theme (2) and tags (1), minus anything already linked. Editors accept or reject in the Relations tab, and accepted ones become `RelatedLink(origin=SUGGESTED)`.
- **Manual:** `RelatedLink` picks, with drag to reorder.
- **Breadcrumbs:** generated from these relations and emitted both visually and as JSON-LD.

### 5.6 Section types (page builder and template extras)

`HERO`, `RICH_TEXT`, `IMAGE_TEXT`, `GALLERY`, `EDITORIAL_QUOTE`, `CARD_GRID` (manual), `DESTINATION_GRID` / `JOURNEY_GRID` / `EXPERIENCE_GRID` / `SERVICE_GRID` / `ARTICLE_GRID` (query or manual), `REGION_CAROUSEL`, `INDIA_MAP`, `FAQ`, `TESTIMONIALS`, `CTA`, `VIDEO`, `MAP_EMBED`, `STATS` (**every stat needs a source note field; blank means hidden**), `NEWSLETTER`, `TABLE`, `CALLOUT`, `HTML_SAFE` (SUPER_ADMIN; sanitised, no scripts).

Each type has a Zod props schema, an admin form, and a server renderer. Grids declare a `minItems`, and below it the section hides itself (principle 4).

---

## 6. Design approach (decided in Phase 0, not here)

### 6.1 What is already fixed

- **Palette from the brief:** ivory/sand, deep forest green, charcoal, muted terracotta, soft gold. The evidence agrees:
  - the logo's warm brown (about #3e2e1d) becomes the ink/charcoal role
  - the live site's #e3876e and the logo's sun give terracotta
  - #e6ae48 gives gold
  - forest green is the only colour from the brief with no source in the logo; it is used for the signature sections (Beyond the Obvious, newsletter)
- **Type:** editorial serif display (Playfair Display or Cormorant Garamond) plus DM Sans or Inter body, self-hosted via `next/font` with subsetting.
- **Motifs from the logo:** sun, mountain ridge line, lotus. These can become restrained graphic devices, such as a ridge-line divider or a sun-arc progress indicator, never clip-art.
- **Mode per surface:**
  - home: **Persuade**
  - destination, region and theme hubs: Persuade/Read hybrid
  - journeys and experiences: Persuade (decision pages)
  - travel guide: **Read**
  - admin: **Operate**

### 6.2 Phase 0 direction round

Run the impeccable new-work flow (world → concept seed → direction choice) with the fixed items above as binding constraints. Output:

- tokens (50–950 ramps, with contrast measured)
- a named type scale
- surfaces, motion grammar (durations, easing, reduced-motion), focus and selection theming
- the `ui/` primitive inventory and a `/styleguide` route
- `DESIGN.md`, written from the built system

**Motion budget:**
- GSAP only on the hero, the parallax featured image, the horizontal region carousel, the map reveal and the itinerary timeline
- Framer Motion for the drawer, modals, accordions, card hover and the enquiry steps
- all of it in client islands imported dynamically
- content is visible by default, so a failed animation never hides it

### 6.3 Homepage: the brief's 17 sections against real content

| # | Section | Launch content | Gate |
|---|---|---|---|
| 01 | Hero "India, Beyond the Obvious." | Brief copy + licensed hero image | Needs a licensed image |
| 02 | Brand statement | Brief heading + client About copy | — |
| 03 | Featured image "Go deeper into India" | Licensed image | Image |
| 04 | Discover India (1 large + small cards) | Rajasthan, Goa, Kashmir, Ladakh (Leh). **Kerala is in the brief but has no client content** | ≥3 published |
| 05 | Explore by Region carousel | Rajasthan, North India, Himalayas, Ladakh, Goa, Central India | Region needs ≥1 published destination; Kerala, South, East, Northeast and Islands hidden |
| 06 | Featured Journeys (3–4) | `isFeatured` journeys, e.g. Golden Triangle Wildlife, Kashmir Honeymoon, 8-Day Goa Yoga Retreat, Rajasthan Motorcycle | ≥3 |
| 07 | Beyond the Obvious (deep green) | **The client's offbeat destinations** (Khichan, Tal Chhapar, Jawai, Jispa, Doodhpathri), once enriched. Shekhawati, Bundi, Chettinad and Turtuk only with client content | ≥3 with `isOffbeat` + published |
| 08 | Travel Your Way | Styles with ≥1 journey: Private, Luxury, Family, Honeymoon, Wildlife, Wellness & Ayurveda, Food & Culture, Adventure; Motorcycle as the featured tile | Per tile |
| 09 | Motorcycle Journeys "Ride India. Feel every mile." | Rajasthan and Manali–Leh/Ladakh routes (3 bike products). South India, Goa and Northeast routes hidden | Per route |
| 10 | Interactive India map | Regions with content highlighted | **Map must use Survey of India-compliant boundaries** (legal requirement for maps of India) |
| 11 | Experiences | Heritage, Food, Wellness, Spiritual India, Wildlife, Photography, Adventure. Village Life hidden until content exists | Per theme |
| 12 | Philosophy "We don't just plan trips. We design experiences." | Private · Personal · Authentic, with client philosophy copy | — |
| 13 | Guest Stories | **Hidden at launch**: the 2 existing testimonials are unverified | ≥3 verified |
| 14 | Travel Journal (3 articles) | Latest 3 published | ≥3 |
| 15 | Plan Your Journey CTA | Brief copy | — |
| 16 | Newsletter | Only once a provider or double opt-in is confirmed | Setting on |
| 17 | Footer | SiteSettings + nav | — |

The homepage's H1 is the hero line. Sections 02, 04, 06 and 14 carry the crawlable intro and internal links for the brand plus "India tour packages" intent.

### 6.4 Template section orders

- **Destination:**
  1. hero + breadcrumbs
  2. quick facts (region, best time, recommended duration, how to reach)
  3. intro
  4. why visit
  5. places to visit
  6. things to do and experiences
  7. beyond the obvious
  8. food and culture
  9. where to stay (areas)
  10. best time and weather
  11. how to reach and local transport
  12. sample itinerary
  13. travel tips
  14. journeys through here
  15. child and nearby destinations
  16. guides
  17. FAQs
  18. Plan My Journey CTA

  A sticky in-page contents list appears on desktop. Every heading exists only when its field has content. All text is server-rendered; accordions use `<details>`, so the content stays in the HTML.
- **Journey:**
  1. hero with days/nights, route line and styles
  2. sticky enquiry card (desktop) / sticky bottom bar (mobile), showing "Price on request" when quote-only
  3. overview facts
  4. highlights
  5. route map
  6. day-by-day timeline
  7. accommodation (if set)
  8. experiences
  9. inclusions / exclusions
  10. best time
  11. practical info
  12. FAQs
  13. related journeys
  14. CTA
- **Bike tour:** the journey template plus a riding spec strip (distance, terrain, difficulty, support vehicle, bike), rider requirements, and safety.
- **Experience:** hero, facts (duration, pickup, ideal for), what to expect (steps), highlights, inclusions and exclusions, things to know, destination card, related experiences, journeys through the destination, FAQs, CTA.
- **Article:** title, meta (category, reading time, updated date), hero, a contents list for guides, body, related journeys and destinations inline in the sidebar (desktop) or after the body (mobile), related articles.

---

## 7. Lead generation

- **Plan My Journey** (`/plan-my-journey`), a multi-step form using the brief's fields:
  1. Where: destinations and styles as chips, prefilled from context
  2. When and who: dates or flexible, adults, children
  3. Budget band and message
  4. Contact: name, email, WhatsApp/phone with country picker, country
  - Progressive: the enquiry is saved at the last step, not per step. Works without JavaScript as a single long form.
  - CTA: "Start Planning".
- **Contextual enquiry:** "Enquire about this journey" opens a dialog with the entity already attached (`entityType`, `entityId` and name snapshot), so the traveller never retypes the package.
- **Success:** a real confirmation, only after the database write, showing the reference code. Then an optional "Continue on WhatsApp" with a prefilled message, if a WhatsApp number is set. Errors keep the form input.
- **Notifications:**
  - email to the team (provider adapter; failure is non-fatal and logged)
  - optional auto-reply to the traveller
- **Admin inbox:**
  - pipeline NEW → CONTACTED → QUOTED → CONFIRMED → COMPLETED / LOST
  - notes and assignee
  - one-tap WhatsApp or call
  - filters and CSV export
  - dashboard counts (today, 7 days, 30 days, by source entity)
- **Analytics events** (only if configured and consented): `enquiry_submit`, `whatsapp_click`, `phone_click`, `newsletter_signup`.

---

## 8. Admin UX requirements

- **Entity editor tabs:** Content · Relations · Media · SEO · History.
- **Sticky action bar:**
  - Save draft, Preview (opens `/preview/…` in draftMode) and Publish/Unpublish
  - Archive and Delete are in an overflow menu, with Delete confirmed by typing the name
  - "View on site" appears when published
- **Help text** on every SEO field, in master prompt §101 wording, with live character counters and the recommended ranges.
- **Lists:** search, status filter, publish switch (takes effect immediately, confirmed with a toast), drag reorder (never a raw sort number), duplicate.
- **Dashboard:**
  - counts by type and status
  - drafts awaiting review
  - recently updated
  - enquiries (new, 7-day trend)
  - top SEO warnings, linked to the records
  - top 404s without a redirect
  - quick actions: Add Destination / Journey / Experience / Article / Service / Guide
- **Media library:**
  - grid, search, filter by folder and licence
  - bulk upload, replace a file in place (keeps ID and usages)
  - alt/caption/description/credit editing
  - "used in" list
  - unused-media cleanup that deletes from the provider and the database together
- **Navigation editor:** a tree with drag reorder, an entity picker or custom URL, visibility toggles and a live header preview.
- **Mobile-usable:** the sidebar becomes a drawer, tables become cards, and forms are single-column.
- **Unsaved-changes guard.** Autosave of drafts every 30s; only on DRAFT records.

---

## 9. Migration and import (Phase 2)

`scripts/import-wordpress/` runs against a frozen crawl snapshot and is re-runnable and idempotent (matched by slug):

1. **Fetch:** saved HTML for all 131 URLs, plus the WP REST API (`/wp-json/wp/v2/posts,pages,media,destination,activity`) where it's open, which gives cleaner content, dates and media alt text.
2. **Parse packages:**
   - "Tour Overview" key/value lines become days/nights, stops, pickupDrop, tourType and idealFor
   - `Day N:` headings become `ItineraryDay`
   - "Package Inclusions/Exclusions" lists become arrays
   - "Why Choose" becomes highlights
   - "Best Time" becomes bestTime
3. **Parse experiences:** step headings (emoji removed) become `ExperienceStep`; overview facts are parsed the same way.
4. **Destinations:**
   - create 36 terms minus 1 duplicate
   - rename jaispa → jispa and khivhan → khichan **pending client confirmation**
   - set parents (Kashmir → Srinagar, Gulmarg, Pahalgam, Sonamarg, Yusmarg, Doodhpathri; Himachal Pradesh → Manali, Jispa, Sarchu; Leh → Nubra Valley, Pangong Lake)
   - assign regions
   - merge the 21 `-tour-packages` pages' "Why visit" copy into `whyVisit`
   - link products from §1.3
5. **Articles:** body HTML → sanitised → Tiptap JSON. Keep original publish dates. Map inline links to entity IDs.
6. **Media:** download originals, hash to deduplicate, upload to Cloudinary. Keep a meaningful WordPress alt, otherwise leave it **empty and flagged** (no generic alt text). Licence = UNKNOWN.
7. **Redirects:** seed `Redirect` from `docs/migration/url-map.csv` (origin MIGRATION).
8. **Settings, navigation, testimonials:** SiteSettings from §1.2. Testimonials as DRAFT/unverified.
9. **SEO:** carry over the 20 existing meta descriptions. Leave the rest empty so the health report lists them for a hand-written pass. **No bulk-generated descriptions.**
10. **Report:** `docs/migration/import-report.md` lists per-record parse warnings, unmatched links, missing alt text and thin records. Every journey and experience is reviewed by hand against the old page before publishing.

---

## 10. Phases

Each phase ends at a demoable state and a credential boundary. Nothing blocks Phase 0.

| Phase | Needs from client or infrastructure | Delivers |
|---|---|---|
| **0 — Foundation & direction** | Nothing (confirming the logo helps) | Next.js scaffold, strict TypeScript, ESLint, Prettier; impeccable direction round; tokens; fonts; `ui/` primitives (Button/LinkButton, Field set, Select, Checkbox, Switch, Chip input, Dialog, Drawer, Toast, Tabs, Accordion, Breadcrumb, MediaFrame, Skeleton, EmptyState, Table, Pagination, StickyActionBar); motion wrappers; `/styleguide`; `DESIGN.md` |
| **1 — Data & auth** | Postgres URL | Full Prisma schema + migrations; seed users (SUPER_ADMIN from env); `lib/auth` + RBAC + `proxy.ts`; login/logout/session; audit log; read-layer skeleton with cache tags; Zod schemas for every entity; unit tests (slug, phone, redirect normaliser, notice resolution, RBAC) |
| **2 — Migration import** | Cloudinary keys | Importer (§9); all content in the database; redirects seeded; import report; manual review checklist |
| **3 — Public templates** | Licensed hero images (placeholders visibly marked until then) | Destination, Region, Journey, Bike Tour, Experience, theme and style hubs, Article, Service, About, Contact, FAQs, legal, Search, 404 (search + popular destinations + journeys), error boundaries, loading skeletons; `resolveMetadata`, JSON-LD, breadcrumbs, sitemaps, robots, redirects live |
| **4 — Homepage** | Hero and featured photography | The 17 sections with content gates; GSAP hero, parallax, region carousel; India map (compliant SVG) |
| **5 — CMS** | — | CRUD for every entity with tabbed editors; Tiptap editor with headings, lists, links, entity links, images, gallery, video, quote, callout, table, CTA, FAQ and related blocks; Relations tab with suggestions; Media library; Navigation editor; Page/section builder; SiteSettings; Users; status workflow + review requests; draftMode preview |
| **6 — SEO manager** | GA4, GTM, Pixel and Search Console IDs (optional) | Global SEO, title patterns, per-entity SEO tab with SERP and social previews, keyword chips + site keyword map, custom meta tags, custom JSON-LD editor with validation, head and verification settings, consent banner + Consent Mode v2, health report, redirect manager + 404 log, seasonal notices |
| **7 — Lead generation** | Email provider credentials; WhatsApp number confirmed | Plan My Journey, contextual enquiry dialog, WhatsApp/phone CTAs, spam controls, email alerts, enquiry inbox + pipeline, dashboard metrics, newsletter (double opt-in) if approved |
| **8 — Content pass** | Client facts for destination enrichment; testimonial verification; legal texts | Hand-written meta descriptions and alt text for all migrated records; destination enrichment from client-supplied facts; Wellness cluster hub; offbeat destinations filled; focus keywords assigned without cannibalisation |
| **9 — QA & launch** | Domain/DNS access, WordPress admin access | Gates (§11); crawl all 131 old URLs against staging and assert the exact status and target; Lighthouse and axe at 390 and 1440px; WordPress database and uploads backup; DNS cutover; Search Console property check + sitemap submit; watch the 404 log for 14 days; `HANDOVER.md` written for the team |

---

## 11. Gates: a phase isn't done until these pass

```
npm run typecheck          # 0 errors
npm run lint               # 0 warnings
npm run test               # unit: analyzeSeo, resolveMetadata, redirects, slug, phone, rbac, notices, suggestRelated
npm run build              # clean
npx prisma validate && npx prisma migrate diff --exit-code   # schema matches migrations
npm run test:e2e           # Playwright smoke: home, each template, enquiry submit, admin login, publish flow
node scripts/check-redirects.mjs docs/migration/url-map.csv $STAGING_URL   # every row: exact status + target
grep -rn "text-\[" src/ ; grep -rn "z-\[" src/                             # no arbitrary type/z-index values
```

**By hand:**
- 320, 390, 768, 1024 and 1440px with no horizontal overflow
- keyboard-only through the nav, mega menu, drawer, enquiry dialog and the CMS editor
- contrast measured on built pages
- reduced motion verified
- an admin edit shows on the public page within one request
- a draft never appears in the sitemap, search or listings
- changing a slug creates a redirect
- an EDITOR can't publish, even by calling the server action directly
- changing a password logs other sessions out
- staging serves `Disallow: /` and noindex
- **no invented price, rating, review, award, statistic or partner is visible anywhere**

---

## 12. Anti-bug contract

These carry over from BLUEPRINT §5, with additions for this build. Breaking one counts as a defect.

1. **Price snapshots:** enquiries store the entity name and any displayed price at submit time.
2. **Soft deletes:** entity foreign keys on `Enquiry` use SET NULL; the snapshot keeps the record readable. Unpublishing is the default, not deletion.
3. **Slugs:** unique per model, reserved words blocked, collisions get a numeric suffix. A rename warns and creates a redirect automatically.
4. **Media:** uploads are signed server-side only, and cleanup deletes from the provider and the database together.
5. **Cache tags:** tag constants are shared between the read and write layers. Every mutation revalidates related entities and the sitemap too.
6. **Sort order:** always explicit, never insertion order.
7. **Timezone:** `timestamptz` everywhere, `DATE` for travel dates, "today" pinned to IST.
8. **Spam:** honeypot silently accepted, plus a rate limit.
9. **Phone numbers:** normalised to E.164 in one place; WhatsApp links come from one helper.
10. **Login security:** no account enumeration, and a session revocation watermark.
11. **Publishing controls:** a switch acts immediately; a checkbox waits for Save.
12. **Indexing:** production-only `SITE_INDEXABLE`, so staging can never be indexed and production can't be de-indexed by a single field.
13. **Structured data:** JSON-LD only describes visible content, with no `offers` on quote-only products and no ratings without verified reviews.
14. **Redirects:** chains collapse and loops are rejected on save.
15. **Menus and links:** navigation and rich-text links reference entity IDs, not URLs.
16. **Hidden sections:** a section with fewer than its minimum items hides; it never pads with placeholders on the public site.
17. **Testimonials:** can't be published without `verifiedAt`.
18. **Stats:** each stat needs a source note to render.
19. **Maps:** India map boundaries must be Survey of India-compliant.

---

## 13. Environment

```
DATABASE_URL=                 # pooled if serverless
DIRECT_URL=                   # for prisma migrate
JWT_SECRET=                   # ≥32 random bytes
NEXT_PUBLIC_SITE_URL=https://indiauncharted.com
SITE_INDEXABLE=false          # true only in production
MEDIA_PROVIDER=cloudinary     CLOUDINARY_CLOUD_NAME= CLOUDINARY_API_KEY= CLOUDINARY_API_SECRET=
EMAIL_PROVIDER=smtp|resend    EMAIL_FROM= EMAIL_TO_ENQUIRIES= SMTP_URL= RESEND_API_KEY=
SEED_SUPERADMIN_EMAIL=        SEED_SUPERADMIN_PASSWORD=
TURNSTILE_SITE_KEY= TURNSTILE_SECRET=   # optional
```

Analytics IDs live in `SeoSettings` (database), not in env. Nothing secret uses the `NEXT_PUBLIC_` prefix. `.env.example` is committed; `.env*` is ignored.

---

## 14. What we need from the client

| Item | Blocks | Default until received |
|---|---|---|
| **Confirm the live-site logo is the "new logo"**, and send the SVG/AI file | Final tokens and header (Phase 0 finish) | Trace from the PNG for development only |
| **Is +91 80059 67178 on WhatsApp?** | WhatsApp CTAs (Phase 7) | Phone CTAs only |
| Confirm the destination spellings **Jispa** (was "jaispa") and **Khichan** (was "khivhan") | Slugs for 2 destinations | Keep as DRAFT |
| Verify the 2 testimonials (real person, consent, trip, date) or supply verified reviews | Guest Stories section | Hidden |
| Confirm the claims: "24/7 support", "strong hospitality partnerships", "sustainable practices", "100% Verified" fleet | About and Transfers copy | Kept in DRAFT copy, removed from published copy |
| Licensed or owned photography, especially heroes for home, regions and top destinations; licences for the existing 322 images | Visual launch quality | Visibly marked placeholder frames |
| Destination facts for enrichment (best time, how to reach, food, tips) where the old site has none, especially the offbeat set | Beyond the Obvious section, content depth | Sections hide |
| Whether Kerala, South, East, Northeast, Islands, Shekhawati, Bundi, Chettinad or Turtuk will be sold, and their content | Regions and Beyond the Obvious tiles | Hidden |
| Privacy Policy, Terms, Cookie Policy text (or a lawyer-approved template) | Legal pages, consent banner | Unpublished; links hidden |
| Newsletter: yes/no and provider | Section 16 | Off |
| Email for enquiry alerts + sending domain (a Gmail sending address hurts deliverability) | Email alerts | Stored in inbox only |
| Google Search Console, GA4/GTM, Meta Pixel access | Verification and analytics | Off |
| WordPress admin + hosting access (REST export, backups), **audit of the `saragamhospitaludaipur` user** | Clean import and a safe cutover | Crawl snapshot |
| Domain/DNS access | Launch | — |
| Team members and roles | User accounts | SUPER_ADMIN only |

---

## 15. Risks

| Risk | Mitigation |
|---|---|
| Lost rankings after migration | 100% URL-mapped 301s, checked by script before cutover; titles and descriptions better than the old site; 404 log monitored for 14 days; sitemap resubmitted |
| Parsed WordPress content silently wrong (days merged, lists broken) | Import report plus a manual review of every journey and experience before publishing |
| Launching "premium" with thin destination pages | Sections gated on content; Phase 8 content pass; thin destinations stay DRAFT rather than published empty |
| Image licensing exposure (unknown provenance of 322 uploads) | Licence field; health report flags UNKNOWN on published pages |
| Map of India boundary compliance | Use an official or compliant boundary source; legal review before launch |
| Brand/content mismatch (heritage-luxury brief vs wellness-heavy content) | Wellness given first-class IA; client confirms emphasis at the Phase 0 review |
| Scope size | Phases are independently shippable; Phases 3–4 can launch behind the old site on staging while CMS work continues |
