/**
 * Launch gate: crawl every public page and check the things that are easy to
 * get wrong in bulk — a page that 500s, a missing H1, a duplicate title, a page
 * with no meta description.
 *
 *   node scripts/check-pages.mjs [baseUrl]
 */
const base = (process.argv[2] ?? "http://localhost:3000").replace(/\/+$/, "");

const STATIC_PATHS = [
  "/",
  "/destinations",
  "/regions",
  "/journeys",
  "/bike-tours",
  "/experiences",
  "/travel-guide",
  "/services",
  "/about",
  "/contact",
  "/plan-my-journey",
];

/** Pull every internal link from a page so the crawl reaches the whole site. */
function linksFrom(html) {
  const out = new Set();
  for (const m of html.matchAll(/href="(\/[^"#?]*)"/g)) {
    const href = m[1].replace(/\/$/, "") || "/";
    if (/^\/(admin|api|media|_next)/.test(href)) continue;
    out.add(href);
  }
  return out;
}

const seen = new Set();
const queue = [...STATIC_PATHS];
const problems = [];
const titles = new Map();
const descriptions = new Map();
let checked = 0;

while (queue.length) {
  const path = queue.shift();
  if (seen.has(path)) continue;
  seen.add(path);

  const res = await fetch(`${base}${path}`, { redirect: "manual" });
  if (res.status === 301 || res.status === 308) continue; // covered by check-redirects
  if (res.status !== 200) {
    problems.push(`${path}: HTTP ${res.status}`);
    continue;
  }
  const html = await res.text();
  checked++;

  const title = html.match(/<title>([^<]*)<\/title>/)?.[1]?.trim();
  const description = html.match(/<meta name="description" content="([^"]*)"/)?.[1]?.trim();
  const h1s = [...html.matchAll(/<h1[^>]*>([\s\S]*?)<\/h1>/g)].map((m) => m[1].replace(/<[^>]+>/g, "").trim());
  const canonical = html.match(/<link rel="canonical" href="([^"]*)"/)?.[1];

  if (!title) problems.push(`${path}: no <title>`);
  if (h1s.length === 0) problems.push(`${path}: no H1`);
  if (h1s.length > 1) problems.push(`${path}: ${h1s.length} H1s — a page should have one`);
  if (!canonical) problems.push(`${path}: no canonical URL`);
  if (!description) problems.push(`${path}: no meta description`);

  if (title) titles.set(title, [...(titles.get(title) ?? []), path]);
  if (description) descriptions.set(description, [...(descriptions.get(description) ?? []), path]);

  for (const href of linksFrom(html)) if (!seen.has(href)) queue.push(href);
}

for (const [title, paths] of titles) if (paths.length > 1) problems.push(`duplicate title "${title}" on: ${paths.join(", ")}`);
for (const [, paths] of descriptions) if (paths.length > 1) problems.push(`duplicate meta description on: ${paths.join(", ")}`);

console.log(`crawled ${checked} pages at ${base}`);
const missingDescription = problems.filter((p) => p.includes("no meta description"));
const rest = problems.filter((p) => !p.includes("no meta description"));

if (missingDescription.length) {
  console.log(`\n${missingDescription.length} pages still need a meta description (write these by hand — see the SEO health report):`);
  for (const p of missingDescription.slice(0, 10)) console.log(`  · ${p.replace(": no meta description", "")}`);
  if (missingDescription.length > 10) console.log(`  · …and ${missingDescription.length - 10} more`);
}

if (rest.length) {
  console.error(`\n${rest.length} problems:`);
  for (const p of rest) console.error(`  ✗ ${p}`);
  process.exit(1);
}
console.log("\n✓ every page has a title, one H1 and a canonical URL, and no two share a title");
