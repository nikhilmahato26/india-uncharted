/**
 * The shape the package seeders read. Deliberately flat: one object per thing a
 * guest can book, with the copy written out rather than assembled from
 * fragments, so what ships is what someone actually reads.
 *
 * `image` names a pool in the media library, not a file — the seeder rotates
 * within the pool so neighbouring cards do not repeat. Swap a record's hero in
 * the CMS and the seeder leaves it alone on the next run.
 */

export type ImagePool = "thar-dunes" | "thar-camp" | "jaisalmer" | "jodhpur" | "rajasthan-culture" | "goa-beach" | "goa-yoga" | "goa-wellness" | "goa-heritage" | "goa-nature" | "goa-luxury" | "goa-food";

export type ExperienceSeed = {
  slug: string;
  name: string;
  /** Destination slug the experience hangs off. */
  destination: string;
  format: "WALKING" | "FOOD_WALK" | "CYCLING" | "SIGHTSEEING" | "DESERT_EVENING" | "OTHER";
  location: string;
  duration: string;
  bestTime: string;
  idealFor: string;
  /** Category slugs (EXPERIENCE_THEME). First one becomes the card's chip. */
  themes: string[];
  /** Two or three lines. This is the card copy, so it has to stand alone. */
  short: string;
  /** Body paragraphs for the detail page. */
  body: string[];
  highlights: string[];
  inclusions: string[];
  image: ImagePool;
};

export type JourneySeed = {
  slug: string;
  name: string;
  kind: "JOURNEY" | "RETREAT";
  days: number;
  nights: number;
  /** Destination slugs, in route order. */
  stops: string[];
  /** Category slugs (TRAVEL_STYLE). First one becomes the card's chip. */
  styles: string[];
  bestTime: string;
  idealFor: string;
  short: string;
  body: string[];
  highlights: string[];
  inclusions: string[];
  /** Day-by-day. `to` groups a range ("Days 4–6"). */
  itinerary: { day: number; to?: number; title: string; body: string; overnight?: string }[];
  image: ImagePool;
  featured?: boolean;
};

export type CategorySeed = { type: "TRAVEL_STYLE" | "EXPERIENCE_THEME"; slug: string; name: string; intro: string };

export type DestinationSeed = {
  slug: string;
  name: string;
  title?: string;
  type: "STATE" | "CITY" | "TOWN" | "VILLAGE" | "REGION_AREA";
  state: string;
  region: string;
  parent?: string;
  latitude?: number;
  longitude?: number;
  short: string;
  intro: string[];
  whyVisit?: string[];
  bestTime: string;
  recommendedDuration: string;
  howToReach?: string;
  /** PLACE_TO_VISIT highlights — these are what the parent page lists as "where we send people". */
  places: { title: string; body: string }[];
  image: ImagePool;
};
