import "server-only";
import { db } from "@/lib/db";
import { getEntity, type EntityDef, type EntityKey } from "./registry";
import type { MediaOption } from "@/components/admin/media-picker";

/** Reads for the admin are always live — an editor must see what they just saved. */

type AnyRow = Record<string, unknown>;

function delegate(model: string) {
  return (db as unknown as Record<string, { findMany: (a: unknown) => Promise<AnyRow[]>; findUnique: (a: unknown) => Promise<AnyRow | null>; count: (a?: unknown) => Promise<number> }>)[model];
}

const LIST_INCLUDE: Partial<Record<EntityKey, unknown>> = {
  destinations: { region: { select: { name: true } }, _count: { select: { journeyStops: true } } },
  journeys: {},
  experiences: { destination: { select: { name: true } } },
  regions: { _count: { select: { destinations: true } } },
};

export async function loadList(def: EntityDef) {
  const model = delegate(def.model);
  const orderBy = def.hasOrder ? [{ sortOrder: "asc" as const }] : def.key === "articles" ? [{ publishedAt: "desc" as const }] : [{ createdAt: "desc" as const }];
  const rows = await model.findMany({ orderBy, include: LIST_INCLUDE[def.key] ?? undefined, take: 500 });

  return rows.map((row) => {
    const cells: { key: string; value: string }[] = [];
    for (const col of def.columns) {
      let value = "";
      switch (col.key) {
        case "region":
          value = String((row.region as AnyRow | null)?.name ?? "");
          break;
        case "destination":
          value = String((row.destination as AnyRow | null)?.name ?? "");
          break;
        case "journeyCount":
          value = String((row._count as { journeyStops?: number } | undefined)?.journeyStops ?? 0);
          break;
        case "destinationCount":
          value = String((row._count as { destinations?: number } | undefined)?.destinations ?? 0);
          break;
        case "duration":
          value = row.days ? `${row.days} days` : String(row.durationLabel ?? row.duration ?? "");
          break;
        case "kind": {
          // BIKE_TOUR is how it is stored; "Bike tour" is how it is read.
          const kind = String(row.kind ?? "").replace(/_/g, " ").toLowerCase();
          value = kind ? kind.charAt(0).toUpperCase() + kind.slice(1) : "";
          break;
        }
        case "publishedAt":
          value = row.publishedAt ? new Date(row.publishedAt as Date).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : "";
          break;
        case "verified":
          value = row.verifiedAt ? "Verified" : "Not verified";
          break;
        case "status":
          value = String(row.status ?? "");
          break;
        default:
          value = String(row[col.key] ?? "");
      }
      cells.push({ key: col.key, value });
    }
    return {
      id: String(row.id),
      title: String(row[def.titleField] ?? "Untitled"),
      status: String(row.status ?? "DRAFT"),
      publicPath: def.publicPath && row.slug ? def.publicPath({ slug: String(row.slug), kind: (row.kind as string) ?? null }) : null,
      cells,
      canPublish: true,
    };
  });
}

export async function loadRecord(def: EntityDef, id: string) {
  const model = delegate(def.model);
  return model.findUnique({ where: { id }, include: def.hasSeo ? { seo: { include: { customMetaTags: true } } } : undefined });
}

export async function loadMediaOptions(limit = 300): Promise<MediaOption[]> {
  const rows = await db.media.findMany({
    orderBy: { createdAt: "desc" },
    take: limit,
    select: { id: true, url: true, altText: true, title: true, width: true, height: true, licence: true },
  });
  return rows.map((m) => ({ id: m.id, url: m.url, alt: m.altText, title: m.title, width: m.width, height: m.height, licence: m.licence }));
}

/** The dropdowns on the Relations tab, per entity type. */
export async function loadRelationOptions(key: EntityKey, currentId: string | null) {
  const [regions, destinations, categories] = await Promise.all([
    db.region.findMany({ orderBy: { sortOrder: "asc" }, select: { id: true, name: true } }),
    db.destination.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true, state: true } }),
    db.category.findMany({ orderBy: [{ type: "asc" }, { sortOrder: "asc" }], select: { id: true, name: true, type: true } }),
  ]);

  const destinationOptions = destinations.filter((d) => d.id !== currentId).map((d) => ({ value: d.id, label: d.state ? `${d.name} — ${d.state}` : d.name }));

  switch (key) {
    case "destinations":
      return [
        { key: "regionId", label: "Region", help: "Which region this belongs to.", options: regions.map((r) => ({ value: r.id, label: r.name })) },
        { key: "parentId", label: "Part of", help: "For places inside another, like Gulmarg inside Kashmir.", options: destinationOptions },
      ];
    case "experiences":
      return [{ key: "destinationId", label: "Destination", help: "Where this experience happens.", options: destinationOptions }];
    case "articles":
      return [
        {
          key: "categoryId",
          label: "Category",
          options: categories.filter((c) => c.type === "ARTICLE_CATEGORY").map((c) => ({ value: c.id, label: c.name })),
        },
      ];
    case "faqs":
      return [
        {
          key: "categoryId",
          label: "Group",
          help: "Used to group questions on the FAQ page.",
          options: categories.filter((c) => c.type === "FAQ_CATEGORY").map((c) => ({ value: c.id, label: c.name })),
        },
      ];
    default:
      return [];
  }
}

export async function adminCounts() {
  const [destinations, journeys, experiences, articles, services, media, drafts, enquiriesNew, enquiriesWeek, notFound, redirects, unverifiedTestimonials, mediaNoAlt] =
    await Promise.all([
      db.destination.count({ where: { status: "PUBLISHED" } }),
      db.journey.count({ where: { status: "PUBLISHED" } }),
      db.experience.count({ where: { status: "PUBLISHED" } }),
      db.article.count({ where: { status: "PUBLISHED" } }),
      db.service.count({ where: { status: "PUBLISHED" } }),
      db.media.count(),
      Promise.all([
        db.destination.count({ where: { status: "DRAFT" } }),
        db.journey.count({ where: { status: "DRAFT" } }),
        db.experience.count({ where: { status: "DRAFT" } }),
        db.article.count({ where: { status: "DRAFT" } }),
        db.page.count({ where: { status: "DRAFT" } }),
      ]).then((n) => n.reduce((a, b) => a + b, 0)),
      db.enquiry.count({ where: { status: "NEW" } }),
      db.enquiry.count({ where: { createdAt: { gte: new Date(Date.now() - 7 * 864e5) } } }),
      db.notFoundLog.count({ where: { resolved: false } }),
      db.redirect.count({ where: { isActive: true } }),
      db.testimonial.count({ where: { verifiedAt: null } }),
      db.media.count({ where: { altText: "" } }),
    ]);

  return { destinations, journeys, experiences, articles, services, media, drafts, enquiriesNew, enquiriesWeek, notFound, redirects, unverifiedTestimonials, mediaNoAlt };
}

export async function recentActivity(limit = 8) {
  return db.auditLog.findMany({
    orderBy: { createdAt: "desc" },
    take: limit,
    select: { id: true, action: true, entityType: true, label: true, createdAt: true, user: { select: { name: true } } },
  });
}

export { getEntity };
