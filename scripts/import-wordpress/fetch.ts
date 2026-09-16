/**
 * Step 1 of the migration: freeze the live WordPress content into
 * docs/migration/wp-export/*.json so the import is repeatable and reviewable.
 *
 *   npm run wp:fetch
 */
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const ORIGIN = "https://indiauncharted.com";
const OUT = path.join(process.cwd(), "docs/migration/wp-export");
const UA = "IndiaUncharted-Migration/1.0 (+https://indiauncharted.com)";

const collections = [
  { name: "posts", fields: "id,date,modified,slug,status,link,title,content,excerpt,author,featured_media,categories,tags,yoast_head_json" },
  { name: "pages", fields: "id,date,modified,slug,status,link,title,content,excerpt,featured_media,parent,menu_order,destination,activity,yoast_head_json" },
  { name: "media", fields: "id,date,slug,link,title,caption,description,alt_text,mime_type,media_details,source_url,post" },
  { name: "destination", fields: "id,count,description,name,slug,link,yoast_head_json" },
  { name: "activity", fields: "id,count,description,name,slug,link,yoast_head_json" },
  { name: "categories", fields: "id,count,description,name,slug,link" },
] as const;

async function fetchAll(name: string, fields: string) {
  const items: unknown[] = [];
  for (let page = 1; page < 50; page++) {
    const url = `${ORIGIN}/wp-json/wp/v2/${name}?per_page=100&page=${page}&_fields=${fields}`;
    const res = await fetch(url, { headers: { "User-Agent": UA } });
    if (res.status === 400) break; // past the last page
    if (!res.ok) throw new Error(`${url} → ${res.status}`);
    const batch = (await res.json()) as unknown[];
    items.push(...batch);
    const totalPages = Number(res.headers.get("X-WP-TotalPages") ?? "1");
    if (page >= totalPages) break;
  }
  return items;
}

async function main() {
  await mkdir(OUT, { recursive: true });
  for (const c of collections) {
    const items = await fetchAll(c.name, c.fields);
    await writeFile(path.join(OUT, `${c.name}.json`), JSON.stringify(items, null, 1));
    console.log(`${c.name.padEnd(12)} ${items.length}`);
  }
  await writeFile(
    path.join(OUT, "README.md"),
    `# WordPress export\n\nFrozen from ${ORIGIN} REST API on ${new Date().toISOString().slice(0, 10)} by \`npm run wp:fetch\`.\nThe importer (\`npm run wp:import\`) reads only these files, never the live site.\n`,
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
