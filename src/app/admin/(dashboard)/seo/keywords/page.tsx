import Link from "next/link";
import { db } from "@/lib/db";
import { requireCapability } from "@/lib/auth/session";
import { ENTITIES, type EntityKey } from "@/lib/admin/registry";
import { PageHeader, Panel, EmptyState } from "@/components/admin/ui";

export const metadata = { title: "Keywords" };

const SOURCES: EntityKey[] = ["destinations", "journeys", "experiences", "articles", "regions", "services", "pages"];

/**
 * Every focus keyword in one table, so two pages chasing the same phrase are
 * visible. That is the failure a keyword field is actually for.
 */
export default async function KeywordMapPage() {
  await requireCapability("seo.global");

  const rows: { keyword: string; secondary: string[]; title: string; href: string; type: string; status: string }[] = [];
  for (const key of SOURCES) {
    const def = ENTITIES[key];
    const model = (db as unknown as Record<string, { findMany: (a: unknown) => Promise<Record<string, unknown>[]> }>)[def.model];
    const records = await model.findMany({ where: { seo: { focusKeyword: { not: null } } }, include: { seo: true }, take: 300 });
    for (const r of records) {
      const seo = r.seo as { focusKeyword?: string; secondaryKeywords?: string[] } | null;
      if (!seo?.focusKeyword) continue;
      rows.push({
        keyword: seo.focusKeyword,
        secondary: seo.secondaryKeywords ?? [],
        title: String(r[def.titleField] ?? "Untitled"),
        href: `/admin/${def.key}/${r.id}`,
        type: def.singular,
        status: String(r.status ?? "DRAFT"),
      });
    }
  }

  const byKeyword = new Map<string, typeof rows>();
  for (const row of rows) {
    const key = row.keyword.trim().toLowerCase();
    byKeyword.set(key, [...(byKeyword.get(key) ?? []), row]);
  }
  const clashes = [...byKeyword.entries()].filter(([, list]) => list.length > 1);
  const unique = [...byKeyword.entries()].filter(([, list]) => list.length === 1);

  const missing = await Promise.all(
    SOURCES.map(async (key) => {
      const def = ENTITIES[key];
      const model = (db as unknown as Record<string, { count: (a: unknown) => Promise<number> }>)[def.model];
      return { label: def.label, href: `/admin/${def.key}`, count: await model.count({ where: { status: "PUBLISHED", OR: [{ seo: null }, { seo: { focusKeyword: null } }] } }) };
    }),
  );

  return (
    <>
      <PageHeader
        title="Keyword map"
        description="What each page is trying to be found for. One page per phrase — two pages chasing the same words split the traffic between them."
        back={{ label: "SEO manager", href: "/admin/seo" }}
      />

      {clashes.length ? (
        <Panel title="Two pages, one keyword" description="Fix these first: give one page the phrase and point the other at something else." className="mb-6">
          <ul className="divide-y divide-rule">
            {clashes.map(([keyword, list]) => (
              <li key={keyword} className="py-3">
                <p className="font-semibold text-danger">{keyword}</p>
                <ul className="mt-1 grid gap-1">
                  {list.map((r) => (
                    <li key={r.href}>
                      <Link href={r.href} className="text-small text-ink-2 underline underline-offset-4 hover:text-ink">
                        {r.title}
                      </Link>{" "}
                      <span className="text-caption text-ink-3">({r.type.toLowerCase()})</span>
                    </li>
                  ))}
                </ul>
              </li>
            ))}
          </ul>
        </Panel>
      ) : null}

      <Panel title="Keywords in use" className="mb-6">
        {unique.length ? (
          <div className="overflow-x-auto">
            <table className="w-full text-small">
              <thead>
                <tr className="border-b border-rule text-left">
                  <th scope="col" className="py-2 pr-4 font-semibold text-ink">
                    Focus keyword
                  </th>
                  <th scope="col" className="py-2 pr-4 font-semibold text-ink">
                    Page
                  </th>
                  <th scope="col" className="py-2 font-semibold text-ink">
                    Also covering
                  </th>
                </tr>
              </thead>
              <tbody>
                {unique
                  .sort((a, b) => a[0].localeCompare(b[0]))
                  .map(([keyword, [row]]) => (
                    <tr key={keyword} className="border-b border-rule last:border-b-0">
                      <td className="py-2.5 pr-4 text-ink">{keyword}</td>
                      <td className="py-2.5 pr-4">
                        <Link href={row!.href} className="text-terracotta-700 underline underline-offset-4">
                          {row!.title}
                        </Link>
                      </td>
                      <td className="py-2.5 text-caption text-ink-3">{row!.secondary.join(", ") || "—"}</td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState title="No focus keywords set yet" description="Open any destination or journey, go to the SEO tab, and set the one phrase that page should win." />
        )}
      </Panel>

      <Panel title="Published pages with no focus keyword">
        <ul className="grid gap-2">
          {missing
            .filter((m) => m.count > 0)
            .map((m) => (
              <li key={m.label} className="flex items-center justify-between border-b border-rule pb-2 text-small">
                <Link href={m.href} className="text-ink-2 hover:text-terracotta-700">
                  {m.label}
                </Link>
                <span className="font-display text-subtitle text-ink tabular">{m.count}</span>
              </li>
            ))}
          {missing.every((m) => m.count === 0) ? <li className="text-small text-success">Every published page has a focus keyword.</li> : null}
        </ul>
      </Panel>
    </>
  );
}
