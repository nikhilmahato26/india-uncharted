import type { SiteSettingsView } from "@/lib/content/settings";
import { SITE_URL, absoluteUrl } from "@/lib/site";
import { JsonLd } from "./json-ld";

/**
 * Organization / TravelAgency describing the real business: the Jodhpur
 * address, the published phone and email, and the social profiles that exist.
 * No ratings, no awards, no invented service area claims.
 */
export function OrganizationJsonLd({ settings }: { settings: SiteSettingsView }) {
  const address = settings.address;
  const hasAddress = Boolean(address.line1 || address.city);
  return (
    <JsonLd
      data={{
        "@context": "https://schema.org",
        "@graph": [
          {
            "@type": "TravelAgency",
            "@id": `${SITE_URL}/#organization`,
            name: settings.businessName,
            url: SITE_URL,
            ...(settings.tagline ? { description: settings.tagline } : {}),
            ...(settings.logo ? { logo: absoluteUrl(settings.logo.src), image: absoluteUrl(settings.logo.src) } : {}),
            ...(settings.phoneE164 ? { telephone: settings.phoneE164 } : {}),
            ...(settings.email ? { email: settings.email } : {}),
            ...(hasAddress
              ? {
                  address: {
                    "@type": "PostalAddress",
                    streetAddress: [address.line1, address.line2].filter(Boolean).join(", ") || undefined,
                    addressLocality: address.city ?? undefined,
                    addressRegion: address.region ?? undefined,
                    postalCode: address.postalCode ?? undefined,
                    addressCountry: "IN",
                  },
                }
              : {}),
            ...(settings.socials.length ? { sameAs: settings.socials.map((s) => s.url) } : {}),
          },
          {
            "@type": "WebSite",
            "@id": `${SITE_URL}/#website`,
            url: SITE_URL,
            name: settings.businessName,
            publisher: { "@id": `${SITE_URL}/#organization` },
            inLanguage: "en-IN",
            potentialAction: {
              "@type": "SearchAction",
              target: { "@type": "EntryPoint", urlTemplate: `${SITE_URL}/search?q={search_term_string}` },
              "query-input": "required name=search_term_string",
            },
          },
        ],
      }}
    />
  );
}
