import Link from "next/link";
import { db } from "@/lib/db";
import { requireCapability } from "@/lib/auth/session";
import { ENTITIES, type EntityKey } from "@/lib/admin/registry";
import { buildSeoSubject } from "@/lib/admin/seo-subject";
import { analyzeSeo, countIssues } from "@/lib/seo/analyze";
import { PageHeader, Panel, IssuePill } from "@/components/admin/ui";

export const metadata = { title: "SEO health" };

const CHECKED: EntityKey[] = ["destinations", "journeys", "experiences", "articles", "regions", "services", "pages"];

/** The whole site, checked in one pass. Slow by nature — it reads every record. */
export default async function SeoHealthPage() {
  await requireCapability("seo.global");

  const sections = await Promise.all(
    CHECKED.map(async (key) => {
      const def = ENTITIES[key];
      const model = (db as unknown as Record<string, { findMany: (a: unknown) => Promise<Record<string, unknown>[]> }>)[def.model];
      const rows = await model.findMany({ where: { status: "PUBLISHED" }, include: { seo: true }, take: 200 });
      const records = await Promise.all(
        rows.map(async (row) => {
          const checks = analyzeSeo(await buildSeoSubject(def, row));
          return {
            id: String(row.id),
            title: String(row[def.titleField] ?? "Untitled"),
            href: `/admin/${def.key}/${row.id}`,
            ...countIssues(checks),
            issues: checks.filter((c) => c.status !== "pass"),
          };
        }),
      );
      return { key, label: def.label, records: records.sort((a, b) => b.fail - a.fail || b.warn - a.warn) };
    }),
  );

  const totals = sections.reduce(
    (acc, s) => ({ fail: acc.fail + s.records.reduce((n, r) => n + r.fail, 0), warn: acc.warn + s.records.reduce((n, r) => n + r.warn, 0), pages: acc.pages + s.records.length }),
    { fail: 0, warn: 0, pages: 0 },
  );

  return (
    <>
      <PageHeader
        title="SEO health"
        description={`${totals.pages} published pages checked. These are recommendations, not a score — none of them promise a ranking.`}
        back={{ label: "SEO manager", href: "/admin/seo" }}
        actions={<IssuePill fail={totals.fail} warn={totals.warn} />}
      />

      <div className="grid gap-6">
        {sections.map((section) => (
          <Panel key={section.key} title={section.label} description={`${section.records.length} published`}>
            {section.records.length ? (
              <ul className="divide-y divide-rule">
                {section.records.map((r) => (
                  <li key={r.id} className="py-3">
                    <div className="flex flex-wrap items-baseline justify-between gap-3">
                      <Link href={r.href} className="font-semibold text-ink hover:text-terracotta-700">
                        {r.title}
                      </Link>
                      <IssuePill fail={r.fail} warn={r.warn} />
                    </div>
                    {r.issues.length ? (
                      <ul className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1">
                        {r.issues.slice(0, 6).map((i) => (
                          <li key={i.id} className={i.status === "fail" ? "text-caption text-danger" : "text-caption text-ink-3"}>
                            {i.label}
                          </li>
                        ))}
                        {r.issues.length > 6 ? <li className="text-caption text-ink-3">+{r.issues.length - 6} more</li> : null}
                      </ul>
                    ) : null}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-small text-ink-3">Nothing published yet.</p>
            )}
          </Panel>
        ))}
      </div>
    </>
  );
}
