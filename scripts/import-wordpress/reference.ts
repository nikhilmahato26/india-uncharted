/**
 * Reference data the WordPress site never stored as fields: region membership,
 * parent places, destination type and approximate coordinates (public
 * geography, town centres to two decimals — verify before showing as precise).
 * Nothing here is a business claim.
 */

export type RegionRef = { slug: string; name: string; tagline: string | null; mapKey: string; sortOrder: number };

export const REGIONS: RegionRef[] = [
  { slug: "rajasthan", name: "Rajasthan", tagline: "Forts, desert towns and wildlife reserves", mapKey: "rajasthan", sortOrder: 1 },
  { slug: "north-india", name: "North India", tagline: "Delhi, the Taj Mahal and the sacred Ganges", mapKey: "north", sortOrder: 2 },
  { slug: "himalayas", name: "Himalayas", tagline: "Kashmir's valleys and the Himachal mountains", mapKey: "himalayas", sortOrder: 3 },
  { slug: "ladakh", name: "Ladakh", tagline: "High passes, monasteries and mountain lakes", mapKey: "ladakh", sortOrder: 4 },
  { slug: "goa", name: "Goa", tagline: "Beaches, yoga and slow coastal days", mapKey: "goa", sortOrder: 5 },
  { slug: "central-india", name: "Central India", tagline: "Temples and forests of the heartland", mapKey: "central", sortOrder: 6 },
  // No client content yet — created as DRAFT so the structure exists; hidden until populated.
  { slug: "kerala", name: "Kerala", tagline: null, mapKey: "kerala", sortOrder: 7 },
  { slug: "south-india", name: "South India", tagline: null, mapKey: "south", sortOrder: 8 },
  { slug: "east-india", name: "East India", tagline: null, mapKey: "east", sortOrder: 9 },
  { slug: "northeast-india", name: "Northeast India", tagline: null, mapKey: "northeast", sortOrder: 10 },
  { slug: "islands", name: "Islands", tagline: null, mapKey: "islands", sortOrder: 11 },
];

export type DestinationType =
  | "STATE"
  | "CITY"
  | "TOWN"
  | "NATIONAL_PARK"
  | "WILDLIFE_SANCTUARY"
  | "VALLEY"
  | "LAKE"
  | "VILLAGE"
  | "REGION_AREA";

export type DestinationRef = {
  /** slug in the new site */
  slug: string;
  /** WordPress taxonomy slug(s) that map here */
  wpSlugs: string[];
  name: string;
  title?: string;
  state: string;
  type: DestinationType;
  region: string;
  parent?: string;
  lat: number;
  lng: number;
  offbeat?: boolean;
  note?: string;
};

export const DESTINATIONS: DestinationRef[] = [
  { slug: "delhi", wpSlugs: ["delhi"], name: "Delhi", state: "Delhi", type: "CITY", region: "north-india", lat: 28.61, lng: 77.21 },
  { slug: "agra", wpSlugs: ["agra"], name: "Agra", state: "Uttar Pradesh", type: "CITY", region: "north-india", lat: 27.18, lng: 78.01 },
  { slug: "varanasi", wpSlugs: ["varanasi"], name: "Varanasi", state: "Uttar Pradesh", type: "CITY", region: "north-india", lat: 25.32, lng: 82.97 },
  { slug: "amritsar", wpSlugs: ["amritsar"], name: "Amritsar", state: "Punjab", type: "CITY", region: "north-india", lat: 31.63, lng: 74.87 },
  { slug: "chandigarh", wpSlugs: ["chandigarh"], name: "Chandigarh", state: "Chandigarh", type: "CITY", region: "north-india", lat: 30.73, lng: 76.78 },
  { slug: "haridwar", wpSlugs: ["haridwar"], name: "Haridwar", state: "Uttarakhand", type: "CITY", region: "north-india", lat: 29.95, lng: 78.16 },
  { slug: "rishikesh", wpSlugs: ["rishikesh"], name: "Rishikesh", state: "Uttarakhand", type: "TOWN", region: "north-india", lat: 30.09, lng: 78.27 },

  { slug: "jaipur", wpSlugs: ["jaipur"], name: "Jaipur", title: "The Pink City", state: "Rajasthan", type: "CITY", region: "rajasthan", lat: 26.91, lng: 75.79 },
  { slug: "jodhpur", wpSlugs: ["jodhpur"], name: "Jodhpur", title: "The Blue City", state: "Rajasthan", type: "CITY", region: "rajasthan", lat: 26.24, lng: 73.02 },
  { slug: "jaisalmer", wpSlugs: ["jaisalmer"], name: "Jaisalmer", title: "The Golden City", state: "Rajasthan", type: "CITY", region: "rajasthan", lat: 26.92, lng: 70.91 },
  { slug: "udaipur", wpSlugs: ["udaipur"], name: "Udaipur", title: "The City of Lakes", state: "Rajasthan", type: "CITY", region: "rajasthan", lat: 24.59, lng: 73.71 },
  { slug: "pushkar", wpSlugs: ["pushkar"], name: "Pushkar", state: "Rajasthan", type: "TOWN", region: "rajasthan", lat: 26.49, lng: 74.55 },
  { slug: "bikaner", wpSlugs: ["bikaner"], name: "Bikaner", state: "Rajasthan", type: "CITY", region: "rajasthan", lat: 28.02, lng: 73.31 },
  { slug: "bharatpur", wpSlugs: ["bharatpur"], name: "Bharatpur", state: "Rajasthan", type: "CITY", region: "rajasthan", lat: 27.22, lng: 77.49 },
  { slug: "ranthambore", wpSlugs: ["ranthambore", "ranthombore"], name: "Ranthambore", state: "Rajasthan", type: "NATIONAL_PARK", region: "rajasthan", lat: 26.02, lng: 76.5 },
  { slug: "sariska", wpSlugs: ["sariska"], name: "Sariska", state: "Rajasthan", type: "NATIONAL_PARK", region: "rajasthan", lat: 27.33, lng: 76.43 },
  { slug: "jawai", wpSlugs: ["jawai"], name: "Jawai", state: "Rajasthan", type: "REGION_AREA", region: "rajasthan", lat: 25.1, lng: 73.15, offbeat: true },
  { slug: "tal-chhapar", wpSlugs: ["tal-chhapar"], name: "Tal Chhapar", state: "Rajasthan", type: "WILDLIFE_SANCTUARY", region: "rajasthan", lat: 27.83, lng: 74.43, offbeat: true },
  {
    slug: "khichan",
    wpSlugs: ["khivhan"],
    name: "Khichan",
    state: "Rajasthan",
    type: "VILLAGE",
    region: "rajasthan",
    lat: 27.13,
    lng: 72.42,
    offbeat: true,
    note: 'WordPress term was "khivhan"; renamed to Khichan pending client confirmation.',
  },

  { slug: "kashmir", wpSlugs: ["kashmir"], name: "Kashmir", state: "Jammu & Kashmir", type: "VALLEY", region: "himalayas", lat: 34.08, lng: 74.8 },
  { slug: "srinagar", wpSlugs: ["srinagar"], name: "Srinagar", state: "Jammu & Kashmir", type: "CITY", region: "himalayas", parent: "kashmir", lat: 34.08, lng: 74.8 },
  { slug: "gulmarg", wpSlugs: ["gulmarg"], name: "Gulmarg", state: "Jammu & Kashmir", type: "TOWN", region: "himalayas", parent: "kashmir", lat: 34.05, lng: 74.38 },
  { slug: "pahalgam", wpSlugs: ["pahalgam"], name: "Pahalgam", state: "Jammu & Kashmir", type: "TOWN", region: "himalayas", parent: "kashmir", lat: 34.02, lng: 75.32 },
  { slug: "sonamarg", wpSlugs: ["sonamarg"], name: "Sonamarg", state: "Jammu & Kashmir", type: "TOWN", region: "himalayas", parent: "kashmir", lat: 34.3, lng: 75.29 },
  { slug: "yusmarg", wpSlugs: ["yusmarg"], name: "Yusmarg", state: "Jammu & Kashmir", type: "VALLEY", region: "himalayas", parent: "kashmir", lat: 33.83, lng: 74.66, offbeat: true },
  { slug: "doodhpathri", wpSlugs: ["doodhpathri"], name: "Doodhpathri", state: "Jammu & Kashmir", type: "VALLEY", region: "himalayas", parent: "kashmir", lat: 33.86, lng: 74.56, offbeat: true },
  { slug: "jammu", wpSlugs: ["jammu"], name: "Jammu", state: "Jammu & Kashmir", type: "CITY", region: "himalayas", lat: 32.73, lng: 74.86 },
  { slug: "himachal-pradesh", wpSlugs: ["himachal-pradesh"], name: "Himachal Pradesh", state: "Himachal Pradesh", type: "STATE", region: "himalayas", lat: 31.9, lng: 77.1 },
  { slug: "manali", wpSlugs: ["manali"], name: "Manali", state: "Himachal Pradesh", type: "TOWN", region: "himalayas", parent: "himachal-pradesh", lat: 32.24, lng: 77.19 },
  {
    slug: "jispa",
    wpSlugs: ["jaispa"],
    name: "Jispa",
    state: "Himachal Pradesh",
    type: "VILLAGE",
    region: "himalayas",
    parent: "himachal-pradesh",
    lat: 32.65,
    lng: 77.18,
    offbeat: true,
    note: 'WordPress term was "jaispa"; renamed to Jispa pending client confirmation.',
  },
  { slug: "sarchu", wpSlugs: ["sarchu"], name: "Sarchu", state: "Himachal Pradesh", type: "REGION_AREA", region: "himalayas", parent: "himachal-pradesh", lat: 32.93, lng: 77.58, offbeat: true },

  { slug: "leh", wpSlugs: ["leh"], name: "Leh", state: "Ladakh", type: "TOWN", region: "ladakh", lat: 34.15, lng: 77.58 },
  { slug: "nubra-valley", wpSlugs: ["nubra-valley"], name: "Nubra Valley", state: "Ladakh", type: "VALLEY", region: "ladakh", parent: "leh", lat: 34.54, lng: 77.56 },
  { slug: "pangong-lake", wpSlugs: ["pangong-lake"], name: "Pangong Lake", state: "Ladakh", type: "LAKE", region: "ladakh", parent: "leh", lat: 33.75, lng: 78.65 },

  { slug: "goa", wpSlugs: ["goa"], name: "Goa", state: "Goa", type: "STATE", region: "goa", lat: 15.3, lng: 74.12 },
  { slug: "khajuraho", wpSlugs: ["khajuraho"], name: "Khajuraho", state: "Madhya Pradesh", type: "TOWN", region: "central-india", lat: 24.85, lng: 79.93 },
];

export type CategoryRef = { slug: string; name: string; intro?: string };

export const TRAVEL_STYLES: CategoryRef[] = [
  { slug: "private", name: "Private" },
  { slug: "luxury", name: "Luxury" },
  { slug: "family", name: "Family" },
  { slug: "honeymoon", name: "Honeymoon" },
  { slug: "wildlife", name: "Wildlife" },
  { slug: "wellness-ayurveda", name: "Wellness & Ayurveda" },
  { slug: "food-culture", name: "Food & Culture" },
  { slug: "adventure", name: "Adventure" },
  { slug: "motorcycle", name: "Motorcycle Journeys" },
  { slug: "group-educational", name: "Group & Educational" },
];

export const EXPERIENCE_THEMES: CategoryRef[] = [
  { slug: "heritage", name: "Heritage" },
  { slug: "wildlife", name: "Wildlife" },
  { slug: "food", name: "Food" },
  { slug: "wellness", name: "Wellness" },
  { slug: "spiritual-india", name: "Spiritual India" },
  { slug: "village-life", name: "Village Life" },
  { slug: "photography", name: "Photography" },
  { slug: "adventure", name: "Adventure" },
];

export const ARTICLE_CATEGORIES: CategoryRef[] = [
  { slug: "yoga-wellness", name: "Yoga & Wellness" },
  { slug: "destination-guides", name: "Destination Guides" },
  { slug: "stays", name: "Where to Stay" },
];

/** The five packages the old homepage featured under "Special Packages". */
export const FEATURED_JOURNEYS = [
  "2-nights-3-days-golden-city-jaisalmer-tour-package",
  "rajasthan-wildlife-tour-package-6-days-5-nights",
  "7-day-yoga-wellness-retreat-goa",
  "golden-triangle-wildlife-tour-8-days-7-nights",
  "golden-triangle-tour-with-khajuraho-varanasi-10-days-9-nights",
];

/** Old homepage "Top Destinations". */
export const FEATURED_DESTINATIONS = ["agra", "jodhpur", "jaisalmer", "delhi"];

export const ACTIVITY_FORMAT: Record<string, "WALKING" | "FOOD_WALK" | "CYCLING" | "SIGHTSEEING" | "DESERT_EVENING"> = {
  "walking-tour": "WALKING",
  "food-walking-tour": "FOOD_WALK",
  "cycle-tour": "CYCLING",
  "sightseeing-tour": "SIGHTSEEING",
  "desert-evening-tour": "DESERT_EVENING",
};

/** Statements on the old site that need client confirmation before they are published. */
export const UNCONFIRMED_CLAIMS = [
  /24\s*\/\s*7/i,
  /round-the-clock/i,
  /strong hospitality partnerships/i,
  /sustainable and responsible travel practices/i,
  /100% verified/i,
  /trusted by travel+ers/i,
];
