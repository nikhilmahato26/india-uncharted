/**
 * SEO checks. Pure and dependency-free, so the same function runs in the entity
 * editor, in the site-wide health report and in unit tests.
 *
 * These are recommendations. Nothing here predicts or guarantees a ranking, and
 * the UI never shows a score out of a hundred.
 */

export type CheckStatus = "pass" | "warn" | "fail";
export type Check = { id: string; status: CheckStatus; label: string; detail?: string };

export type SeoSubject = {
  type: string;
  name: string;
  path: string;
  /** The title as it will actually be rendered, after patterns and defaults. */
  resolvedTitle: string;
  metaTitle: string | null;
  metaDescription: string | null;
  h1: string | null;
  focusKeyword: string | null;
  secondaryKeywords: string[];
  canonicalUrl: string | null;
  robotsIndex: boolean;
  hasOgImage: boolean;
  hasHeroImage: boolean;
  heroAltMissing: boolean;
  /** Images used on the page with no alt text. */
  imagesMissingAlt: number;
  /** Media on this page whose licence is still UNKNOWN. */
  imagesLicenceUnknown: number;
  wordCount: number;
  internalLinksOut: number;
  internalLinksIn: number;
  hasRelatedContent: boolean;
  bodyText: string;
  /** Other pages that resolve to the same title / description / focus keyword. */
  duplicateTitleWith: string[];
  duplicateDescriptionWith: string[];
  sameFocusKeywordAs: string[];
  isLinkedFromNav: boolean;
};

export const TITLE_MAX = 60;
export const TITLE_MIN = 20;
export const DESCRIPTION_MAX = 160;
export const DESCRIPTION_MIN = 70;

const THIN_CONTENT: Record<string, number> = {
  DESTINATION: 250,
  JOURNEY: 300,
  EXPERIENCE: 250,
  ARTICLE: 400,
  REGION: 200,
  SERVICE: 150,
  CATEGORY: 80,
  PAGE: 120,
};

function includesKeyword(haystack: string | null | undefined, keyword: string): boolean {
  if (!haystack) return false;
  return haystack.toLowerCase().includes(keyword.toLowerCase());
}

export function analyzeSeo(s: SeoSubject): Check[] {
  const checks: Check[] = [];
  const add = (id: string, status: CheckStatus, label: string, detail?: string) => checks.push({ id, status, label, detail });

  // — Title —
  if (!s.metaTitle && !s.resolvedTitle) add("title", "fail", "No title", "Search engines will invent one from the page.");
  else {
    const title = s.resolvedTitle;
    if (title.length > TITLE_MAX) add("title", "warn", "Meta title is long", `${title.length} characters; Google usually shows about ${TITLE_MAX}.`);
    else if (title.length < TITLE_MIN) add("title", "warn", "Meta title is short", `${title.length} characters — there is room to say more.`);
    else add("title", "pass", "Meta title", `${title.length} characters.`);
  }

  // — Description —
  if (!s.metaDescription) add("description", "fail", "No meta description", "Google will pull a snippet from the page instead of your wording.");
  else if (s.metaDescription.length > DESCRIPTION_MAX)
    add("description", "warn", "Meta description is long", `${s.metaDescription.length} characters; about ${DESCRIPTION_MAX} is shown.`);
  else if (s.metaDescription.length < DESCRIPTION_MIN)
    add("description", "warn", "Meta description is short", `${s.metaDescription.length} characters — most snippets fit ${DESCRIPTION_MIN}–${DESCRIPTION_MAX}.`);
  else add("description", "pass", "Meta description", `${s.metaDescription.length} characters.`);

  // — Headings —
  if (!s.h1) add("h1", "fail", "No H1", "Every page needs one main heading.");
  else add("h1", "pass", "H1", s.h1);

  // — Focus keyword —
  if (!s.focusKeyword) {
    add("focus-keyword", "warn", "No focus keyword", "Set the search topic this page is meant to win.");
  } else {
    const k = s.focusKeyword;
    add("focus-keyword", "pass", "Focus keyword", k);
    const inTitle = includesKeyword(s.resolvedTitle, k);
    const inH1 = includesKeyword(s.h1, k);
    const inSlug = includesKeyword(s.path.replace(/-/g, " "), k);
    const inBody = includesKeyword(s.bodyText.slice(0, 1500), k);
    if (!inTitle) add("keyword-title", "warn", "Focus keyword is not in the title", `Add “${k}” to the meta title if it reads naturally.`);
    if (!inH1) add("keyword-h1", "warn", "Focus keyword is not in the H1");
    if (!inBody) add("keyword-body", "warn", "Focus keyword is not in the opening copy", "Use it once early, in a sentence you'd write anyway.");
    if (!inSlug) add("keyword-slug", "warn", "Focus keyword is not in the URL", `The URL is ${s.path}.`);
    if (s.sameFocusKeywordAs.length)
      add("cannibalisation", "fail", "Another page targets the same keyword", `Also targeted by: ${s.sameFocusKeywordAs.join(", ")}. Two pages competing for one phrase split the traffic.`);
  }

  // — Duplication —
  if (s.duplicateTitleWith.length) add("duplicate-title", "fail", "Duplicate meta title", `Same title as: ${s.duplicateTitleWith.join(", ")}.`);
  if (s.duplicateDescriptionWith.length) add("duplicate-description", "warn", "Duplicate meta description", `Same description as: ${s.duplicateDescriptionWith.join(", ")}.`);

  // — Indexing —
  if (!s.robotsIndex) add("robots", "warn", "Set to noindex", "This page is deliberately hidden from search results.");
  else add("robots", "pass", "Indexable");
  if (s.canonicalUrl) add("canonical", "pass", "Custom canonical URL", s.canonicalUrl);

  // — Images —
  if (!s.hasHeroImage) add("hero-image", "warn", "No main image", "Social shares and cards will fall back to the site image.");
  else if (s.heroAltMissing) add("hero-alt", "fail", "Main image has no alt text", "Describe what the photograph shows.");
  else add("hero-image", "pass", "Main image with alt text");
  if (!s.hasOgImage && !s.hasHeroImage) add("og-image", "warn", "No social sharing image");
  if (s.imagesMissingAlt > 0) add("image-alt", "warn", `${s.imagesMissingAlt} ${s.imagesMissingAlt === 1 ? "image has" : "images have"} no alt text`, "Alt text describes the picture for screen readers and search engines.");
  if (s.imagesLicenceUnknown > 0)
    add("image-licence", "warn", `${s.imagesLicenceUnknown} ${s.imagesLicenceUnknown === 1 ? "image has" : "images have"} an unconfirmed licence`, "Confirm you have the right to publish these, or replace them.");

  // — Content depth —
  const threshold = THIN_CONTENT[s.type] ?? 150;
  if (s.wordCount < threshold)
    add("thin-content", s.wordCount < threshold / 2 ? "fail" : "warn", "Thin content", `${s.wordCount} words; pages like this usually need ${threshold}+ to be useful.`);
  else add("content", "pass", "Content depth", `${s.wordCount} words.`);

  // — Internal linking —
  if (s.internalLinksIn === 0 && !s.isLinkedFromNav) add("orphan", "fail", "Nothing links to this page", "An orphan page is hard for both readers and crawlers to find.");
  else add("inbound-links", "pass", "Linked from elsewhere", s.isLinkedFromNav ? "In the navigation." : `${s.internalLinksIn} internal links point here.`);
  if (s.internalLinksOut < 2) add("outbound-links", "warn", "Few links out", "Link to the journeys, places or guides this page mentions.");
  if (!s.hasRelatedContent) add("related", "warn", "No related content", "Related journeys or destinations keep readers moving through the site.");

  return checks;
}

export function countIssues(checks: Check[]) {
  return {
    fail: checks.filter((c) => c.status === "fail").length,
    warn: checks.filter((c) => c.status === "warn").length,
    pass: checks.filter((c) => c.status === "pass").length,
  };
}

/** Google's snippet is pixel-limited; this is a rough but honest character guide. */
export function serpPreview(title: string, description: string | null, url: string) {
  const clamp = (text: string, max: number) => (text.length <= max ? text : `${text.slice(0, max - 1).trimEnd()}…`);
  return {
    title: clamp(title, TITLE_MAX),
    description: description ? clamp(description, DESCRIPTION_MAX) : "",
    url,
    titleTruncated: title.length > TITLE_MAX,
    descriptionTruncated: (description?.length ?? 0) > DESCRIPTION_MAX,
  };
}
