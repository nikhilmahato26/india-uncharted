import type { PrismaClient } from "../../src/generated/prisma/client";
import type { SectionType } from "../../src/generated/prisma/enums";

/**
 * The homepage composition, in the order the developer brief specifies.
 * Copy is either the brief's own wording or the client's existing words from
 * the old site — nothing here claims anything the client hasn't said.
 * Every one of these is editable in the admin afterwards.
 */
export async function homeSections(db: PrismaClient): Promise<{ type: SectionType; props: Record<string, unknown> }[]> {
  const pick = async (fragment: string) => {
    const m = await db.media.findFirst({ where: { publicId: { contains: fragment } }, select: { id: true } });
    return m?.id;
  };

  const [hero, deeper, ride, planCta, philosophy] = await Promise.all([
    pick("jaisalmer124"), // camel caravan on the dunes at dusk
    pick("jodq"), // Jodhpur doorway
    pick("l2h"), // the Manali–Leh road
    pick("udaipu45"), // Udaipur at night
    pick("pushkar32"),
  ]);

  return [
    {
      type: "HERO",
      props: {
        mediaId: hero,
        titleLead: "India,",
        titleAccent: "beyond the obvious.",
        lead: "Private, tailor-made journeys across India, designed by a small team in Jodhpur.",
        inscription: "Private journeys · India",
        caption: "Jaisalmer, Rajasthan · 26.92°N 70.91°E",
        secondaryLabel: "Explore India",
        secondaryHref: "/destinations",
        primaryLabel: "Plan My Journey",
        primaryHref: "/plan-my-journey",
      },
    },
    {
      type: "IMAGE_TEXT",
      props: {
        variant: "editorial",
        heading: "India is not a destination. It is a thousand stories.",
        body:
          "We believe travel is more than visiting places — it is about experiencing the soul of India. Every journey we design goes beyond sightseeing, so you meet the country through its traditions, stories and everyday life.",
        ctaLabel: "Discover our approach",
        ctaHref: "/about",
      },
    },
    {
      type: "IMAGE_TEXT",
      props: {
        variant: "plate",
        mediaId: deeper,
        heading: "Go deeper into India",
        body: "From royal forts and sacred rivers to quiet villages and untouched landscapes, we plan journeys around the places most travellers pass by.",
        ctaLabel: "Explore destinations",
        ctaHref: "/destinations",
      },
    },
    {
      type: "DESTINATION_GRID",
      props: {
        source: "discover",
        variant: "editorial",
        heading: "Discover India",
        lead: "Start with the places that shape most first journeys — then keep going.",
        limit: 6,
        minItems: 3,
        ctaLabel: "View all destinations",
        ctaHref: "/destinations",
      },
    },
    {
      type: "REGION_CAROUSEL",
      props: { heading: "Explore India by region", lead: "Rajasthan's desert cities, the Himalayan valleys, Ladakh's high passes and the Goan coast.", minItems: 3 },
    },
    {
      type: "JOURNEY_GRID",
      props: {
        source: "featured",
        variant: "grid",
        heading: "Featured journeys",
        lead: "A few of the routes we plan most often. Every one is private and adjusted to your dates.",
        limit: 4,
        minItems: 2,
        ctaLabel: "All journeys",
        ctaHref: "/journeys",
      },
    },
    {
      type: "DESTINATION_GRID",
      props: {
        source: "offbeat",
        variant: "index",
        heading: "Off the usual route",
        lead: "A crane village in the Thar, blackbuck grassland, leopard hills and the high stops on the road to Ladakh — places already on our routes.",
        limit: 6,
        minItems: 3,
        ctaLabel: "All destinations",
        ctaHref: "/destinations",
      },
    },
    {
      type: "CARD_GRID",
      props: {
        source: "travel-styles",
        featuredSlug: "motorcycle",
        heading: "Travel your way",
        lead: "The same country, planned around what you actually want from it.",
        minItems: 3,
      },
    },
    {
      type: "JOURNEY_GRID",
      props: {
        source: "bike",
        variant: "cinematic",
        mediaId: ride,
        heading: "Ride India. Feel every mile.",
        lead: "Motorcycle expeditions across Rajasthan and the Manali–Leh road.",
        limit: 6,
        minItems: 1,
        ctaLabel: "All bike tours",
        ctaHref: "/bike-tours",
      },
    },
    {
      type: "INDIA_MAP",
      props: {
        heading: "Where we travel",
        lead: "Every destination we currently plan journeys through, plotted by coordinate.",
        ctaLabel: "All destinations",
        ctaHref: "/destinations",
      },
    },
    {
      type: "EXPERIENCE_GRID",
      props: {
        source: "themes",
        heading: "Experiences",
        lead: "Walks, food trails, safaris and yoga — the days that make a journey specific.",
        limit: 8,
        minItems: 3,
      },
    },
    {
      type: "IMAGE_TEXT",
      props: {
        variant: "split",
        mediaId: philosophy,
        imageSide: "right",
        heading: "We don't just plan trips. We design experiences.",
        body: "No two travellers are the same — and neither are our itineraries. We design tailor-made journeys around your interests, travel style and pace.",
        pillars: [
          { title: "Private", body: "Your journey is yours: your vehicle, your guide, your pace. Nothing is shared with a group you didn't choose." },
          { title: "Personal", body: "We plan around what you actually want from India, and adjust the route until it fits." },
          { title: "Authentic", body: "Heritage walks, local food trails and offbeat routes that show the everyday country, not only its monuments." },
        ],
        ctaLabel: "About India Uncharted",
        ctaHref: "/about",
      },
    },
    { type: "TESTIMONIALS", props: { heading: "Guest stories", minItems: 3 } },
    { type: "ARTICLE_GRID", props: { heading: "Travel journal", lead: "Guides and notes from the places we travel.", limit: 3, minItems: 3 } },
    {
      type: "CTA",
      props: {
        mediaId: planCta,
        heading: "Where will your India story begin?",
        lead: "Tell us your dates and what you want from India. We'll design the journey around them.",
        ctaLabel: "Plan My Journey",
        ctaHref: "/plan-my-journey",
      },
    },
    { type: "NEWSLETTER", props: { heading: "Stories from India, occasionally" } },
  ];
}
