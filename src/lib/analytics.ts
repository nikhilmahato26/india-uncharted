/**
 * Consent for analytics, kept in a first-party cookie the browser reads. Nothing
 * here runs on the server: reading cookies there would make every page dynamic.
 * Bump CONSENT_VERSION when the trackers in use change, and everyone is asked again.
 */

export const CONSENT_COOKIE = "iu_consent";
export const CONSENT_VERSION = "v1";
export const CONSENT_MAX_AGE = 60 * 60 * 24 * 180; // six months, then ask again
export const CONSENT_EVENT = "iu:consent-change";
export const OPEN_SETTINGS_EVENT = "iu:cookie-settings";

export type Consent = "granted" | "denied";
export type AnalyticsConfig = { ga4Id: string | null; gtmId: string | null; metaPixelId: string | null; consentRequired: boolean };

/** The stored choice, or null when there isn't one for the current version. */
export function parseConsent(cookieHeader: string): Consent | null {
  for (const part of cookieHeader.split(";")) {
    const [name, ...rest] = part.trim().split("=");
    if (name !== CONSENT_COOKIE) continue;
    const [choice, version] = decodeURIComponent(rest.join("=")).split(".");
    if (version !== CONSENT_VERSION) return null;
    return choice === "granted" || choice === "denied" ? choice : null;
  }
  return null;
}

export function consentCookie(choice: Consent, secure: boolean): string {
  return `${CONSENT_COOKIE}=${choice}.${CONSENT_VERSION}; Max-Age=${CONSENT_MAX_AGE}; Path=/; SameSite=Lax${secure ? "; Secure" : ""}`;
}

export function hasTrackers(config: AnalyticsConfig): boolean {
  return Boolean(config.ga4Id || config.gtmId || config.metaPixelId);
}

/** What the banner names, so a visitor knows exactly what they're agreeing to. */
export function trackerNames(config: AnalyticsConfig): string[] {
  return [config.ga4Id || config.gtmId ? "Google Analytics" : null, config.metaPixelId ? "Meta Pixel" : null].filter((n): n is string => Boolean(n));
}

/** Cookies the trackers above set, removed when someone withdraws consent. */
export function isTrackerCookie(name: string): boolean {
  return /^(_ga|_ga_[A-Z0-9]+|_gid|_gat.*|_gcl_.*|_fbp|_fbc)$/.test(name);
}
