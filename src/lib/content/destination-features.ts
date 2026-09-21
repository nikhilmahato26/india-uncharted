/**
 * A destination with three journeys is served by the plain grids in the page
 * template. A destination with forty is not: without a way to narrow them, the
 * page becomes a wall. This config names the places that have outgrown the
 * template and says how their catalogue should be cut.
 *
 * Nothing here invents content. Every filter matches category slugs that are
 * already on the records (journey travel styles, experience themes), so a chip
 * that matches nothing simply does not render.
 */

export type ItemKind = "JOURNEY" | "RETREAT" | "COURSE" | "BIKE_TOUR" | "EXPERIENCE";

/**
 * One chip in the filter bar. `match` holds category slugs, `kinds` matches the
 * record type. A chip needs to cut the list somewhere the others do not: two
 * chips over the same category slug are two ways of showing the same grid.
 */
export type CollectionFilter = {
  key: string;
  label: string;
  match?: string[];
  kinds?: ItemKind[];
};

/** A "who is this trip for" card. Selecting one applies its match set to the collection. */
export type TravellerCut = {
  key: string;
  label: string;
  blurb: string;
  match: string[];
};

export type DestinationFeature = {
  /** Section headings for the filterable catalogue. */
  collection: { heading: string; lead: string };
  filters: CollectionFilter[];
  travellers?: { heading: string; lead: string; items: TravellerCut[] };
  /** Named sub-areas, matched against child destinations by slug. */
  areas?: { heading: string; lead: string };
  /** Slugs (journey or experience) shown large, above the catalogue. */
  signature?: { heading: string; lead: string; slugs: string[] };
};

const GOA_FILTERS: CollectionFilter[] = [
  { key: "tours", label: "Tours", kinds: ["JOURNEY"] },
  { key: "yoga", label: "Yoga", match: ["yoga"] },
  { key: "wellness", label: "Wellness", match: ["wellness", "wellness-ayurveda"] },
  { key: "ayurveda", label: "Ayurveda", match: ["ayurveda"] },
  { key: "beach", label: "Beach", match: ["beach"] },
  { key: "culture", label: "Culture", match: ["heritage", "village-life", "spiritual-india"] },
  { key: "adventure", label: "Adventure", match: ["adventure"] },
  { key: "food", label: "Food", match: ["food", "food-culture"] },
  { key: "nature", label: "Nature", match: ["nature", "wildlife"] },
  { key: "luxury", label: "Luxury", match: ["luxury"] },
];

const GOA_TRAVELLERS: TravellerCut[] = [
  { key: "couples", label: "Goa for Couples", blurb: "Quiet south-coast beaches, long lunches and sunset boats, with nothing on the clock.", match: ["honeymoon", "beach", "luxury"] },
  { key: "honeymoon", label: "Goa for Honeymoon", blurb: "A private villa or beachfront suite, a sunset cruise, and a dinner laid on the sand.", match: ["honeymoon"] },
  { key: "families", label: "Goa for Families", blurb: "Calm swimming beaches, a spice plantation lunch and boat trips small children actually enjoy.", match: ["family"] },
  { key: "solo", label: "Goa for Solo Travellers", blurb: "Retreats where arriving alone is normal — shared meals, morning practice, your own room.", match: ["yoga", "wellness"] },
  { key: "friends", label: "Goa for Friends", blurb: "North Goa cafés and markets, water sports by day, and someone else driving at night.", match: ["adventure", "beach"] },
  { key: "yoga", label: "Goa for Yoga Lovers", blurb: "Daily asana and pranayama with teachers who have taught here for years, not for a season.", match: ["yoga"] },
  { key: "wellness", label: "Goa for Wellness Travellers", blurb: "Ayurveda, bodywork, meditation and food that belongs to the treatment, not beside it.", match: ["wellness", "wellness-ayurveda", "ayurveda"] },
  { key: "luxury", label: "Goa for Luxury Travellers", blurb: "Beachfront suites, a car and driver throughout, and a yacht for the evening you want it.", match: ["luxury"] },
  { key: "food", label: "Goa for Food Lovers", blurb: "Fishing-village kitchens, Saraswat home cooking, and the markets the cooks buy from.", match: ["food", "food-culture"] },
  { key: "adventure", label: "Goa for Adventure Travellers", blurb: "Diving off Grande Island, kayaking the backwaters, and the trek in to Dudhsagar.", match: ["adventure"] },
  { key: "slow", label: "Goa for Slow Travellers", blurb: "One village, two weeks, a bicycle. The Goa that starts once the week-trippers leave.", match: ["slow-travel", "village-life"] },
];

/**
 * Everything on a Thar page is a desert trip, so "desert" is not a filter — it
 * is the page. These cut by the things that actually differ between two safaris:
 * how long it takes, whether it is about the sand or the people, and how private.
 */
const THAR_FILTERS: CollectionFilter[] = [
  { key: "day", label: "Day safaris", kinds: ["EXPERIENCE"] },
  { key: "multiday", label: "Multi-day", kinds: ["JOURNEY"] },
  { key: "village", label: "Village & culture", match: ["village-life", "heritage"] },
  { key: "offbeat", label: "Offbeat & photography", match: ["photography"] },
  { key: "adventure", label: "Adventure", match: ["adventure"] },
  { key: "luxury", label: "Luxury & private", match: ["luxury"] },
];

export const destinationFeatures: Record<string, DestinationFeature> = {
  goa: {
    collection: {
      heading: "Goa packages & experiences",
      lead: "Holidays, retreats and single days, all private and all adjusted to your dates. Filter to the kind of Goa you came for.",
    },
    filters: GOA_FILTERS,
    travellers: {
      heading: "Find your Goa",
      lead: "The same coastline reads differently depending on who you arrive with. Pick the one that sounds like your trip.",
      items: GOA_TRAVELLERS,
    },
    areas: {
      heading: "North Goa and South Goa",
      lead: "Two halves of one state that want different things from you. Most good trips use both.",
    },
    signature: {
      heading: "Signature India Uncharted journeys",
      lead: "Five journeys we designed ourselves, each built around one idea rather than a list of sights.",
      slugs: [
        "the-goa-soul-journey",
        "the-goa-slow-living-experience",
        "the-goa-wellness-escape",
        "the-goa-uncharted-experience",
        "the-goa-coastal-journey",
      ],
    },
  },
  jaisalmer: {
    collection: {
      heading: "Jaisalmer safaris & desert packages",
      lead: "Camel and jeep safaris, overnight camps and multi-day desert journeys. Everything below is private.",
    },
    filters: THAR_FILTERS,
  },
  jodhpur: {
    collection: {
      heading: "Jodhpur safaris & desert packages",
      lead: "Day safaris out to Osian, overnight desert camps and the routes that run on to Jaisalmer.",
    },
    filters: THAR_FILTERS,
  },
  osian: {
    collection: {
      heading: "Osian safaris & desert experiences",
      lead: "The dunes an hour from Jodhpur, with the eighth-century temples on the way in.",
    },
    filters: THAR_FILTERS,
  },
};

export function featureFor(slug: string): DestinationFeature | null {
  return destinationFeatures[slug] ?? null;
}
