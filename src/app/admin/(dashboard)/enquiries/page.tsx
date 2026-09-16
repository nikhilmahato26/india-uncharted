import Link from "next/link";
import { db } from "@/lib/db";
import { requireCapability } from "@/lib/auth/session";
import { PageHeader, EmptyState } from "@/components/admin/ui";
import { EnquiryStatusPill } from "@/components/admin/enquiry-status";

export const metadata = { title: "Enquiries" };

const PIPELINE = ["NEW", "CONTACTED", "QUOTED", "CONFIRMED", "COMPLETED", "LOST"] as const;

export default async function EnquiriesPage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  await requireCapability("enquiries.read");
  const { status } = await searchParams;
  const active = PIPELINE.includes(status as (typeof PIPELINE)[number]) ? (status as (typeof PIPELINE)[number]) : null;

  const [enquiries, counts] = await Promise.all([
    db.enquiry.findMany({
      where: active ? { status: active } : {},
      orderBy: { createdAt: "desc" },
      take: 200,
      select: {
        id: true,
        refCode: true,
        name: true,
        email: true,
        phoneE164: true,
        entityNameSnapshot: true,
        travelDateFrom: true,
        adults: true,
        children: true,
        status: true,
        createdAt: true,
        assignedTo: { select: { name: true } },
      },
    }),
    db.enquiry.groupBy({ by: ["status"], _count: true }),
  ]);

  const countFor = (s: string) => counts.find((c) => c.status === s)?._count ?? 0;
  const total = counts.reduce((n, c) => n + c._count, 0);

  return (
    <>
      <PageHeader title="Enquiries" description="Every enquiry from the website, oldest work first. Nothing here is deleted automatically." />

      <nav aria-label="Filter by stage" className="mb-6 flex flex-wrap gap-2">
        <Link
          href="/admin/enquiries"
          aria-current={!active ? "page" : undefined}
          className={`min-h-11 border px-3 text-caption font-semibold ${!active ? "border-ink bg-ink text-paper" : "border-ink/20 text-ink-2 hover:border-ink/40"} inline-flex items-center`}
        >
          All ({total})
        </Link>
        {PIPELINE.map((s) => (
          <Link
            key={s}
            href={`/admin/enquiries?status=${s}`}
            aria-current={active === s ? "page" : undefined}
            className={`min-h-11 border px-3 text-caption font-semibold ${active === s ? "border-ink bg-ink text-paper" : "border-ink/20 text-ink-2 hover:border-ink/40"} inline-flex items-center`}
          >
            {s.charAt(0) + s.slice(1).toLowerCase()} ({countFor(s)})
          </Link>
        ))}
      </nav>

      {enquiries.length ? (
        <ul className="grid gap-3">
          {enquiries.map((e) => (
            <li key={e.id}>
              <Link href={`/admin/enquiries/${e.id}`} className="block border border-rule bg-paper p-4 transition-colors hover:border-ink/30 hover:bg-paper-2">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-semibold text-ink">
                      {e.name} <span className="ml-2 font-normal text-caption text-ink-3 tabular">{e.refCode}</span>
                    </p>
                    <p className="mt-0.5 truncate text-small text-ink-2">{e.entityNameSnapshot ?? "General enquiry"}</p>
                    <p className="mt-1 text-caption text-ink-3">
                      {[
                        e.email,
                        e.phoneE164,
                        e.travelDateFrom ? `travelling ${e.travelDateFrom.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}` : null,
                        e.adults ? `${e.adults + (e.children ?? 0)} travellers` : null,
                        e.assignedTo ? `with ${e.assignedTo.name}` : null,
                      ]
                        .filter(Boolean)
                        .join(" · ")}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-3">
                    <EnquiryStatusPill status={e.status} />
                    <time dateTime={e.createdAt.toISOString()} className="text-caption text-ink-3">
                      {e.createdAt.toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
                    </time>
                  </div>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <EmptyState
          title={active ? `Nothing at the ${active.toLowerCase()} stage` : "No enquiries yet"}
          description="Enquiries from the website land here the moment someone sends the form, and an email goes out at the same time."
        />
      )}
    </>
  );
}
