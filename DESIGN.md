# Design — India Uncharted

<!-- impeccable:design-system 1 -->

Written after the build, measured in a browser at 1440px and 390px. Everything here exists in `src/app/globals.css`; this file explains it, it doesn't extend it.

## Direction: The Miniature Folio

A Rajasthani miniature painting is a framed scene with a narrow patterned border and its story written in the margin. The site is built the same way: a **plate** (the photograph) sits inside a **band** (a coloured margin carrying a pearl-dot rule), with a **gold hairline** set inside the band, and the words written on paper beside or beneath it.

What it refuses: the category default of a full-bleed photo behind centred type, followed by a grid of same-size rounded cards.

Why it fits: India Uncharted sells *places seen properly*. A folio frames one scene at a time and names it. The client is based in Jodhpur, and the painting tradition the frame comes from is Marwar's own.

**Chosen against:** a Survey-of-India topographic world (the roll's assignment), a mid-century travel quarterly, and the category standard. The map world survives in one place where it earns its keep — the coordinate plot on the homepage.

## Colour

Derived from the logo's warm brown and the palette the client's brief pins: ivory, forest green, charcoal, terracotta, soft gold.

| Token | Value | Where it goes |
|---|---|---|
| `paper` | `#f4eddf` | The ground everywhere. Wasli paper. |
| `paper-2` / `paper-3` / `paper-4` | `#ebe1cd` / `#dfd2b8` / `#cfbf9f` | Alternate sections, empty frames, admin surfaces |
| `ink` | `#221b15` | All primary text; the logo's brown, cooled slightly |
| `ink-2` / `ink-3` | `#4b4036` / `#6e6052` | Body copy, captions |
| `rule` | `#cbbb9a` | Hairlines and table borders |
| `terracotta-600` | `#a5432a` | **The action colour.** Buttons, links, the active state. Nothing else competes |
| `terracotta-700/800` | `#86341f` / `#6b2b1b` | Hover, pressed |
| `forest-800` / `forest-900` | `#2b4a3c` / `#1c3329` | Whole-section fields: Beyond the Obvious, the map, the footer |
| `gold-300` / `gold-500` | `#d9bc78` / `#b38a3a` | Frame rules, pearl dots, and text **only on dark grounds** |

**Measured contrast** (flattened, from the built pages):

- ink on paper **14.6:1**, ink-2 **8.6:1**, ink-3 **5.2:1**
- paper on forest-800 **8.4:1**, on forest-900 **11.6:1**
- paper on terracotta-600 **5.3:1** (button text), gold-300 on forest-900 **7.3:1**

**The rule that matters most here:** gold is 2.7:1 on paper. It is a *rule and ornament colour on light grounds*, never text. On forest and ink it becomes a text colour, and that is the only place it carries words.

Colour never signals alone. Publish state, enquiry stage and SEO severity each carry their word as well as their colour.

## Type

Two families, as the brief pins:

- **Cormorant Garamond** (500/600, plus italic) for display and headings. The italic carries the accent phrase in the hero and the epithet after a place name ("Jaisalmer — *The Golden City*").
- **DM Sans** for everything read at length, with an optical-size axis.

Named steps, fluid via `clamp()`, weights and tracking baked into the step:

| Step | Size | Used for |
|---|---|---|
| `display-xl` | 3 → 6rem | The homepage H1 only |
| `display-lg` | 2.5 → 4.5rem | Page titles, the footer statement |
| `display-md` | 2 → 3.25rem | Section headings |
| `title` | 1.5 → 2.125rem | Card titles, panel headings |
| `subtitle` | 1.25 → 1.5rem | Sub-headings |
| `lead` | 1.125 → 1.3125rem | Standfirsts |
| `body` | 1.0625rem / 1.68 | Running text |
| `small`, `caption` | 0.9375 / 0.8125rem | Meta, inscriptions |
| `label` | 0.75rem, 0.14em tracking, caps | Inscription bands, field labels |

Body measure is capped by a `.measure` class at 68ch. `th, td, time, data, output` and `.tabular` get tabular figures automatically. There are no arbitrary font sizes in the codebase — `grep -rn "text-\[" src/` returns nothing.

## Surfaces and frames

- **Square corners.** Radii are 0 for cards and plates, 2px for small controls. The folio is a rectangle.
- **The folio frame** (`@utility folio`): `padding: --spacing-band` in the band colour, with a 1px gold rule inset 4px, transitioning on hover. Cards breathe their rule outward by 1px on hover instead of lifting.
- **The pearl band** (`@utility pearl-band`): a radial-gradient dot field, 9px pitch — the dotted margin of a manuscript, as a surface, not an image.
- A surface takes **a border or a shadow, never both**. The two shadows in the system (`--shadow-lift`, `--shadow-float`) both carry an offset and a soft blur, and are used only for the mega menu and dialogs.
- Elevation is a named scale (`--z-raised` … `--z-toast`). `grep -rn "z-\[" src/` returns nothing.

## Motion

One authored moment, not an effect on every section:

- **The folio opens** (homepage hero, GSAP): the band draws inward from 0, the plate settles from 1.08, the cartouche rises 24px, and the inscription is written left-to-right with a clip-path. Then the plate drifts 8% behind its frame on scroll.
- **Parallax plates**: two full-width sections drift 12–14% on a scrub.
- **The itinerary lights**: an IntersectionObserver lights the day you are reading.
- Everything else is a transition: 160ms for state, 320ms for frames, 720ms for photographs, all on `cubic-bezier(0.16, 1, 0.3, 1)`.

Content is always visible first; animation only moves what is already rendered, so a failed script can never hide a page. `prefers-reduced-motion` collapses every duration to 1ms and the GSAP timelines never start.

GSAP is imported dynamically inside the two components that use it, so it stays out of the initial bundle.

## Browser surfaces

Themed, because leaving them default is the cheapest tell: text selection (terracotta on paper), the caret, focus rings (terracotta, gold on dark surfaces), scrollbars, underline offset (0.22em), inline `<code>`, and the native date-picker indicator.

## Photography

The header floating over the homepage plate carries its own scrim, so white type and the light logo hold ~9.9:1 whatever the photograph does. Card titles sit in a two-line well (`lines-2`) so inscriptions align across a row, and grids show whole rows (`wholeRows`) rather than leaving one card alone. A category with no photograph of its own borrows one, but claims it, so the same picture never stands for two ideas in one row.

`MediaFrame` is the only component that renders a photograph: fixed ratios, `next/image` with explicit `sizes`, blur-up from a stored placeholder, and an honest empty state — a paper field with the sun mark and the place's name — for anything not yet photographed. Scrims are two-stop gradients so a caption stays legible over a bright frame.

## Components

`Button` / `LinkButton` / `ArrowLink` · `MediaFrame` · `Plate` · `Inscription` · `SectionHead` · `Section` · `RouteLine` · `FactRow` · `Breadcrumbs` · `FaqBlock` (native `<details>`) · `Itinerary` · `DestinationPlot` · `RegionCarousel` · `PageHero` · `ListingHeader` · cards for destination / journey / experience / article · `EnquiryForm` / `EnquiryDialog` (native `<dialog>`) · form fields · admin: `Panel`, `Stat`, `StatusPill`, `EntityList`, `EntityForm`, `RichEditor`, `MediaPicker`, `ChipsInput`.

## Accessibility floor

- Public tap targets ≥ 44px; body text 17px.
- No horizontal overflow from 320px to 1440px (checked on home, destinations, region, journey, plan).
- Keyboard-complete: mega menu, mobile drawer, enquiry dialog, admin editors.
- One H1 per page; the CMS editor offers H2–H4 only and warns on skipped levels.
- Accordions are `<details>`, so answers stay in the HTML and browser find works.

## Refused

Eyebrows and kickers above headings (the hero's inscription is a band inside the frame, not a label over a heading) · gradient text · glassmorphism · hard offset shadows · nested cards · same-size icon-heading-text card grids as page structure · emoji as icons (the importer strips the emoji the old site used in headings) · sketch-style SVG illustration · monospace as costume · section numbers · `feTurbulence` grain · stock "team" photography · any fabricated rating, review count, award or price.
