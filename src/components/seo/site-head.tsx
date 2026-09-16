import { getSeoSettings } from "@/lib/content/settings";

const ALLOWED_TAGS = new Set(["meta", "link"]);
const ALLOWED_ATTRS = new Set(["name", "property", "content", "rel", "href", "hreflang", "type", "sizes", "media", "as", "crossorigin"]);

/**
 * Admin-managed head entries: search-engine verification codes and a short
 * allowlist of <meta>/<link> tags (SUPER_ADMIN only). Scripts are never
 * accepted here — analytics has its own typed fields.
 */
export async function SiteHead() {
  const seo = await getSeoSettings();
  const { verification, customHeadTags } = seo;
  return (
    <>
      {verification.google ? <meta name="google-site-verification" content={verification.google} /> : null}
      {verification.bing ? <meta name="msvalidate.01" content={verification.bing} /> : null}
      {verification.yandex ? <meta name="yandex-verification" content={verification.yandex} /> : null}
      {verification.pinterest ? <meta name="p:domain_verify" content={verification.pinterest} /> : null}
      {(customHeadTags ?? [])
        .filter((t) => ALLOWED_TAGS.has(t.tag))
        .map((t, i) => {
          const attrs = Object.fromEntries(Object.entries(t.attrs ?? {}).filter(([k, v]) => ALLOWED_ATTRS.has(k) && typeof v === "string"));
          if (!Object.keys(attrs).length) return null;
          return t.tag === "meta" ? <meta key={i} {...attrs} /> : <link key={i} {...attrs} />;
        })}
    </>
  );
}
