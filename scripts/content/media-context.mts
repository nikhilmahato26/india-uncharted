/**
 * Every image without alt text, with where it appears. Alt text describes what
 * the photograph shows; the context only says which page it sits on, so a place
 * is named when the picture is recognisably that place, not merely because of it.
 *   npx tsx scripts/content/media-context.mts > media.json
 */
import { db } from "./db.mts";

async function main() {
  const rows = await db.media.findMany({
    where: { altText: "" },
    orderBy: { publicId: "asc" },
    select: {
      id: true, publicId: true, url: true, width: true, height: true, title: true, sourceUrl: true,
      destinationHeroes: { select: { name: true } },
      journeyHeroes: { select: { name: true } },
      experienceHeroes: { select: { name: true } },
      articleHeroes: { select: { title: true } },
      regionHeroes: { select: { name: true } },
      categoryHeroes: { select: { name: true } },
      serviceHeroes: { select: { name: true } },
      pageHeroes: { select: { title: true } },
      highlightImages: { select: { title: true, destination: { select: { name: true } } } },
      vehicles: { select: { name: true } },
      settingsLogo: { select: { id: true } },
      settingsLogoLight: { select: { id: true } },
      settingsFavicon: { select: { id: true } },
      usages: { select: { entityType: true, role: true } },
    },
  });
  const out = rows.map((m, i) => ({
    n: i + 1,
    publicId: m.publicId,
    url: m.url,
    size: `${m.width}x${m.height}`,
    title: m.title,
    usedOn: [
      ...m.destinationHeroes.map((x) => `destination hero: ${x.name}`),
      ...m.journeyHeroes.map((x) => `journey hero: ${x.name}`),
      ...m.experienceHeroes.map((x) => `experience hero: ${x.name}`),
      ...m.articleHeroes.map((x) => `article hero: ${x.title}`),
      ...m.regionHeroes.map((x) => `region hero: ${x.name}`),
      ...m.categoryHeroes.map((x) => `category hero: ${x.name}`),
      ...m.serviceHeroes.map((x) => `service hero: ${x.name}`),
      ...m.pageHeroes.map((x) => `page hero: ${x.title}`),
      ...m.highlightImages.map((x) => `highlight: ${x.title} (${x.destination.name})`),
      ...m.vehicles.map((x) => `vehicle: ${x.name}`),
      ...(m.settingsLogo.length ? ["site logo"] : []),
      ...(m.settingsLogoLight.length ? ["site logo (light)"] : []),
      ...(m.settingsFavicon.length ? ["favicon"] : []),
      ...m.usages.map((u) => `${u.entityType.toLowerCase()} ${u.role.toLowerCase()}`),
    ],
  }));
  console.log(JSON.stringify(out, null, 1));
  console.error(`${out.length} images without alt text; ${out.filter((o) => !o.usedOn.length).length} not used anywhere`);
  await db.$disconnect();
}
main();
