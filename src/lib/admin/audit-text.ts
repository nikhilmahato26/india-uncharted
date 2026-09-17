/**
 * The log stores an action and an entity type ("login", "User"). Read back, that
 * has to be a sentence: "signed in", "updated the journey".
 */
const PHRASES: Record<string, string> = {
  login: "signed in",
  logout: "signed out",
  "password.change": "changed their password",
  "user.create": "added the account",
  "user.role": "changed the role of",
  "user.activate": "reactivated the account",
  "user.deactivate": "deactivated the account",
  "user.password-reset": "reset the password for",
  "seo.settings": "saved the SEO settings",
  "seo.metatag.add": "added the custom meta tag",
  "seo.metatag.delete": "removed the custom meta tag",
  "settings.save": "saved the site settings",
  "redirect.save": "saved the redirect",
  "redirect.delete": "deleted the redirect",
  "notice.create": "added the notice",
  "notice.update": "edited the notice",
  "notice.on": "switched on the notice",
  "notice.off": "switched off the notice",
  "notice.delete": "deleted the notice",
  "media.upload": "uploaded",
  "media.update": "edited the image",
  "media.delete": "deleted the image",
  "enquiry.note": "added a note to the enquiry",
  "enquiry.assign": "assigned the enquiry",
  "content.pass": "ran the content pass",
  "media.alt": "wrote alt text for images",
};

const ENTITY_WORDS: Record<string, string> = { SeasonalNotice: "notice", SiteSettings: "site settings", SeoSettings: "SEO settings", CustomMetaTag: "meta tag" };

export function describeAudit(action: string, entityType: string): string {
  const known = PHRASES[action];
  if (known) return known;
  if (action.startsWith("enquiry.")) return `marked the enquiry ${action.slice("enquiry.".length).replace(/-/g, " ")}`;
  const thing = ENTITY_WORDS[entityType] ?? entityType.replace(/([a-z])([A-Z])/g, "$1 $2").toLowerCase();
  const verb = { create: "created", update: "edited", delete: "deleted", reorder: "reordered", duplicate: "duplicated" }[action];
  return verb ? `${verb} the ${thing}` : `${action.replace(/\./g, " ")} ${thing}`;
}
