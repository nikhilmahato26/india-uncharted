import { z } from "zod";

/**
 * One schema, used by the form and by the server action. Optional fields are
 * genuinely optional: an enquiry that only carries a name, a contact and a
 * sentence is still a lead worth having.
 */

export const BUDGET_BANDS = [
  { value: "UNDECIDED", label: "Not sure yet" },
  { value: "ESSENTIAL", label: "Essential" },
  { value: "COMFORT", label: "Comfort" },
  { value: "PREMIUM", label: "Premium" },
  { value: "LUXURY", label: "Luxury" },
] as const;

const optionalString = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .transform((v) => (v ? v : undefined));

export const enquirySchema = z
  .object({
    name: z.string().trim().min(2, "Please tell us your name.").max(120),
    email: z.string().trim().toLowerCase().email("Please check this email address."),
    phone: optionalString(40),
    country: optionalString(80),
    travelDateFrom: optionalString(10),
    travelDateTo: optionalString(10),
    flexibleDates: z.coerce.boolean().optional().default(false),
    adults: z.coerce.number().int().min(1).max(60).optional(),
    children: z.coerce.number().int().min(0).max(30).optional(),
    destinationsWanted: z.array(z.string().max(80)).max(12).optional().default([]),
    travelStyles: z.array(z.string().max(80)).max(12).optional().default([]),
    budgetBand: z.enum(["UNDECIDED", "ESSENTIAL", "COMFORT", "PREMIUM", "LUXURY"]).optional().default("UNDECIDED"),
    message: optionalString(4000),
    whatsappOptIn: z.coerce.boolean().optional().default(false),
    consent: z.literal("on", { message: "Please agree before sending." }).or(z.literal(true)).or(z.coerce.boolean().refine((v) => v === true, "Please agree before sending.")),

    // context, filled by the page the traveller came from
    sourcePath: optionalString(300),
    entityType: z.enum(["PAGE", "REGION", "DESTINATION", "JOURNEY", "EXPERIENCE", "SERVICE", "ARTICLE", "CATEGORY"]).optional(),
    entityId: optionalString(40),
    entityName: optionalString(200),

    // spam controls
    company: z.string().max(200).optional(), // honeypot: must stay empty
    startedAt: z.coerce.number().optional(),
  })
  .refine((v) => !v.travelDateFrom || !v.travelDateTo || v.travelDateTo >= v.travelDateFrom, {
    message: "The return date is before the start date.",
    path: ["travelDateTo"],
  })
  .refine((v) => Boolean(v.phone) || Boolean(v.email), { message: "Please leave a phone number or an email.", path: ["phone"] });

export type EnquiryInput = z.infer<typeof enquirySchema>;

export type EnquiryResult =
  | { ok: true; refCode: string; whatsappHref: string | null }
  | { ok: false; error: string; fieldErrors?: Record<string, string> };

/** IU-7Q4KD2 — short, readable over the phone, unambiguous characters only. */
export function makeRefCode(): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let out = "";
  const bytes = crypto.getRandomValues(new Uint8Array(6));
  for (const b of bytes) out += alphabet[b % alphabet.length];
  return `IU-${out}`;
}
