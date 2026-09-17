import { db } from "@/lib/db";
import { requireCapability } from "@/lib/auth/session";
import { can } from "@/lib/auth/rbac";
import { loadMediaOptions } from "@/lib/admin/load";
import { PageHeader } from "@/components/admin/ui";
import { LinkButton } from "@/components/ui/button";
import { HomepageEditor, type EditorSection } from "@/components/admin/homepage-editor";
import { EDITABLE_SECTION_TYPES, SECTION_EDITOR, isEditableSectionType, sectionTitle } from "@/lib/sections/editor";
import { DISCOVER_DEFAULT_SLUGS } from "@/lib/sections/defaults";

export const metadata = { title: "Homepage" };
// Behind a sign-in and always fresh from the database: allowed to block on navigation.
export const instant = false;

/**
 * What a section's stored props look like to the editor. A destination section
 * still on the old built-in list is shown as "places I choose" with that same
 * list filled in, so saving it without changes keeps the page exactly as it is.
 */
function forEditor(type: string, props: Record<string, unknown>): Record<string, unknown> {
  if (type === "DESTINATION_GRID" && props.source !== "offbeat") {
    const slugs = Array.isArray(props.slugs) && props.slugs.length ? props.slugs : DISCOVER_DEFAULT_SLUGS;
    return { ...props, source: "manual", slugs };
  }
  if (type === "JOURNEY_GRID" && props.source !== "bike") return { ...props, source: "featured" };
  return props;
}

export default async function HomepageEditorPage() {
  const user = await requireCapability("content.edit");
  const home = await db.page.findFirst({ where: { key: "home" }, select: { id: true } });

  const [rows, media, destinations, styles] = await Promise.all([
    home
      ? db.section.findMany({ where: { ownerType: "PAGE", ownerId: home.id }, orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }], select: { id: true, type: true, props: true, isVisible: true } })
      : Promise.resolve([]),
    loadMediaOptions(),
    db.destination.findMany({ where: { status: "PUBLISHED", heroId: { not: null } }, orderBy: { name: "asc" }, select: { slug: true, name: true } }),
    db.category.findMany({ where: { type: "TRAVEL_STYLE", status: "PUBLISHED" }, orderBy: { sortOrder: "asc" }, select: { slug: true, name: true } }),
  ]);

  const sections: EditorSection[] = rows.map((r) => {
    const props = (r.props ?? {}) as Record<string, unknown>;
    return {
      id: r.id,
      type: r.type,
      editable: isEditableSectionType(r.type),
      isVisible: r.isVisible,
      title: sectionTitle(r.type, props),
      props: forEditor(r.type, props),
    };
  });

  return (
    <>
      <PageHeader
        title="Homepage"
        description="Each block is one section of the homepage, in the order visitors see them. Saved changes appear on the site straight away."
        actions={
          <LinkButton href="/" target="_blank" rel="noopener noreferrer" variant="secondary" size="sm">
            View homepage
          </LinkButton>
        }
      />
      {home ? (
        <HomepageEditor
          sections={sections}
          media={media}
          destinations={destinations}
          styles={styles}
          canPublish={can(user.role, "content.publish")}
          canDelete={can(user.role, "content.delete")}
          addable={EDITABLE_SECTION_TYPES.map((type) => ({ type, label: SECTION_EDITOR[type].label, description: SECTION_EDITOR[type].description }))}
        />
      ) : (
        <p className="border border-danger/40 bg-danger-soft px-4 py-3 text-small text-danger">The homepage record is missing. Ask your developer to run the database seed.</p>
      )}
    </>
  );
}
