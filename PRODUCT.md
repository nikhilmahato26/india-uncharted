# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack

Decided with the developer on 2026-09-15. Where BLUEPRINT.md says otherwise, the master prompt wins:

- Next.js App Router, TypeScript strict, React Server Components by default
- Tailwind CSS v4 with design tokens in `@theme`
- PostgreSQL + Prisma ORM, with migrations committed to the repo
- JWT (jose) in an httpOnly, Secure cookie; bcryptjs password hashing; three roles: SUPER_ADMIN, ADMIN, EDITOR
- Zod v4 schemas shared by admin forms and server actions
- GSAP (ScrollTrigger) and Framer Motion, each loaded only by the components that use it
- Cloudinary for media, uploads signed on the server (behind a `MEDIA_PROVIDER` adapter)
- Replaces the current WordPress 7 + Yoast SEO site at https://indiauncharted.com/

## Users

**Primary: international and domestic travellers planning a private trip in India.** They arrive from search or social media, often on a phone. They are comparing a named trip ("Kashmir honeymoon package", "yoga retreat in Goa", "Rajasthan motorcycle tour") or researching a place ("best time to visit Goa for a yoga retreat"). Their job is to decide whether India Uncharted can put together the trip they have in mind, then start that conversation without friction.

**Secondary: people researching a specific experience.** Examples are a food walk in Jodhpur, a desert evening in Jaisalmer, a 200-hour yoga teacher training in Rishikesh, a paragliding course in Himachal, or airport transfers. They need concrete practical detail and a quick way to ask.

**Operators: the India Uncharted team in Jodhpur.** They add and edit destinations, journeys, experiences and articles. They manage SEO themselves and work enquiries through to a booked trip, all without a developer. Their technical skill is assumed to be low, and they often work from a phone.

## Product Purpose

The site is India Uncharted's main source of leads and its long-term search asset. It must:

1. Turn research traffic into qualified enquiries (Plan My Journey, context-aware enquiry forms, phone or WhatsApp).
2. Build a connected library of destinations, journeys, experiences and guides that ranks for how travellers really search.
3. Let the team run content, SEO, redirects and the lead pipeline themselves.

Success means the old site's search visibility survives migration (every old URL resolves with a 301), enquiries arrive with context already filled in, and the team publishes new pages and fixes SEO without asking for a code change.

## Positioning

Private, tailor-made journeys across India, run by a Jodhpur-based team with local knowledge. They combine the famous routes (Golden Triangle, Rajasthan, Kashmir) with offbeat places already in the client's inventory (Khichan, Tal Chhapar, Jawai, Jispa, Sarchu, Doodhpathri, Yusmarg). The client also has a genuine, deep specialism in yoga and wellness retreats in Goa and Rishikesh, which is its largest content cluster.

Brand line from the developer brief: **"India, Beyond the Obvious."**

## Operating Context

- **Pricing:** every package is quote-based ("₹ On Demand" on the live site). No public prices exist, so none are shown.
- **Enquiries:** reach the team today through the Contact Form 7 form (name, email, phone, package, message) and by phone.
- **WhatsApp:** no WhatsApp link exists on the live site. The phone number +91 80059 67178 is shown as "Book" on the transfers page. It has not been confirmed as a WhatsApp number.
- **Transfers:** a real service line. The fleet includes a Toyota Innova Crysta (8 seats including driver), a Maruti Swift Dzire (4 including driver) and others, up to a 17-seat tempo traveller.
- **Seasons:** Himalayan routes, national-park closures and monsoon affect what can be booked. The CMS supports seasonal notices, but no season facts are seeded without the client's confirmation.

## Capabilities and Constraints

- **Content vocabulary (confirmed):** Destinations, Regions, Journeys, Bike Tours, Experiences, Travel Guide, plus Services (Transfers) and Plan My Journey.
- **Offbeat routes:** "Bike Tours" / "Motorcycle Tours" only. Never "Cycling Tours" for motorcycle products. The Jaipur Cycle Tour really is a bicycle tour and keeps that name.
- **Existing content to migrate** (crawled 2026-09-15, full map in `docs/migration/url-map.csv`):
  - 131 public URLs
  - 36 destination taxonomy terms, of which 8 are near-empty and 3 are misspelled
  - 21 "{place}-tour-packages" landing pages
  - 30 multi-day packages (17 journeys, 6 retreats, 4 courses, 3 motorcycle tours)
  - 12 day experiences
  - 10 blog posts
  - 2 testimonials
  - About, Contact and Transfers pages
  - about 322 uploaded images
- **Existing SEO debt:**
  - only 20 of 129 pages have a meta description
  - destination titles read "AGRA Archives - India Uncharted"
  - the homepage H1 is "Special Packages"
  - one destination is duplicated (ranthambore / ranthombore)
- **Undecided:** newsletter provider, email provider, whether the WhatsApp number is active, the vector logo file, analytics IDs, photo licensing.

## Brand Commitments

- **Name:** INDIA UNCHARTED. **Line:** "India, Beyond the Obvious."
- **Logo on the live site** (`wp-content/uploads/2026/02/ind-chr-copy.png`): a sun rising over mountains above a lotus, with a slab-serif wordmark in a single warm dark brown (about #3e2e1d). Open: the client must confirm this is the "new logo" and supply the vector file.
- **Palette pinned by the developer brief:** warm ivory/sand, deep forest green, charcoal, muted terracotta, restrained soft gold. The live site's accents (#e3876e terracotta, #e6ae48 gold) and the logo's brown agree with it.
- **Typography pinned by the developer brief:** Playfair Display or Cormorant Garamond for headings, DM Sans or Inter for body.
- **Voice:** editorial, calm, specific. Avoid bright agency colours, heavy gradients, over-rounded cards, cheap stock photography and over-animation.
- **Swan Tours** (swantour.com) is a reference for content depth and structure only. Never copy its UI, wording, layout or imagery.

## Evidence on Hand

**Real, from the live site:**
- Business address: Killi khana, Sodagoran ka Mohalla, Jodhpur, Rajasthan 342001
- Phone: +91 80059 67178
- Email: indiaunchartedtravel@gmail.com
- Facebook (IndiaUncharted47), YouTube (@indiaunchartedtravel), X (@india_uncharted)
- About and mission copy, all package itineraries with inclusions and exclusions, the experience itineraries, the 10 articles and the transfers fleet

**Needs client verification before publishing:**
- The two homepage testimonials ("Priya Sharma", "Ravi Rathore"), which carry no source or date
- The transfers page's "100% Verified" and "Trusted By Travelers Across India"
- The About page's "24/7 support", "strong hospitality partnerships" and "sustainable and responsible travel practices"

**Absent, and must not be invented:**
- prices, ratings, review counts, awards, certifications, years in business, traveller numbers, hotel names for packages, partner names
- any content for Kerala, South India, East India, Northeast India, the Islands, Shekhawati, Bundi, Chettinad or Turtuk
- a public count of destinations (the brief's "130+" does not match the 36 on the live site)

## Product Principles

1. **Existing client content is the source of truth.** Redesign changes how it is presented, never what it claims.
2. **Every path ends in a human conversation with context attached.** No enquiry reaches the team without knowing which page, destination or journey the traveller came from.
3. **The team ships, not the developer.** Any change to content, SEO, navigation or redirects that needs a deploy is a bug.
4. **Sections appear only when they have content.** If a homepage or template section has no real published data behind it, it hides rather than filling the gap.
5. **Search equity is preserved first.** No old URL returns a 404 at launch.

## Accessibility & Inclusion

- WCAG 2.2 AA on public pages and in the admin.
- Honour `prefers-reduced-motion`.
- Keyboard-complete navigation, enquiry flow and CMS.
- Public tap targets of at least 44px.
- Designed for international readers on mid-range phones over 4G.
