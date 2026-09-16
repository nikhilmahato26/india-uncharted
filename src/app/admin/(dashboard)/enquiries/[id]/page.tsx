import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { requireCapability } from "@/lib/auth/session";
import { can } from "@/lib/auth/rbac";
import { formatPhone, telHref, whatsappHref } from "@/lib/phone";
import { PageHeader, Panel } from "@/components/admin/ui";
import { EnquiryStatusPill } from "@/components/admin/enquiry-status";
import { EnquiryActions } from "@/components/admin/enquiry-actions";
import { BUDGET_BANDS } from "@/lib/schemas/enquiry";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const e = await db.enquiry.findUnique({ where: { id }, select: { refCode: true, name: true } });
  return { title: e ? `${e.refCode} — ${e.name}` : "Enquiry" };
}

export default async function EnquiryPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireCapability("enquiries.read");
  const [enquiry, settings, team] = await Promise.all([
    db.enquiry.findUnique({
      where: { id },
      include: { notes: { orderBy: { createdAt: "desc" }, include: { user: { select: { name: true } } } }, assignedTo: { select: { id: true, name: true } } },
    }),
    db.siteSettings.findUnique({ where: { id: "singleton" }, select: { whatsappE164: true } }),
    db.user.findMany({ where: { isActive: true }, select: { id: true, name: true }, orderBy: { name: "asc" } }),
  ]);
  if (!enquiry) notFound();

  const date = (d: Date | null) => (d ? d.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" }) : null);
  const budget = BUDGET_BANDS.find((b) => b.value === enquiry.budgetBand)?.label;

  const replyText = [
    `Hello ${enquiry.name.split(" ")[0]}, this is India Uncharted.`,
    enquiry.entityNameSnapshot ? `Thank you for your enquiry about ${enquiry.entityNameSnapshot}.` : "Thank you for your enquiry.",
    `Your reference is ${enquiry.refCode}.`,
  ].join(" ");

  const facts = [
    { label: "Reference", value: enquiry.refCode },
    { label: "Received", value: date(enquiry.createdAt) },
    { label: "About", value: enquiry.entityNameSnapshot ?? "General enquiry" },
    { label: "From page", value: enquiry.sourcePath ?? "—" },
    { label: "Travelling", value: enquiry.travelDateFrom ? `${date(enquiry.travelDateFrom)}${enquiry.travelDateTo ? ` – ${date(enquiry.travelDateTo)}` : ""}` : enquiry.flexibleDates ? "Flexible" : "Not said" },
    { label: "Travellers", value: enquiry.adults ? `${enquiry.adults} adults${enquiry.children ? `, ${enquiry.children} children` : ""}` : "Not said" },
    { label: "Budget", value: budget ?? "Not said" },
    { label: "Country", value: enquiry.country ?? "Not said" },
  ];

  return (
    <>
      <PageHeader
        title={enquiry.name}
        back={{ label: "Enquiries", href: "/admin/enquiries" }}
        description={
          <span className="flex flex-wrap items-center gap-3">
            <EnquiryStatusPill status={enquiry.status} />
            <span className="tabular">{enquiry.refCode}</span>
          </span>
        }
        actions={
          <div className="flex flex-wrap gap-2">
            {enquiry.phoneE164 && settings?.whatsappE164 ? (
              <a
                href={whatsappHref(enquiry.phoneE164, replyText)}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex min-h-11 items-center border border-forest-800 px-4 text-small font-semibold text-forest-900 hover:bg-forest-50"
              >
                Reply on WhatsApp
              </a>
            ) : null}
            {enquiry.phoneE164 ? (
              <a href={telHref(enquiry.phoneE164)} className="inline-flex min-h-11 items-center border border-ink/25 px-4 text-small font-semibold text-ink hover:bg-paper-2">
                Call {formatPhone(enquiry.phoneE164)}
              </a>
            ) : null}
            <a
              href={`mailto:${enquiry.email}?subject=${encodeURIComponent(`Your India journey (${enquiry.refCode})`)}&body=${encodeURIComponent(`${replyText}\n\n`)}`}
              className="inline-flex min-h-11 items-center border border-ink/25 px-4 text-small font-semibold text-ink hover:bg-paper-2"
            >
              Email
            </a>
          </div>
        }
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="grid gap-6 lg:col-span-2">
          <Panel title="What they asked for">
            {enquiry.message ? (
              <p className="measure whitespace-pre-line text-body text-ink-2">{enquiry.message}</p>
            ) : (
              <p className="text-small text-ink-3">No message — they sent the form without one.</p>
            )}
            {enquiry.destinationsWanted.length || enquiry.travelStyles.length ? (
              <div className="mt-5 flex flex-wrap gap-1.5">
                {[...enquiry.destinationsWanted, ...enquiry.travelStyles].map((t) => (
                  <span key={t} className="border border-ink/20 px-2.5 py-1 text-caption text-ink-2">
                    {t}
                  </span>
                ))}
              </div>
            ) : null}
          </Panel>

          <Panel title="Notes" description="Private to the team — travellers never see these.">
            <EnquiryActions
              id={enquiry.id}
              status={enquiry.status}
              assignedToId={enquiry.assignedTo?.id ?? null}
              team={team}
              canManage={can(user.role, "enquiries.manage")}
              notes={enquiry.notes.map((n) => ({ id: n.id, body: n.body, author: n.user?.name ?? "Someone", createdAt: n.createdAt.toISOString() }))}
            />
          </Panel>
        </div>

        <div className="grid gap-6">
          <Panel title="Details">
            <dl className="grid gap-3 text-small">
              <div>
                <dt className="text-caption text-ink-3">Email</dt>
                <dd>
                  <a href={`mailto:${enquiry.email}`} className="break-all text-terracotta-700 underline underline-offset-4">
                    {enquiry.email}
                  </a>
                </dd>
              </div>
              {enquiry.phoneE164 ? (
                <div>
                  <dt className="text-caption text-ink-3">Phone</dt>
                  <dd>
                    <a href={telHref(enquiry.phoneE164)} className="text-terracotta-700 underline underline-offset-4">
                      {formatPhone(enquiry.phoneE164)}
                    </a>
                    {enquiry.whatsappOptIn ? <span className="ml-2 text-caption text-ink-3">happy to use WhatsApp</span> : null}
                  </dd>
                </div>
              ) : null}
              {facts.map((f) => (
                <div key={f.label}>
                  <dt className="text-caption text-ink-3">{f.label}</dt>
                  <dd className="text-ink-2">{f.value}</dd>
                </div>
              ))}
            </dl>
          </Panel>
        </div>
      </div>
    </>
  );
}
