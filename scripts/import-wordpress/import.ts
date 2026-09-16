/**
 * Step 2 of the migration: build the database from the frozen WordPress export.
 *
 *   npm run wp:import            # idempotent: upserts by slug
 *   npm run wp:import -- --reset # wipe content tables first (never users/enquiries)
 *
 * Reads only docs/migration/{wp-export,html,url-map.csv}. Writes
 * docs/migration/import-report.md listing everything a human must check.
 */
import "dotenv/config";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import * as cheerio from "cheerio";
import type { AnyNode, Element } from "domhandler";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient, Prisma } from "../../src/generated/prisma/client";
import type { ContentStatus, ExperienceFormat, JourneyKind } from "../../src/generated/prisma/enums";
import { elementsToDoc, htmlToDoc } from "../../src/lib/richtext/from-html";
import { docToPlainText, summarize, readingMinutes, stripEmoji } from "../../src/lib/richtext/text";
import type { BlockNode, RichDoc } from "../../src/lib/richtext/types";
import { storeMedia } from "../../src/lib/media/store";
import { normalizePath, normalizeTarget } from "../../src/lib/redirects";
import { toE164 } from "../../src/lib/phone";
import {
  ACTIVITY_FORMAT,
  ARTICLE_CATEGORIES,
  DESTINATIONS,
  EXPERIENCE_THEMES,
  FEATURED_DESTINATIONS,
  FEATURED_JOURNEYS,
  REGIONS,
  TRAVEL_STYLES,
  UNCONFIRMED_CLAIMS,
} from "./reference";

const ROOT = process.cwd();
const MIG = path.join(ROOT, "docs/migration");
const ORIGIN = "https://indiauncharted.com";

const db = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }) });

// ─── report ─────────────────────────────────────────────────────────────────

const report: Record<string, string[]> = {};
function note(section: string, line: string) {
  (report[section] ??= []).push(line);
}

// ─── inputs ─────────────────────────────────────────────────────────────────

type WpRendered = { rendered: string };
type WpMedia = {
  id: number;
  slug: string;
  title: WpRendered;
  caption: WpRendered;
  description: WpRendered;
  alt_text: string;
  mime_type: string;
  source_url: string;
  media_details?: { width?: number; height?: number };
};
type WpPage = {
  id: number;
  date: string;
  modified: string;
  slug: string;
  title: WpRendered;
  content: WpRendered;
  excerpt: WpRendered;
  featured_media: number;
  destination?: number[];
  activity?: number[];
  categories?: number[];
  yoast_head_json?: { description?: string; title?: string; og_image?: { url: string }[] };
};
type WpTerm = { id: number; slug: string; name: string; count: number; description: string };
type UrlRow = { old_url: string; new_url: string; status: string; new_entity: string; experience_themes: string; notes: string };

async function readJson<T>(name: string): Promise<T> {
  return JSON.parse(await readFile(path.join(MIG, "wp-export", `${name}.json`), "utf8")) as T;
}

function parseCsv(text: string): UrlRow[] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i]!;
    if (quoted) {
      if (ch === '"' && text[i + 1] === '"') {
        field += '"';
        i++;
      } else if (ch === '"') quoted = false;
      else field += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === ",") {
      row.push(field);
      field = "";
    } else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && text[i + 1] === "\n") i++;
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else field += ch;
  }
  if (field || row.length) {
    row.push(field);
    rows.push(row);
  }
  const [header, ...data] = rows.filter((r) => r.length > 1);
  return data.map((r) => Object.fromEntries(header!.map((h, i) => [h, r[i] ?? ""])) as UrlRow);
}

async function loadHtml(slug: string): Promise<{ $: cheerio.CheerioAPI; meta: Record<string, string> } | null> {
  const file = path.join(MIG, "html", `${slug.replace(/\//g, "__") || "home"}.html`);
  let raw: string;
  try {
    raw = await readFile(file, "utf8");
  } catch {
    return null;
  }
  const meta: Record<string, string> = {};
  for (const m of raw.matchAll(/<!-- ([a-z:]+): (.*?) -->/g)) meta[m[1]!] = m[2]!;
  const $ = cheerio.load(raw);
  // Old page-builder product cards (with fabricated 5-star ratings) and chrome.
  $(".tour-grid, .tour-card, .custom-tour-card, .ova_head_product, .ova_foot_product, .star-rating, .wp-block-spacer, script, style, noscript, form, iframe").remove();
  return { $, meta };
}

const decode = (s: string) => cheerio.load(`<p>${s}</p>`)("p").text().replace(/\s+/g, " ").trim();

// ─── media ──────────────────────────────────────────────────────────────────

const mediaByKey = new Map<string, string>(); // normalised upload key → Media.id

/** ".../uploads/2026/05/jodq-300x200.jpg" → "2026/05/jodq" */
function uploadKey(url: string): string | null {
  const m = url.match(/wp-content\/uploads\/(.+?)(?:-\d{2,4}x\d{2,4})?(?:-scaled)?\.(?:jpe?g|png|webp|gif)(?:\.(?:jpe?g|png|webp))?$/i);
  return m ? m[1]!.toLowerCase() : null;
}

function meaningfulAlt(alt: string | null | undefined): string {
  const a = (alt ?? "").trim();
  if (!a) return "";
  if (a.split(/\s+/).length < 3) return "";
  if (/\.(jpe?g|png|webp)|\bcopy\b|untitled|^image\s*\d*$|^img[_-]?\d+/i.test(a)) return "";
  return a;
}

function aiNamed(url: string) {
  return /chatgpt-image|dall-?e|midjourney|untitled-design/i.test(url);
}

async function importMediaFile(url: string, alt: string, extra: Partial<{ title: string; caption: string; description: string }> = {}) {
  const key = uploadKey(url);
  if (key && mediaByKey.has(key)) return mediaByKey.get(key)!;
  const existing = await db.media.findFirst({ where: { sourceUrl: url }, select: { id: true } });
  if (existing) {
    if (key) mediaByKey.set(key, existing.id);
    return existing.id;
  }
  const res = await fetch(url, { headers: { "User-Agent": "IndiaUncharted-Migration/1.0" } });
  if (!res.ok) {
    note("Media that failed to download", `${url} → HTTP ${res.status}`);
    return null;
  }
  const buffer = Buffer.from(await res.arrayBuffer());
  const filename = decodeURIComponent(url.split("/").pop() ?? "image");
  let stored;
  try {
    stored = await storeMedia(buffer, { filename, folder: "wp" });
  } catch (err) {
    note("Media that failed to process", `${url} → ${(err as Error).message}`);
    return null;
  }
  const dup = await db.media.findUnique({ where: { sha256: stored.sha256 }, select: { id: true } });
  if (dup) {
    if (key) mediaByKey.set(key, dup.id);
    return dup.id;
  }
  const altText = meaningfulAlt(alt);
  const isAi = aiNamed(url);
  const media = await db.media.create({
    data: {
      ...stored,
      altText,
      title: extra.title || null,
      caption: extra.caption || null,
      description: extra.description || null,
      credit: isAi ? "Filename suggests an AI-generated image — confirm or replace before launch" : null,
      licence: "UNKNOWN",
      folder: "wp",
      sourceUrl: url,
    },
    select: { id: true },
  });
  if (key) mediaByKey.set(key, media.id);
  if (!altText) note("Images missing meaningful alt text", `${filename}`);
  if (isAi) note("Images whose filename suggests AI generation", filename);
  return media.id;
}

async function mediaForUrl(url: string | undefined | null, alt = ""): Promise<string | null> {
  if (!url || !/wp-content\/uploads\//.test(url)) return null;
  const key = uploadKey(url);
  if (key && mediaByKey.has(key)) return mediaByKey.get(key)!;
  // Prefer the original (unsized) file.
  const original = url.replace(/-\d{2,4}x\d{2,4}(?=\.(?:jpe?g|png|webp))/i, "");
  return importMediaFile(original, alt);
}

// ─── seo helpers ────────────────────────────────────────────────────────────

async function createSeo(data: { metaDescription?: string | null; focusKeyword?: string | null }) {
  const desc = data.metaDescription?.trim();
  const seo = await db.seoMeta.create({
    data: { metaDescription: desc || null, focusKeyword: data.focusKeyword ?? null },
    select: { id: true },
  });
  return seo.id;
}

async function ensureSeo(existingSeoId: string | null | undefined, data: { metaDescription?: string | null; focusKeyword?: string | null }) {
  if (existingSeoId) {
    await db.seoMeta.update({
      where: { id: existingSeoId },
      data: { metaDescription: data.metaDescription?.trim() || undefined, focusKeyword: data.focusKeyword ?? undefined },
    });
    return existingSeoId;
  }
  return createSeo(data);
}

// ─── content parsing ────────────────────────────────────────────────────────

type SectionKey = "overview" | "itinerary" | "highlights" | "inclusions" | "exclusions" | "why" | "besttime" | "idealfor" | "packages" | "extra";

function classifyHeading(text: string): SectionKey | null {
  const t = stripEmoji(text).toLowerCase();
  if (/^(tour|trip|retreat|course|package|program(me)?)?\s*overview\b/.test(t)) return "overview";
  if (/itinerary|day[- ]by[- ]day|daily schedule|course schedule|^detailed .*(experience|tour)|what to expect/.test(t)) return "itinerary";
  if (/^([\w&'’-]+\s){0,3}highlights$/.test(t)) return "highlights";
  if (/^ideal for$/.test(t)) return "idealfor";
  if (/exclusion|excludes|not included/.test(t)) return "exclusions";
  if (/inclusion|includes|what'?s included/.test(t)) return "inclusions";
  if (/^why (choose|book|this)/.test(t)) return "why";
  if (/^best time/.test(t)) return "besttime";
  if (/popular tour packages|related (tours|packages)|you may also like/.test(t)) return "packages";
  return null;
}

type Parsed = {
  title: string;
  intro: AnyNode[];
  facts: Record<string, string>;
  itinerary: { heading: string; nodes: AnyNode[] }[];
  highlights: string[];
  inclusions: string[];
  exclusions: string[];
  why: string[];
  bestTime: AnyNode[];
  extra: { heading: string; nodes: AnyNode[] }[];
  images: { src: string; alt: string }[];
};

/** Flatten page-builder wrappers into a list of block-level elements in document order. */
function flattenBlocks($: cheerio.CheerioAPI, root: AnyNode[]): Element[] {
  const out: Element[] = [];
  const walk = (nodes: AnyNode[]) => {
    for (const n of nodes) {
      if (n.type !== "tag") continue;
      const el = n as Element;
      const tag = el.tagName.toLowerCase();
      if (/^h[1-6]$/.test(tag) || ["p", "ul", "ol", "table", "blockquote", "img"].includes(tag)) out.push(el);
      else walk(el.children as AnyNode[]);
    }
  };
  walk(root);
  return out;
}

function listItems($: cheerio.CheerioAPI, nodes: AnyNode[]): string[] {
  const items: string[] = [];
  for (const n of nodes) {
    const $n = $(n);
    if ($n.is("ul,ol")) $n.children("li").each((_, li) => void items.push(stripEmoji($(li).text().replace(/\s+/g, " ").trim())));
    else if ($n.is("p")) {
      // "✔ item<br>✔ item" style lists
      const parts = ($n.html() ?? "")
        .split(/<br\s*\/?>/i)
        .map((p) => stripEmoji(decode(p.replace(/<[^>]+>/g, " "))).replace(/^[-–•✓✔]\s*/, "").trim())
        .filter(Boolean);
      items.push(...parts);
    }
  }
  return items.filter((s) => s.length > 1);
}

function parseFacts($: cheerio.CheerioAPI, nodes: AnyNode[]): Record<string, string> {
  const facts: Record<string, string> = {};
  const text = nodes
    .map((n) => {
      const html = $(n).html() ?? $(n).text();
      return html.replace(/<br\s*\/?>/gi, "\n").replace(/<\/(p|li)>/gi, "\n");
    })
    .join("\n");
  for (const rawLine of decode(text.replace(/\n/g, " ⏎ ")).split("⏎")) {
    const line = rawLine.trim();
    const m = line.match(/^([A-Za-z &/]+?)\s*:\s*(.+)$/);
    if (m) facts[m[1]!.trim().toLowerCase()] = m[2]!.trim();
  }
  return facts;
}

const looseTitle = (t: string) => stripEmoji(t).toLowerCase().replace(/[^a-z0-9]+/g, "");

function parseContent($: cheerio.CheerioAPI, knownTitle?: string): Parsed {
  const root = $("#Content .entry-content").first();
  const container = root.length ? root : $("#Content").first();
  const blocks = flattenBlocks($, container.contents().toArray());
  const parsed: Parsed = {
    title: knownTitle ?? "",
    intro: [],
    facts: {},
    itinerary: [],
    highlights: [],
    inclusions: [],
    exclusions: [],
    why: [],
    bestTime: [],
    extra: [],
    images: [],
  };

  let section: SectionKey | "intro" = "intro";
  let bucket: AnyNode[] = parsed.intro;
  const sectionNodes: Partial<Record<SectionKey, AnyNode[]>> = {};

  for (const el of blocks) {
    const tag = el.tagName.toLowerCase();
    if (tag === "img") {
      const src = $(el).attr("src");
      if (src) parsed.images.push({ src, alt: $(el).attr("alt") ?? "" });
      continue;
    }
    if (/^h[1-6]$/.test(tag)) {
      const text = stripEmoji($(el).text().replace(/\s+/g, " ").trim());
      if (!text) continue;
      if (!parsed.title) {
        parsed.title = text;
        continue;
      }
      if (looseTitle(text) === looseTitle(parsed.title)) continue;
      const key = classifyHeading(text);
      if (key && key !== "extra") {
        section = key;
        bucket = sectionNodes[key] ??= [];
        continue;
      }
      if (section === "itinerary") {
        const day = { heading: text, nodes: [] as AnyNode[] };
        parsed.itinerary.push(day);
        bucket = day.nodes;
        continue;
      }
      if (section === "packages") continue;
      const extra = { heading: text, nodes: [] as AnyNode[] };
      parsed.extra.push(extra);
      section = "extra";
      bucket = extra.nodes;
      continue;
    }
    if (section === "packages") continue;
    bucket.push(el);
  }

  parsed.facts = parseFacts($, sectionNodes.overview ?? []);
  // Some pages put facts straight into the intro block.
  if (!Object.keys(parsed.facts).length) {
    const introFacts = parseFacts($, parsed.intro);
    if (introFacts["duration"]) {
      parsed.facts = introFacts;
      parsed.intro = parsed.intro.filter((n) => !/:\s*/.test($(n).find("strong,b").first().text()));
    }
  }
  parsed.highlights = listItems($, sectionNodes.highlights ?? []);
  parsed.inclusions = listItems($, sectionNodes.inclusions ?? []);
  parsed.exclusions = listItems($, sectionNodes.exclusions ?? []);
  parsed.why = listItems($, sectionNodes.why ?? []);
  parsed.bestTime = sectionNodes.besttime ?? [];
  const idealFor = sectionNodes.idealfor?.map((n) => $(n).text().replace(/\s+/g, " ").trim()).filter(Boolean).join(", ");
  if (idealFor && !parsed.facts["ideal for"]) parsed.facts["ideal for"] = idealFor;
  // Itinerary with no sub-headings: keep as one block.
  if (!parsed.itinerary.length && sectionNodes.itinerary?.length) {
    parsed.itinerary.push({ heading: "Itinerary", nodes: sectionNodes.itinerary });
  }
  return parsed;
}

function nodesToDoc($: cheerio.CheerioAPI, nodes: AnyNode[]): RichDoc | null {
  if (!nodes.length) return null;
  const doc = elementsToDoc($, nodes, { rewriteLink, rewriteImage: () => null });
  return doc.content.length ? doc : null;
}

function extraToDoc($: cheerio.CheerioAPI, extras: { heading: string; nodes: AnyNode[] }[]): RichDoc | null {
  const content: BlockNode[] = [];
  for (const e of extras) {
    const body = nodesToDoc($, e.nodes);
    if (!body) continue;
    content.push({ type: "heading", attrs: { level: 2 }, content: [{ type: "text", text: e.heading }] });
    content.push(...body.content);
  }
  return content.length ? { type: "doc", content } : null;
}

function plainOf($: cheerio.CheerioAPI, nodes: AnyNode[]): string | null {
  const t = nodes
    .map((n) => $(n).text().replace(/\s+/g, " ").trim())
    .filter(Boolean)
    .join("\n\n");
  return t || null;
}

function parseDuration(value: string | undefined) {
  if (!value) return { days: null as number | null, nights: null as number | null };
  const d = value.match(/(\d+)[\s-]*days?/i);
  const n = value.match(/(\d+)[\s-]*nights?/i);
  return { days: d ? Number(d[1]) : null, nights: n ? Number(n[1]) : null };
}

// ─── links ──────────────────────────────────────────────────────────────────

const linkMap = new Map<string, string>(); // normalised old path → new path

function rewriteLink(href: string): string | null {
  if (!href) return null;
  if (/^(mailto:|tel:|#)/i.test(href)) return href;
  try {
    const url = new URL(href, ORIGIN);
    if (url.hostname.replace(/^www\./, "") !== "indiauncharted.com") return url.toString();
    const mapped = linkMap.get(normalizePath(url.pathname));
    return mapped ?? normalizePath(url.pathname);
  } catch {
    return null;
  }
}

// ─── main ───────────────────────────────────────────────────────────────────

async function resetContent() {
  const tables = [
    "Section", "RelatedLink", "FaqAssignment", "Faq", "MediaUsage", "CustomMetaTag", "Redirect",
    "ArticleTag", "ArticleExperience", "ArticleJourney", "ArticleDestination", "Article", "Author",
    "ExperienceTag", "JourneyExperience", "ExperienceTheme", "ExperienceStep", "Experience",
    "JourneyStyle", "BikeTourDetail", "ItineraryDay", "JourneyStop", "Journey",
    "Vehicle", "Service", "Testimonial", "DestinationHighlight", "Destination", "Region",
    "Category", "Tag", "Page", "NavigationItem", "NavigationMenu", "SeoMeta", "Media",
  ];
  await db.$executeRawUnsafe(`TRUNCATE ${tables.map((t) => `"${t}"`).join(", ")} RESTART IDENTITY CASCADE`);
}

async function main() {
  const args = new Set(process.argv.slice(2));
  if (args.has("--reset")) {
    await resetContent();
    console.log("content tables reset");
  }

  const [posts, pages, media, destTerms, activityTerms] = await Promise.all([
    readJson<WpPage[]>("posts"),
    readJson<WpPage[]>("pages"),
    readJson<WpMedia[]>("media"),
    readJson<WpTerm[]>("destination"),
    readJson<WpTerm[]>("activity"),
  ]);
  const urlRows = parseCsv(await readFile(path.join(MIG, "url-map.csv"), "utf8"));
  for (const r of urlRows) {
    if (r.new_url && r.status !== "410") linkMap.set(normalizePath(r.old_url), normalizeTarget(r.new_url));
  }
  const rowByOld = new Map(urlRows.map((r) => [normalizePath(r.old_url), r]));

  // Media library ----------------------------------------------------------
  const mediaById = new Map<number, string>();
  let mi = 0;
  for (const m of media) {
    if (!m.mime_type.startsWith("image/")) continue;
    if (/icons8-|agriculture|testimonial-background|\/ind-chr/i.test(m.source_url)) {
      note("Theme images not imported as content", decodeURIComponent(m.source_url.split("/").pop() ?? ""));
      continue;
    }
    const id = await importMediaFile(m.source_url, m.alt_text, {
      title: decode(m.title.rendered),
      caption: decode(m.caption.rendered),
      description: decode(m.description.rendered.replace(/<p class="attachment">.*?<\/p>/s, "")),
    });
    if (id) mediaById.set(m.id, id);
    if (++mi % 20 === 0) console.log(`media ${mi}/${media.length}`);
  }
  console.log(`media ${mediaById.size} imported`);

  // Taxonomy -----------------------------------------------------------------
  const categoryId = new Map<string, string>();
  const upsertCategory = async (type: "TRAVEL_STYLE" | "EXPERIENCE_THEME" | "ARTICLE_CATEGORY", slug: string, name: string, sortOrder: number) => {
    const c = await db.category.upsert({
      where: { type_slug: { type, slug } },
      create: { type, slug, name, sortOrder, status: "PUBLISHED", seoId: await createSeo({}) },
      update: { name, sortOrder },
      select: { id: true },
    });
    categoryId.set(`${type}:${slug}`, c.id);
  };
  for (const [i, c] of TRAVEL_STYLES.entries()) await upsertCategory("TRAVEL_STYLE", c.slug, c.name, i);
  for (const [i, c] of EXPERIENCE_THEMES.entries()) await upsertCategory("EXPERIENCE_THEME", c.slug, c.name, i);
  for (const [i, c] of ARTICLE_CATEGORIES.entries()) await upsertCategory("ARTICLE_CATEGORY", c.slug, c.name, i);

  // Regions ------------------------------------------------------------------
  const regionId = new Map<string, string>();
  for (const r of REGIONS) {
    const hasContent = DESTINATIONS.some((d) => d.region === r.slug);
    const existing = await db.region.findUnique({ where: { slug: r.slug }, select: { id: true, seoId: true } });
    const status: ContentStatus = hasContent ? "PUBLISHED" : "DRAFT";
    const data = { name: r.name, tagline: r.tagline, mapKey: r.mapKey, sortOrder: r.sortOrder, status, publishedAt: hasContent ? new Date() : null };
    const row = existing
      ? await db.region.update({ where: { id: existing.id }, data, select: { id: true } })
      : await db.region.create({ data: { slug: r.slug, ...data, seoId: await createSeo({}) }, select: { id: true } });
    regionId.set(r.slug, row.id);
  }

  // Destinations -------------------------------------------------------------
  const destTermToSlug = new Map<number, string>();
  const destinationId = new Map<string, string>();
  const destinationIdByName = new Map<string, string>();
  const productCount = new Map<string, number>();
  for (const t of destTerms) {
    const ref = DESTINATIONS.find((d) => d.wpSlugs.includes(t.slug));
    if (!ref) {
      note("Unmapped WordPress destination terms", `${t.slug} (${t.count} items)`);
      continue;
    }
    destTermToSlug.set(t.id, ref.slug);
    productCount.set(ref.slug, (productCount.get(ref.slug) ?? 0) + t.count);
  }
  const homeHtml = await loadHtml("home");
  const destinationsHtml = await loadHtml("destinations");

  for (const [i, ref] of DESTINATIONS.entries()) {
    const landing = await loadHtml(`${ref.slug === "khichan" || ref.slug === "jispa" ? "__none__" : ref.slug}-tour-packages`);
    const archive = await loadHtml(`destination__${ref.wpSlugs[0]}`);
    let intro: RichDoc | null = null;
    let whyVisit: RichDoc | null = null;
    let metaDescription: string | null = null;
    let landingImage: { src: string; alt: string } | undefined;
    if (landing) {
      const p = parseContent(landing.$, `${ref.name} Tour Packages`);
      landingImage = p.images[0];
      intro = nodesToDoc(landing.$, p.intro);
      const why = p.extra.find((e) => /^why visit/i.test(e.heading));
      whyVisit = why ? nodesToDoc(landing.$, why.nodes) : null;
      const rest = p.extra.filter((e) => e !== why);
      if (rest.length) note("Destination landing sections kept as extra copy", `${ref.slug}: ${rest.map((e) => e.heading).join(" · ")}`);
      metaDescription = landing.meta["description"] || null;
    }
    const term = destTerms.find((t) => ref.wpSlugs.includes(t.slug));
    if (!intro && term?.description) intro = htmlToDoc(term.description, { rewriteLink });
    if (!metaDescription && archive?.meta["description"]) metaDescription = archive.meta["description"];

    const count = productCount.get(ref.slug) ?? 0;
    // Hero: the landing page's own image, else the old "Top Destinations" / destinations tile.
    let heroId: string | null = landingImage ? await mediaForUrl(landingImage.src, landingImage.alt) : null;
    for (const source of [homeHtml, destinationsHtml]) {
      if (heroId || !source) continue;
      const tile = source.$(`a[href*="/destination/${ref.wpSlugs[0]}/"] img, a[href*="/${ref.slug}-tour-packages/"] img`).first();
      if (tile.length) heroId = await mediaForUrl(tile.attr("src"), tile.attr("alt") ?? "");
    }
    if (!heroId && count > 0) note("Published destinations with no hero image", ref.name);

    const status: ContentStatus = count > 0 ? "PUBLISHED" : "DRAFT";
    if (!count) note("Destinations kept as DRAFT (no products)", ref.name);
    if (ref.note) note("Destination names to confirm with the client", ref.note);
    if (!intro && !whyVisit && count > 0) note("Published destinations with no descriptive copy yet", ref.name);

    const existing = await db.destination.findUnique({ where: { slug: ref.slug }, select: { id: true, seoId: true } });
    const data = {
      name: ref.name,
      title: ref.title ?? null,
      type: ref.type,
      state: ref.state,
      regionId: regionId.get(ref.region) ?? null,
      latitude: ref.lat,
      longitude: ref.lng,
      intro: intro ?? Prisma.DbNull,
      whyVisit: whyVisit ?? Prisma.DbNull,
      shortDescription: intro ? summarize(docToPlainText(intro).split("\n")[0]!, 280) : null,
      isOffbeat: Boolean(ref.offbeat),
      isFeatured: FEATURED_DESTINATIONS.includes(ref.slug),
      heroId,
      status,
      publishedAt: status === "PUBLISHED" ? new Date() : null,
      sortOrder: i,
    };
    const seoId = await ensureSeo(existing?.seoId, { metaDescription });
    const row = existing
      ? await db.destination.update({ where: { id: existing.id }, data: { ...data, seoId }, select: { id: true } })
      : await db.destination.create({ data: { slug: ref.slug, ...data, seoId }, select: { id: true } });
    destinationId.set(ref.slug, row.id);
    destinationIdByName.set(ref.name.toLowerCase(), row.id);
  }
  for (const ref of DESTINATIONS) {
    if (!ref.parent) continue;
    await db.destination.update({ where: { slug: ref.slug }, data: { parentId: destinationId.get(ref.parent)! } });
  }
  console.log(`destinations ${destinationId.size}`);

  // Journeys & experiences ---------------------------------------------------
  const pageBySlug = new Map(pages.map((p) => [p.slug, p]));
  const activityById = new Map(activityTerms.map((a) => [a.id, a.slug]));
  const journeyIds: string[] = [];
  const experienceIds: string[] = [];

  function destinationIdsFromText(text: string | undefined): string[] {
    if (!text) return [];
    const found: { id: string; at: number }[] = [];
    for (const d of DESTINATIONS) {
      const names = [d.name, ...(d.slug === "ranthambore" ? ["Ranthambhore"] : []), ...(d.slug === "leh" ? ["Leh-Ladakh", "Ladakh"] : [])];
      for (const n of names) {
        const at = text.toLowerCase().indexOf(n.toLowerCase());
        if (at >= 0) {
          found.push({ id: destinationId.get(d.slug)!, at });
          break;
        }
      }
    }
    return [...new Map(found.sort((a, b) => a.at - b.at).map((f) => [f.id, f])).keys()];
  }

  for (const row of urlRows) {
    const kindMatch = row.new_entity.match(/^Journey \((\w+)\)$/);
    const isExperience = row.new_entity === "Experience";
    if (!kindMatch && !isExperience) continue;
    const slug = normalizePath(row.old_url).slice(1);
    const wp = pageBySlug.get(slug);
    const html = await loadHtml(slug);
    if (!wp || !html) {
      note("Products that could not be parsed", `${slug}: missing export or HTML`);
      continue;
    }
    const { $ } = html;
    const name = decode(wp.title.rendered);
    const p = parseContent($, name);
    const intro = nodesToDoc($, p.intro);
    const bestTime = plainOf($, p.bestTime);
    const extras = extraToDoc($, p.extra);
    const heroId = (wp.featured_media && mediaById.get(wp.featured_media)) || (p.images[0] ? await mediaForUrl(p.images[0].src, p.images[0].alt) : null);
    if (!heroId) note("Products with no hero image", name);
    const metaDescription = html.meta["description"] || null;
    const facts = p.facts;
    const termDestIds = (wp.destination ?? []).map((id) => destTermToSlug.get(id)).filter(Boolean).map((s) => destinationId.get(s!)!);
    const newSlug = normalizeTarget(row.new_url).split("/").pop()!;

    if (!Object.keys(facts).length) note("Products with no overview facts parsed", name);
    if (!p.inclusions.length) note("Products with no inclusions parsed", name);
    if (!p.exclusions.length) note("Products with no exclusions parsed", name);

    if (kindMatch) {
      const kind = kindMatch[1] as JourneyKind;
      const { days, nights } = parseDuration(facts["duration"] ?? name);
      const coveredText = facts["destinations covered"] ?? facts["destination covered"] ?? facts["destinations"] ?? facts["route"] ?? facts["location"];
      // Order stops by where each place first appears in the day-by-day plan, then the overview.
      const sequenceText = [
        ...p.itinerary.map((d) => d.heading),
        ...p.itinerary.map((d) => plainOf($, d.nodes) ?? ""),
        coveredText ?? "",
      ].join(" \n ");
      const candidates = [...new Set([...destinationIdsFromText(coveredText), ...termDestIds])];
      const firstAt = (id: string) => {
        const ref = DESTINATIONS.find((d) => destinationId.get(d.slug) === id)!;
        const at = sequenceText.toLowerCase().indexOf(ref.name.toLowerCase());
        return at < 0 ? Number.MAX_SAFE_INTEGER : at;
      };
      // A parent place (Kashmir, Himachal Pradesh, Leh) is not a stop when one of its children is.
      const childParents = new Set(
        candidates.map((id) => DESTINATIONS.find((d) => destinationId.get(d.slug) === id)?.parent).filter(Boolean) as string[],
      );
      const orderedStops = candidates
        .filter((id) => {
          const ref = DESTINATIONS.find((d) => destinationId.get(d.slug) === id)!;
          return !(childParents.has(ref.slug) && ref.type !== "TOWN");
        })
        .sort((a, b) => firstAt(a) - firstAt(b));
      if (!coveredText) note("Journeys whose route order was inferred from the itinerary text", name);

      const existing = await db.journey.findUnique({ where: { slug: newSlug }, select: { id: true, seoId: true } });
      const data = {
        name,
        kind,
        days,
        nights,
        durationLabel: days ? null : facts["duration"] ?? null,
        shortDescription: intro ? summarize(docToPlainText(intro).split("\n")[0]!, 300) : null,
        overview: intro ?? Prisma.DbNull,
        idealFor: facts["ideal for"] ?? null,
        tourType: facts["tour type"] ?? null,
        pickupDrop: facts["pickup & drop"] ?? facts["pickup and drop"] ?? facts["pickup"] ?? null,
        highlights: p.highlights,
        inclusions: p.inclusions,
        exclusions: p.exclusions,
        whyChoose: p.why,
        bestTime,
        practicalInfo: extras ?? Prisma.DbNull,
        quoteOnly: true,
        priceFromInr: null,
        isFeatured: FEATURED_JOURNEYS.includes(slug),
        heroId,
        status: "PUBLISHED" as const,
        publishedAt: new Date(wp.date),
      };
      const seoId = await ensureSeo(existing?.seoId, { metaDescription });
      const j = existing
        ? await db.journey.update({ where: { id: existing.id }, data: { ...data, seoId }, select: { id: true } })
        : await db.journey.create({ data: { slug: newSlug, ...data, seoId, sortOrder: journeyIds.length }, select: { id: true } });
      journeyIds.push(j.id);

      await db.journeyStop.deleteMany({ where: { journeyId: j.id } });
      await db.journeyStop.createMany({ data: orderedStops.map((destinationId, i) => ({ journeyId: j.id, destinationId, sortOrder: i })) });

      await db.itineraryDay.deleteMany({ where: { journeyId: j.id } });
      let seq = 0;
      for (const day of p.itinerary) {
        seq++;
        const m = day.heading.match(/^days?\s*(\d+)(?:\s*[–—-]\s*(\d+))?\s*(?:[:–—-]\s*)?(.*)$/i);
        const dayNumber = m ? Number(m[1]) : seq;
        const dayEnd = m?.[2] ? Number(m[2]) : null;
        const title = (m ? m[3] : day.heading)?.trim() || `Day ${dayNumber}`;
        const body = nodesToDoc($, day.nodes);
        const overnight = body ? docToPlainText(body).match(/overnight(?: stay)?(?: at| in)? ([A-Z][a-zA-Z]+)/) : null;
        await db.itineraryDay.create({
          data: {
            journeyId: j.id,
            dayNumber,
            dayEnd,
            title,
            body: body ?? Prisma.DbNull,
            overnightDestinationId: overnight ? destinationIdByName.get(overnight[1]!.toLowerCase()) ?? null : null,
            sortOrder: seq,
          },
        });
      }
      if (!p.itinerary.length && kind !== "COURSE") note("Journeys with no day-by-day itinerary parsed", name);

      if (kind === "BIKE_TOUR") {
        await db.bikeTourDetail.upsert({ where: { journeyId: j.id }, create: { journeyId: j.id }, update: {} });
        note("Bike tours missing riding specs (distance, terrain, difficulty, support vehicle, bike)", name);
      }

      // Travel styles from the client's own naming — never guessed beyond the words used.
      const titleHay = `${slug} ${name} ${facts["tour type"] ?? ""}`.toLowerCase();
      const hay = `${titleHay} ${facts["ideal for"] ?? ""}`.toLowerCase();
      const styles = new Set<string>();
      if (/private/i.test(facts["tour type"] ?? "")) styles.add("private");
      if (/luxury/.test(titleHay)) styles.add("luxury");
      if (/family|families/.test(hay)) styles.add("family");
      if (/honeymoon|romantic/.test(hay)) styles.add("honeymoon");
      if (/wildlife|bird|safari/.test(hay)) styles.add("wildlife");
      if (/yoga|wellness|ayurved|meditation/.test(hay)) styles.add("wellness-ayurveda");
      if (/food|culinary/.test(hay)) styles.add("food-culture");
      if (/adventure|paraglid|motorcycle|royal enfield/.test(hay)) styles.add("adventure");
      if (kind === "BIKE_TOUR") styles.add("motorcycle");
      if (/group tour|student|educational/.test(titleHay)) styles.add("group-educational");
      await db.journeyStyle.deleteMany({ where: { journeyId: j.id } });
      await db.journeyStyle.createMany({ data: [...styles].map((s) => ({ journeyId: j.id, categoryId: categoryId.get(`TRAVEL_STYLE:${s}`)! })) });
    } else {
      const activitySlug = (wp.activity ?? []).map((id) => activityById.get(id)).find(Boolean);
      const format = (activitySlug && ACTIVITY_FORMAT[activitySlug]) || "OTHER";
      const destId = termDestIds[0] ?? destinationIdsFromText(name)[0] ?? null;
      const existing = await db.experience.findUnique({ where: { slug: newSlug }, select: { id: true, seoId: true } });
      const data = {
        name,
        format: format as ExperienceFormat,
        destinationId: destId,
        location: facts["destination covered"] ?? facts["destinations covered"] ?? facts["location"] ?? facts["starting point"] ?? null,
        duration: facts["duration"] ?? null,
        bestTime,
        shortDescription: intro ? summarize(docToPlainText(intro).split("\n")[0]!, 300) : null,
        overview: intro ?? Prisma.DbNull,
        thingsToKnow: extras ?? Prisma.DbNull,
        pickupDrop: facts["pickup & drop"] ?? facts["pickup and drop"] ?? facts["pickup"] ?? null,
        idealFor: facts["ideal for"] ?? null,
        tourType: facts["tour type"] ?? null,
        highlights: p.highlights,
        inclusions: p.inclusions,
        exclusions: p.exclusions,
        quoteOnly: true,
        heroId,
        status: "PUBLISHED" as const,
        publishedAt: new Date(wp.date),
      };
      const seoId = await ensureSeo(existing?.seoId, { metaDescription });
      const e = existing
        ? await db.experience.update({ where: { id: existing.id }, data: { ...data, seoId }, select: { id: true } })
        : await db.experience.create({ data: { slug: newSlug, ...data, seoId, sortOrder: experienceIds.length }, select: { id: true } });
      experienceIds.push(e.id);

      await db.experienceStep.deleteMany({ where: { experienceId: e.id } });
      await db.experienceStep.createMany({
        data: p.itinerary.map((step, i) => ({
          experienceId: e.id,
          title: step.heading.replace(/^\d+\.\s*/, ""),
          body: nodesToDoc($, step.nodes) ? docToPlainText(nodesToDoc($, step.nodes)) : null,
          sortOrder: i,
        })),
      });

      const themes = (rowByOld.get(normalizePath(row.old_url))?.experience_themes ?? "").split(";").filter(Boolean);
      await db.experienceTheme.deleteMany({ where: { experienceId: e.id } });
      await db.experienceTheme.createMany({
        data: themes.map((t, i) => ({ experienceId: e.id, categoryId: categoryId.get(`EXPERIENCE_THEME:${t}`)!, isPrimary: i === 0 })),
      });
    }
  }
  console.log(`journeys ${journeyIds.length}, experiences ${experienceIds.length}`);

  // Journeys ↔ experiences in the same destination (automatic, editable later).
  // Left to the admin "suggested relations" flow rather than asserted here.

  // Articles -----------------------------------------------------------------
  const author = await db.author.upsert({
    where: { slug: "india-uncharted" },
    create: { slug: "india-uncharted", name: "India Uncharted", bio: null },
    update: {},
  });
  for (const [i, post] of posts.entries()) {
    const title = decode(post.title.rendered);
    const body = htmlToDoc(post.content.rendered, {
      rewriteLink,
      rewriteImage: (src, alt) => {
        const key = uploadKey(src);
        const id = key ? mediaByKey.get(key) : null;
        return id ? { src, alt: meaningfulAlt(alt), mediaId: id } : null;
      },
    });
    // Re-point inline images at stored media URLs.
    for (const node of body.content) {
      if (node.type === "image" && node.attrs.mediaId) {
        const m = await db.media.findUnique({ where: { id: node.attrs.mediaId }, select: { url: true, altText: true } });
        if (m) node.attrs = { ...node.attrs, src: m.url, alt: node.attrs.alt || m.altText };
      }
    }
    const kind = /\bguide\b/i.test(title) ? "GUIDE" : "BLOG";
    const categorySlug = /yoga|wellness|ayurved|retreat/i.test(title) ? "yoga-wellness" : /hotel|stay/i.test(title) ? "stays" : "destination-guides";
    const heroId = post.featured_media ? mediaById.get(post.featured_media) ?? null : null;
    const excerpt = decode(post.excerpt.rendered).replace(/\s*\[…\]$|\s*\[&hellip;\]$/, "…");
    const existing = await db.article.findUnique({ where: { slug: post.slug }, select: { id: true, seoId: true } });
    const data = {
      title,
      kind: kind as "GUIDE" | "BLOG",
      excerpt: excerpt || null,
      body,
      authorId: author.id,
      categoryId: categoryId.get(`ARTICLE_CATEGORY:${categorySlug}`) ?? null,
      readingMinutes: readingMinutes(body),
      heroId,
      status: "PUBLISHED" as const,
      publishedAt: new Date(post.date),
      contentUpdatedAt: new Date(post.modified),
      sortOrder: i,
    };
    const seoId = await ensureSeo(existing?.seoId, { metaDescription: post.yoast_head_json?.description ?? null });
    const a = existing
      ? await db.article.update({ where: { id: existing.id }, data: { ...data, seoId }, select: { id: true } })
      : await db.article.create({ data: { slug: post.slug, ...data, seoId }, select: { id: true } });
    const destIds = destinationIdsFromText(`${title} ${docToPlainText(body).slice(0, 1500)}`).slice(0, 4);
    await db.articleDestination.deleteMany({ where: { articleId: a.id } });
    await db.articleDestination.createMany({ data: destIds.map((destinationId) => ({ articleId: a.id, destinationId })) });
    if (!heroId) note("Articles with no featured image", title);
  }
  console.log(`articles ${posts.length}`);

  // Transfers service --------------------------------------------------------
  const transfers = await loadHtml("transfers");
  if (transfers) {
    const { $ } = transfers;
    const shortDescription =
      $(".hero-left p, .hero p")
        .toArray()
        .map((el) => $(el).text().replace(/\s+/g, " ").trim())
        .find((t) => t.length > 60) ?? null;
    const features = [...new Set($(".ticker-item").toArray().map((el) => $(el).text().replace(/\s+/g, " ").trim()))].filter(Boolean);
    const fleetIntro = $(".fleet-head-right p").first().text().replace(/\s+/g, " ").trim();
    const benefits = $("h3")
      .toArray()
      .map((el) => $(el).text().replace(/\s+/g, " ").trim())
      .filter((t) => t && !UNCONFIRMED_CLAIMS.some((re) => re.test(t)));
    $("h3")
      .toArray()
      .map((el) => $(el).text().trim())
      .filter((t) => UNCONFIRMED_CLAIMS.some((re) => re.test(t)))
      .forEach((t) => note("Claims held back until the client confirms", `Transfers: "${t}"`));
    note("Claims held back until the client confirms", 'Transfers hero stats: "6+ Vehicles", "24/7 Support", "17 Max Seats", "100% Verified", "Trusted By Travelers Across India"');

    const existing = await db.service.findUnique({ where: { slug: "transfers" }, select: { id: true, seoId: true } });
    const data = {
      name: "Taxi & Transfers",
      shortDescription,
      description: fleetIntro ? { type: "doc", content: [{ type: "paragraph", content: [{ type: "text", text: fleetIntro }] }] } : Prisma.DbNull,
      features,
      benefits,
      status: "PUBLISHED" as const,
      publishedAt: new Date(),
      sortOrder: 0,
    };
    const seoId = await ensureSeo(existing?.seoId, { metaDescription: transfers.meta["description"] || null });
    const svc = existing
      ? await db.service.update({ where: { id: existing.id }, data: { ...data, seoId }, select: { id: true } })
      : await db.service.create({ data: { slug: "transfers", ...data, seoId }, select: { id: true } });

    await db.vehicle.deleteMany({ where: { serviceId: svc.id } });
    const cards = $(".v-card").toArray();
    for (const [i, card] of cards.entries()) {
      const $c = $(card);
      const vName = $c.find(".v-name").text().trim();
      if (!vName) continue;
      const seats = $c.find(".v-cap").text().match(/(\d+)/);
      const img = $c.find("img").first();
      const mediaId = await mediaForUrl(img.attr("src"), img.attr("alt") ?? vName);
      await db.vehicle.create({
        data: {
          serviceId: svc.id,
          name: vName,
          class: $c.find(".v-type").text().replace(/\s+/g, " ").trim() || null,
          seats: seats ? Number(seats[1]) : null,
          features: $c.find(".chip").toArray().map((el) => $(el).text().trim()).filter(Boolean),
          mediaId,
          sortOrder: i,
        },
      });
    }
    console.log(`vehicles ${cards.length}`);
  }

  // Pages --------------------------------------------------------------------
  const about = await loadHtml("about-us");
  let aboutBody: RichDoc | null = null;
  let aboutIntro: string | null = null;
  if (about) {
    const p = parseContent(about.$);
    const all = [...p.intro, ...p.extra.flatMap((e) => [cheerio.load(`<h2>${e.heading}</h2>`)("h2").get(0)!, ...e.nodes])];
    const doc = nodesToDoc(about.$, all);
    if (doc) {
      // Hold back unconfirmed claims (paragraphs or list items mentioning them).
      const keep = (node: BlockNode): BlockNode | null => {
        if (node.type === "bulletList" || node.type === "orderedList") {
          const items = node.content.filter((li) => {
            const t = li.content.map((c) => docToPlainText({ type: "doc", content: [c] })).join(" ");
            const bad = UNCONFIRMED_CLAIMS.some((re) => re.test(t));
            if (bad) note("Claims held back until the client confirms", `About: "${t}"`);
            return !bad;
          });
          return items.length ? { ...node, content: items } : null;
        }
        const t = docToPlainText({ type: "doc", content: [node] });
        if (UNCONFIRMED_CLAIMS.some((re) => re.test(t))) {
          note("Claims held back until the client confirms", `About: "${t.slice(0, 160)}"`);
          return null;
        }
        return node;
      };
      aboutBody = { type: "doc", content: doc.content.map(keep).filter((n): n is BlockNode => n !== null) };
      aboutIntro = docToPlainText({ type: "doc", content: aboutBody.content.filter((n) => n.type === "paragraph").slice(0, 1) });
    }
  }

  const pageDefs: { key: string; slug: string; title: string; status: ContentStatus; intro?: string | null; body?: RichDoc | null; meta?: string | null }[] = [
    { key: "home", slug: "", title: "India, Beyond the Obvious", status: "PUBLISHED", meta: (await loadHtml("home"))?.meta["description"] },
    { key: "about", slug: "about", title: "About India Uncharted", status: "PUBLISHED", intro: aboutIntro, body: aboutBody, meta: about?.meta["description"] },
    { key: "contact", slug: "contact", title: "Contact India Uncharted", status: "PUBLISHED" },
    { key: "plan-my-journey", slug: "plan-my-journey", title: "Plan My Journey", status: "PUBLISHED" },
    { key: "faqs", slug: "faqs", title: "Frequently Asked Questions", status: "DRAFT" },
    { key: "privacy-policy", slug: "privacy-policy", title: "Privacy Policy", status: "DRAFT" },
    { key: "terms-and-conditions", slug: "terms-and-conditions", title: "Terms & Conditions", status: "DRAFT" },
    { key: "cookie-policy", slug: "cookie-policy", title: "Cookie Policy", status: "DRAFT" },
  ];
  for (const pd of pageDefs) {
    const existing = await db.page.findUnique({ where: { key: pd.key }, select: { id: true, seoId: true } });
    const data = {
      slug: pd.slug || "home",
      title: pd.title,
      intro: pd.intro ?? null,
      body: pd.body ?? Prisma.DbNull,
      status: pd.status,
      publishedAt: pd.status === "PUBLISHED" ? new Date() : null,
    };
    const seoId = await ensureSeo(existing?.seoId, { metaDescription: pd.meta ?? null });
    if (existing) await db.page.update({ where: { id: existing.id }, data: { ...data, seoId } });
    else await db.page.create({ data: { key: pd.key, ...data, seoId } });
  }
  note("Pages that need client-supplied text before publishing", "FAQs (no FAQs exist on the old site), Privacy Policy, Terms & Conditions, Cookie Policy");

  // Testimonials: imported unverified and unpublished; their star ratings are not imported.
  if (homeHtml) {
    const { $ } = homeHtml;
    const slides = $(".wpmtst-testimonial").toArray();
    for (const [i, s] of slides.entries()) {
      const $s = $(s);
      const headline = stripEmoji($s.find(".testimonial-content b, .testimonial-content strong").first().text().replace(/[“”"]/g, "").trim());
      const bodyText = $s.find(".testimonial-content").text().replace(/\s+/g, " ").replace(/[“”]/g, "").replace(headline, "").trim();
      const authorName = $s.find(".testimonial-name").text().trim();
      if (!authorName || !bodyText) continue;
      const exists = await db.testimonial.findFirst({ where: { authorName, body: bodyText } });
      if (!exists) {
        await db.testimonial.create({ data: { authorName, headline: headline || null, body: bodyText, source: "DIRECT", status: "DRAFT", sortOrder: i } });
      }
      note("Testimonials imported as unverified DRAFT", `${authorName}: "${headline}" (old site showed a star rating; not imported)`);
    }
  }

  // Site settings ------------------------------------------------------------
  await db.siteSettings.upsert({
    where: { id: "singleton" },
    create: { id: "singleton" },
    update: {},
  });
  const logoId = await importMediaFile(`${ORIGIN}/wp-content/uploads/2026/02/ind-chr-copy.png`, "India Uncharted logo");
  const logoLightId = await importMediaFile(`${ORIGIN}/wp-content/uploads/2026/02/ind-chr-wht-copy.png`, "India Uncharted logo in white");
  if (logoId) await db.media.update({ where: { id: logoId }, data: { altText: "India Uncharted", licence: "OWNED", folder: "brand" } });
  if (logoLightId) await db.media.update({ where: { id: logoLightId }, data: { altText: "India Uncharted", licence: "OWNED", folder: "brand" } });
  await db.siteSettings.update({
    where: { id: "singleton" },
    data: {
      logoId,
      logoLightId,
      businessName: "India Uncharted",
      brandLine: "India, Beyond the Obvious.",
      tagline: "Private journeys through India's landscapes, cultures and stories.",
      phoneE164: toE164("+91-8005967178"),
      whatsappE164: null, // not confirmed as a WhatsApp number
      email: "indiaunchartedtravel@gmail.com",
      enquiryEmail: "indiaunchartedtravel@gmail.com",
      addressLine1: "Killi khana, Sodagoran ka Mohalla",
      city: "Jodhpur",
      region: "Rajasthan",
      postalCode: "342001",
      country: "India",
      socials: [
        { network: "facebook", url: "https://www.facebook.com/IndiaUncharted47" },
        { network: "youtube", url: "https://www.youtube.com/@indiaunchartedtravel" },
        { network: "x", url: "https://x.com/india_uncharted" },
      ],
      footerDescription:
        "At India Uncharted, our mission is to showcase the true essence of India by designing meaningful, personalized, and seamless travel experiences.",
      copyright: "© {year} India Uncharted. All rights reserved.",
    },
  });
  await db.seoSettings.upsert({
    where: { id: "singleton" },
    create: {
      id: "singleton",
      defaultMetaDescription:
        "Private, tailor-made journeys across India — from Rajasthan's desert cities to Kashmir's valleys, Goa's yoga retreats and offbeat places most travellers miss.",
      twitterHandle: "@india_uncharted",
      patterns: {
        DESTINATION: { title: "{name} Travel Guide & Tour Packages" },
        REGION: { title: "{name} Tours & Destinations" },
        JOURNEY: { title: "{name}" },
        EXPERIENCE: { title: "{name}" },
        SERVICE: { title: "{name}" },
        ARTICLE: { title: "{name}" },
        CATEGORY: { title: "{name} Journeys in India" },
        EXPERIENCE_THEME: { title: "{name} Experiences in India" },
        PAGE: { title: "{name}" },
      },
    },
    update: {},
  });

  // Redirects ----------------------------------------------------------------
  let redirects = 0;
  for (const r of urlRows) {
    if (r.status !== "301" && r.status !== "410") continue;
    const fromPath = normalizePath(r.old_url);
    const toPath = r.status === "410" ? null : normalizeTarget(r.new_url);
    if (toPath && normalizePath(toPath.split("?")[0]!) === fromPath && !toPath.includes("?")) continue;
    await db.redirect.upsert({
      where: { fromPath },
      create: { fromPath, toPath, statusCode: Number(r.status), origin: "MIGRATION", note: r.notes || null },
      update: { toPath, statusCode: Number(r.status), origin: "MIGRATION" },
    });
    redirects++;
  }
  console.log(`redirects ${redirects}`);

  await writeReport();
}

async function writeReport() {
  const counts = {
    media: await db.media.count(),
    destinations: await db.destination.groupBy({ by: ["status"], _count: true }),
    journeys: await db.journey.groupBy({ by: ["kind"], _count: true }),
    experiences: await db.experience.count(),
    articles: await db.article.count(),
    redirects: await db.redirect.count(),
    mediaNoAlt: await db.media.count({ where: { altText: "" } }),
    seoNoDescription: await db.seoMeta.count({ where: { metaDescription: null } }),
  };
  const lines = [
    "# Import report",
    "",
    `Generated ${new Date().toISOString()} by \`npm run wp:import\` from the frozen export in \`docs/migration/\`.`,
    "",
    "## Totals",
    "",
    `- Media: ${counts.media} (${counts.mediaNoAlt} without alt text)`,
    `- Destinations: ${counts.destinations.map((d) => `${d._count} ${d.status.toLowerCase()}`).join(", ")}`,
    `- Journeys: ${counts.journeys.map((j) => `${j._count} ${j.kind.toLowerCase()}`).join(", ")}`,
    `- Experiences: ${counts.experiences}`,
    `- Articles: ${counts.articles}`,
    `- Redirects: ${counts.redirects}`,
    `- SEO records without a meta description: ${counts.seoNoDescription} (write these by hand; none are generated)`,
    "",
    "Every journey and experience must be compared against its old page before launch.",
    "",
  ];
  for (const [section, items] of Object.entries(report)) {
    lines.push(`## ${section}`, "", ...[...new Set(items)].map((i) => `- ${i}`), "");
  }
  await writeFile(path.join(MIG, "import-report.md"), lines.join("\n"));
  console.log("report → docs/migration/import-report.md");
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
