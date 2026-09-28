import type { Metadata } from "next";
import { getHomeData } from "@/lib/content/home";
import { getPage } from "@/lib/content/editorial";
import { getSiteSettings } from "@/lib/content/settings";
import { resolveSectionMedia } from "@/lib/content/section-media";
import { resolveMetadata } from "@/lib/seo/metadata";
import { SectionList } from "@/components/sections/home";

export async function generateMetadata(): Promise<Metadata> {
  const page = await getPage("home");
  return resolveMetadata({
    kind: "PAGE",
    // The homepage is what brand searches land on, so its title leads with the name
    // rather than the hero line. An editor's SEO title in the CMS still wins.
    name: "India Uncharted: Private India Tours & Tailor-Made Holidays",
    path: "/",
    seo: page?.seo,
    description:
      page?.intro ??
      "Private, tailor-made journeys across India — Rajasthan's desert cities, Kashmir's valleys, Ladakh's high passes, Goa's yoga retreats and the places most travellers miss.",
  });
}

export default async function HomePage() {
  const [page, data, settings] = await Promise.all([getPage("home"), getHomeData(), getSiteSettings()]);
  const sections = page?.sections ?? [];
  const media = await resolveSectionMedia(sections);
  return <SectionList sections={sections} ctx={{ data, media, settings }} />;
}
