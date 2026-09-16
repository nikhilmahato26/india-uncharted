import { parsePhoneNumberFromString, type CountryCode } from "libphonenumber-js";

/**
 * The one place phone numbers are normalised. Stored as E.164 ("+918005967178").
 * Indian numbers typed as "08005967178", "8005967178" or "+91 80059 67178" all land the same.
 */
export function toE164(input: string | null | undefined, defaultCountry: CountryCode = "IN"): string | null {
  if (!input) return null;
  const cleaned = input.trim();
  if (!cleaned) return null;
  const parsed = parsePhoneNumberFromString(cleaned, defaultCountry);
  if (!parsed || !parsed.isValid()) return null;
  return parsed.number;
}

/** "+918005967178" → "+91 80059 67178" for display. */
export function formatPhone(e164: string | null | undefined): string {
  if (!e164) return "";
  const parsed = parsePhoneNumberFromString(e164);
  return parsed ? parsed.formatInternational() : e164;
}

/** "tel:+918005967178" */
export function telHref(e164: string): string {
  return `tel:${e164}`;
}

/**
 * The one place WhatsApp links are built. wa.me takes digits only, no "+".
 * Callers pass context so every conversation arrives already knowing the trip.
 */
export function whatsappHref(e164: string, message?: string): string {
  const digits = e164.replace(/\D/g, "");
  const text = message ? `?text=${encodeURIComponent(message)}` : "";
  return `https://wa.me/${digits}${text}`;
}

export function whatsappMessage(opts: { entityName?: string | null; url?: string | null }): string {
  if (opts.entityName) {
    return `Hello India Uncharted, I'm interested in "${opts.entityName}".${opts.url ? ` (${opts.url})` : ""} Could you help me plan it?`;
  }
  return "Hello India Uncharted, I'd like help planning a journey in India.";
}
