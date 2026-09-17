import { describe, expect, it } from "vitest";
import { slugify, uniqueSlug, isReservedSlug, SLUG_PATTERN } from "@/lib/slug";
import { toE164, formatPhone, whatsappHref, whatsappMessage } from "@/lib/phone";
import { normalizePath, normalizeTarget, collapseChains, createsLoop } from "@/lib/redirects";
import { can } from "@/lib/auth/rbac";
import { dedupeMeta, displayName, durationText, priceText, seasonSummary } from "@/lib/content/cards";
import { summarize } from "@/lib/richtext/text";

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
