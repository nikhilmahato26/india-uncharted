import { describe, expect, it } from "vitest";
import { analyzeSeo, countIssues, serpPreview, type SeoSubject } from "@/lib/seo/analyze";

const base: SeoSubject = {
  type: "DESTINATION",
  name: "Jaisalmer",
  path: "/destinations/jaisalmer",
  resolvedTitle: "Jaisalmer Travel Guide & Tour Packages",
  metaTitle: "Jaisalmer Travel Guide & Tour Packages",
  metaDescription:
    "Plan a private journey to Jaisalmer: the fort, the havelis, camel safaris on the Sam dunes and the best months to travel, from India Uncharted.",
  h1: "Jaisalmer",
  focusKeyword: "jaisalmer tour packages",
  secondaryKeywords: [],
  canonicalUrl: null,
  robotsIndex: true,
  hasOgImage: true,
  hasHeroImage: true,
  heroAltMissing: false,
  imagesMissingAlt: 0,
  imagesLicenceUnknown: 0,
  wordCount: 600,
  internalLinksOut: 8,
  internalLinksIn: 4,
  hasRelatedContent: true,
  bodyText: "Jaisalmer tour packages from India Uncharted cover the fort, the desert and the dunes.",
  duplicateTitleWith: [],
  duplicateDescriptionWith: [],
  sameFocusKeywordAs: [],
  isLinkedFromNav: true,
};

const find = (checks: ReturnType<typeof analyzeSeo>, id: string) => checks.find((c) => c.id === id);

describe("analyzeSeo", () => {
  it("passes a well-filled page with no failures", () => {
    const checks = analyzeSeo(base);
    expect(countIssues(checks).fail).toBe(0);
  });

  it("fails when the meta description is missing", () => {
    const checks = analyzeSeo({ ...base, metaDescription: null });
    expect(find(checks, "description")?.status).toBe("fail");
  });

  it("warns when the title is longer than the snippet width", () => {
    const checks = analyzeSeo({ ...base, resolvedTitle: "x".repeat(75) });
    expect(find(checks, "title")?.status).toBe("warn");
  });

  it("flags keyword cannibalisation between two pages", () => {
    const checks = analyzeSeo({ ...base, sameFocusKeywordAs: ["/journeys/jaisalmer-tour"] });
    expect(find(checks, "cannibalisation")?.status).toBe("fail");
  });

  it("flags an orphan page that nothing links to", () => {
    const checks = analyzeSeo({ ...base, internalLinksIn: 0, isLinkedFromNav: false });
    expect(find(checks, "orphan")?.status).toBe("fail");
  });

  it("does not call a navigation page an orphan", () => {
    const checks = analyzeSeo({ ...base, internalLinksIn: 0, isLinkedFromNav: true });
    expect(find(checks, "orphan")).toBeUndefined();
  });

  it("fails thin content below half the threshold", () => {
    expect(find(analyzeSeo({ ...base, wordCount: 100 }), "thin-content")?.status).toBe("fail");
    expect(find(analyzeSeo({ ...base, wordCount: 200 }), "thin-content")?.status).toBe("warn");
  });

  it("fails a hero image with no alt text", () => {
    expect(find(analyzeSeo({ ...base, heroAltMissing: true }), "hero-alt")?.status).toBe("fail");
  });

  it("warns about images whose licence is unconfirmed", () => {
    expect(find(analyzeSeo({ ...base, imagesLicenceUnknown: 3 }), "image-licence")?.status).toBe("warn");
  });

  it("warns when the focus keyword is missing from the title and body", () => {
    const checks = analyzeSeo({ ...base, resolvedTitle: "Somewhere else entirely", bodyText: "nothing relevant" });
    expect(find(checks, "keyword-title")?.status).toBe("warn");
    expect(find(checks, "keyword-body")?.status).toBe("warn");
  });
});

describe("serpPreview", () => {
  it("truncates the title and flags that it did", () => {
    const p = serpPreview("y".repeat(80), "short description", "/x");
    expect(p.title.endsWith("…")).toBe(true);
    expect(p.titleTruncated).toBe(true);
  });

  it("leaves a short title alone", () => {
    const p = serpPreview("Jaisalmer", null, "/x");
    expect(p.title).toBe("Jaisalmer");
    expect(p.titleTruncated).toBe(false);
    expect(p.description).toBe("");
  });
});
