import { describe, expect, it } from "vitest";
import { slugify, uniqueSlug, isReservedSlug, SLUG_PATTERN } from "@/lib/slug";
import { toE164, formatPhone, whatsappHref, whatsappMessage } from "@/lib/phone";
import { normalizePath, normalizeTarget, collapseChains, createsLoop } from "@/lib/redirects";
import { can } from "@/lib/auth/rbac";
import { dedupeMeta, displayName, durationText, priceText, seasonSummary } from "@/lib/content/cards";
import { summarize } from "@/lib/richtext/text";
import { cloudinarySignature } from "@/lib/media/store";
import { isSafeLink, sectionTitle } from "@/lib/sections/editor";
import { consentCookie, hasTrackers, isTrackerCookie, parseConsent, trackerNames } from "@/lib/analytics";

describe("slugs", () => {
  it("makes URL-safe slugs from product names", () => {
    expect(slugify("Kashmir Honeymoon Tour Package (6 Days / 5 Nights)")).toBe("kashmir-honeymoon-tour-package-6-days-5-nights");
    expect(slugify("Jaisalmer & Jodhpur — Student Group")).toBe("jaisalmer-and-jodhpur-student-group");
    expect(slugify("Humayun’s Tomb")).toBe("humayuns-tomb");
    expect(SLUG_PATTERN.test(slugify("  Multiple   spaces  "))).toBe(true);
  });

  it("protects route segments the app owns", () => {
    expect(isReservedSlug("themes")).toBe(true);
    expect(isReservedSlug("jaipur")).toBe(false);
  });

  it("suffixes a slug that is already taken", async () => {
    const taken = new Set(["goa", "goa-2"]);
    expect(await uniqueSlug("Goa", async (c) => taken.has(c))).toBe("goa-3");
  });

  it("never hands back a reserved slug unchanged", async () => {
    expect(await uniqueSlug("search", async () => false)).toBe("search-1");
  });
});

describe("phone numbers", () => {
  it("normalises every way the client's number is written", () => {
    for (const input of ["+91-8005967178", "+91 80059 67178", "08005967178", "8005967178", " +918005967178 "]) {
      expect(toE164(input)).toBe("+918005967178");
    }
  });

  it("returns null for something that is not a number", () => {
    expect(toE164("call me")).toBeNull();
    expect(toE164("")).toBeNull();
    expect(toE164(null)).toBeNull();
  });

  it("formats for display and builds a wa.me link with digits only", () => {
    expect(formatPhone("+918005967178")).toBe("+91 80059 67178");
    expect(whatsappHref("+918005967178")).toBe("https://wa.me/918005967178");
    expect(whatsappHref("+918005967178", "Hello there")).toContain("?text=Hello%20there");
  });

  it("writes a message that names the journey", () => {
    expect(whatsappMessage({ entityName: "Rajasthan Motorcycle Tour", url: null })).toContain("Rajasthan Motorcycle Tour");
  });
});

describe("redirect paths", () => {
  it("normalises the shapes WordPress URLs arrive in", () => {
    expect(normalizePath("/About-Us/")).toBe("/about-us");
    expect(normalizePath("https://indiauncharted.com/destination/agra/?utm=x#top")).toBe("/destination/agra");
    expect(normalizePath("destination//agra//")).toBe("/destination/agra");
    expect(normalizePath("/")).toBe("/");
  });

  it("keeps a query string on the target", () => {
    expect(normalizeTarget("/experiences?format=walking")).toBe("/experiences?format=walking");
    expect(normalizeTarget("/Destinations/")).toBe("/destinations");
  });

  it("collapses a chain so every hop points at the final page", () => {
    const { rules } = collapseChains([
      { fromPath: "/a", toPath: "/b", statusCode: 301 },
      { fromPath: "/b", toPath: "/c", statusCode: 301 },
    ]);
    expect(rules.find((r) => r.fromPath === "/a")?.toPath).toBe("/c");
  });

  it("detects a loop before it is saved", () => {
    const existing = [{ fromPath: "/b", toPath: "/a", statusCode: 301 }];
    expect(createsLoop({ fromPath: "/a", toPath: "/b", statusCode: 301 }, existing)).toBe(true);
    expect(createsLoop({ fromPath: "/a", toPath: "/c", statusCode: 301 }, existing)).toBe(false);
  });
});

describe("roles", () => {
  it("lets editors write but not publish or delete", () => {
    expect(can("EDITOR", "content.edit")).toBe(true);
    expect(can("EDITOR", "content.publish")).toBe(false);
    expect(can("EDITOR", "content.delete")).toBe(false);
    expect(can("EDITOR", "seo.global")).toBe(false);
  });

  it("keeps users and head settings for the super admin alone", () => {
    expect(can("ADMIN", "users.manage")).toBe(false);
    expect(can("ADMIN", "seo.head")).toBe(false);
    expect(can("SUPER_ADMIN", "users.manage")).toBe(true);
  });

  it("denies everything when there is no session", () => {
    expect(can(null, "content.edit")).toBe(false);
  });
});

describe("card formatting", () => {
  it("strips the duration out of a product name, which has its own line", () => {
    expect(displayName("Kashmir Honeymoon Tour Package (6 Days / 5 Nights)")).toBe("Kashmir Honeymoon Tour Package");
    expect(displayName("Rajasthan Motorcycle Tour")).toBe("Rajasthan Motorcycle Tour");
    expect(displayName("2 Nights 3 Days Jaisalmer Tour")).toBe("Jaisalmer Tour");
    expect(displayName("7 Days Golden Triangle")).toBe("Golden Triangle");
  });

  it("says each fact in a meta line once", () => {
    expect(dedupeMeta(["Private journey", "8 days · 7 nights", "Private / On Demand"])).toEqual(["Private journey", "8 days · 7 nights"]);
    expect(dedupeMeta(["Bike tour", "12 days", "Group Tour"])).toEqual(["Bike tour", "12 days", "Group Tour"]);
    expect(dedupeMeta([null, "  ", "Retreat"])).toEqual(["Retreat"]);
  });

  it("summarises a best-time paragraph as its month ranges", () => {
    expect(seasonSummary("Ideal flying seasons:\nMarch to June September to November\nThese months provide stable weather.")).toBe("March to June · September to November");
    expect(seasonSummary("March to June → Pleasant weather & greenery October to November → Autumn colours December to February → Snowfall")).toBe("March to June · October to November · December to February");
    expect(seasonSummary("Goa is a year-round destination, but the ideal period is:\nOctober to March\nPleasant temperatures")).toBe("October to March");
    expect(seasonSummary("Any time of year suits a city walk.")).toBe("Any time of year suits a city walk");
    expect(seasonSummary(null)).toBeNull();
  });

  it("cuts an intro on a sentence, never mid-word", () => {
    const text = "Delhi is the capital city of India and holds Mughal monuments. It also has modern markets.";
    expect(summarize(text, 80)).toBe("Delhi is the capital city of India and holds Mughal monuments.");
    // Keeping a sentence that throws away most of the text is worse than an ellipsis.
    expect(summarize("Delhi is the capital. It holds Mughal monuments and modern markets.", 40)).toMatch(/…$/);
    expect(summarize("A single very long sentence that simply keeps going and going without a full stop", 40)).toMatch(/…$/);
    expect(summarize("Short enough.", 40)).toBe("Short enough.");
  });

  it("never invents a price", () => {
    expect(priceText(true, null)).toBe("Price on request");
    expect(priceText(true, 45000)).toBe("Price on request");
    expect(priceText(false, 45000)).toBe("From ₹45,000");
  });

  it("writes durations the way the site reads them", () => {
    expect(durationText(8, 7)).toBe("8 days · 7 nights");
    expect(durationText(1, null)).toBe("1 days");
    expect(durationText(null, null, "Long-term")).toBe("Long-term");
  });
});

describe("cloudinary", () => {
  it("signs requests the way Cloudinary's documentation does", () => {
    // The worked example from Cloudinary's upload API authentication docs.
    const params = { eager: "w_400,h_300,c_pad|w_260,h_200,c_crop", public_id: "sample_image", timestamp: 1315060510 };
    expect(cloudinarySignature(params, "abcd")).toBe("bfd09f95f331f558cbd1320e67aa8d488770583e");
  });

  it("leaves empty values out of the signature", () => {
    expect(cloudinarySignature({ public_id: "a", folder: "", timestamp: 1 }, "s")).toBe(cloudinarySignature({ public_id: "a", timestamp: 1 }, "s"));
  });
});

describe("homepage editor", () => {
  it("accepts links to this site and to real web addresses", () => {
    for (const ok of ["/plan-my-journey", "/journeys?style=wildlife", "#faq", "https://indiauncharted.com/about", "mailto:indiaunchartedtravel@gmail.com", "tel:+918005967178"]) {
      expect(isSafeLink(ok), ok).toBe(true);
    }
  });

  it("refuses links that could run code or leave for another host unnoticed", () => {
    for (const bad of ["javascript:alert(1)", "JavaScript:alert(1)", "data:text/html,<script>", "//evil.example", "vbscript:msgbox", "plan-my-journey", ""]) {
      expect(isSafeLink(bad), bad).toBe(false);
    }
  });

  it("names a section by its own heading, or by what it is", () => {
    expect(sectionTitle("HERO", { titleLead: "India,", titleAccent: "beyond the obvious." })).toBe("India, beyond the obvious.");
    expect(sectionTitle("JOURNEY_GRID", { heading: "Ride India" })).toBe("Ride India");
    expect(sectionTitle("REGION_CAROUSEL", {})).toBe("Explore India by region");
  });
});

describe("analytics consent", () => {
  it("reads a stored choice for the current version only", () => {
    expect(parseConsent("theme=dark; iu_consent=granted.v1; other=1")).toBe("granted");
    expect(parseConsent("iu_consent=denied.v1")).toBe("denied");
    // An older version means the trackers changed since they chose: ask again.
    expect(parseConsent("iu_consent=granted.v0")).toBeNull();
    expect(parseConsent("iu_consent=maybe.v1")).toBeNull();
    expect(parseConsent("xiu_consent=granted.v1")).toBeNull();
    expect(parseConsent("")).toBeNull();
  });

  it("writes a cookie that reads back the same, secure on https", () => {
    const cookie = consentCookie("granted", true);
    expect(parseConsent(cookie.split(";")[0]!)).toBe("granted");
    expect(cookie).toContain("SameSite=Lax");
    expect(cookie).toContain("Secure");
    expect(consentCookie("denied", false)).not.toContain("Secure");
  });

  it("names only the trackers actually configured", () => {
    const none = { ga4Id: null, gtmId: null, metaPixelId: null, consentRequired: true };
    expect(hasTrackers(none)).toBe(false);
    expect(trackerNames({ ...none, ga4Id: "G-ABC" })).toEqual(["Google Analytics"]);
    expect(trackerNames({ ...none, gtmId: "GTM-ABC", metaPixelId: "123" })).toEqual(["Google Analytics", "Meta Pixel"]);
  });

  it("clears tracker cookies and nothing else", () => {
    for (const name of ["_ga", "_ga_ABC123", "_gid", "_gat_UA", "_fbp", "_fbc"]) expect(isTrackerCookie(name), name).toBe(true);
    for (const name of ["iu_session", "iu_consent", "__Secure-next-auth", "_gallery"]) expect(isTrackerCookie(name), name).toBe(false);
  });
});
