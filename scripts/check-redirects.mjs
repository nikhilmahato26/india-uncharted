/**
 * Launch gate: every old WordPress URL must resolve in one hop, with the exact
 * status and target recorded in docs/migration/url-map.csv, and the target
 * itself must return 200.
 *
 *   node scripts/check-redirects.mjs [baseUrl] [csvPath]
 *   node scripts/check-redirects.mjs https://staging.indiauncharted.com
 */
import { readFile } from "node:fs/promises";

const base = (process.argv[2] ?? "http://localhost:3000").replace(/\/+$/, "");
const csvPath = process.argv[3] ?? "docs/migration/url-map.csv";

function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = "";
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (quoted) {
      if (ch === '"' && text[i + 1] === '"') {
        field += '"';
        i++;
      }
      else if (ch === '"') quoted = false;
      else field += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === ",") {
      row.push(field);
      field = "";
    }
    else if (ch === "\n" || ch === "\r") {
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
  return data.map((r) => Object.fromEntries(header.map((h, i) => [h, r[i] ?? ""])));
}

const rows = parseCsv(await readFile(csvPath, "utf8"));
const failures = [];
const targetCache = new Map();

async function targetOk(path) {
  if (targetCache.has(path)) return targetCache.get(path);
  const res = await fetch(`${base}${path}`, { redirect: "follow" });
  targetCache.set(path, res.status);
  return res.status;
}

let checked = 0;
for (const row of rows) {
  const from = row.old_url;
  const expectStatus = Number(row.status) || 200;
  const expectTarget = row.new_url;
  if (!from) continue;
  checked++;

  const res = await fetch(`${base}${from}`, { redirect: "manual" });

  if (expectStatus === 410) {
    if (res.status !== 410) failures.push(`${from}: expected 410, got ${res.status}`);
    continue;
  }
  if (expectStatus === 200) {
    if (res.status !== 200) failures.push(`${from}: expected 200, got ${res.status}`);
    continue;
  }

  if (res.status !== expectStatus) {
    failures.push(`${from}: expected ${expectStatus}, got ${res.status}`);
    continue;
  }
  const location = (res.headers.get("location") ?? "").replace(base, "");
  if (location !== expectTarget) {
    failures.push(`${from}: redirects to ${location || "(nothing)"}, expected ${expectTarget}`);
    continue;
  }
  const status = await targetOk(expectTarget);
  if (status !== 200) failures.push(`${from} → ${expectTarget}: target returns ${status}`);
}

console.log(`checked ${checked} URLs against ${base}`);
if (failures.length) {
  console.error(`\n${failures.length} problems:`);
  for (const f of failures) console.error(`  ✗ ${f}`);
  process.exit(1);
}
console.log("✓ every old URL resolves in one hop to a live page");
