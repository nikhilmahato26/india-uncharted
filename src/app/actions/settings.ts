"use server";

import { revalidatePath, updateTag } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { assertCapability, AuthError } from "@/lib/auth/session";
import { recordAudit } from "@/lib/audit";
import { TAGS } from "@/lib/content/tags";
import { toE164 } from "@/lib/phone";
import type { Prisma } from "@/generated/prisma/client";
import type { SettingsState } from "./seo-settings";

const NETWORKS = ["facebook", "instagram", "youtube", "x", "linkedin", "pinterest", "tripadvisor"] as const;

const schema = z.object({
  businessName: z.string().trim().min(1).max(120),
  brandLine: z.string().trim().max(160).optional(),
  tagline: z.string().trim().max(300).optional(),
  phone: z.string().trim().max(40).optional(),
  whatsapp: z.string().trim().max(40).optional(),
  email: z.string().trim().email().max(160).or(z.literal("")).optional(),
  enquiryEmail: z.string().trim().email().max(160).or(z.literal("")).optional(),
  addressLine1: z.string().trim().max(200).optional(),
  addressLine2: z.string().trim().max(200).optional(),
  city: z.string().trim().max(120).optional(),
  region: z.string().trim().max(120).optional(),
  postalCode: z.string().trim().max(20).optional(),
  country: z.string().trim().max(120).optional(),
  mapUrl: z.string().trim().url().max(600).or(z.literal("")).optional(),
  footerDescription: z.string().trim().max(600).optional(),
  copyright: z.string().trim().max(200).optional(),
  defaultCtaLabel: z.string().trim().max(60).optional(),
  defaultCtaHref: z.string().trim().max(300).optional(),
  newsletterEnabled: z.coerce.boolean().optional(),
  logoId: z.string().trim().max(40).optional(),
  logoLightId: z.string().trim().max(40).optional(),
  defaultOgImageId: z.string().trim().max(40).optional(),
});

export async function saveSiteSettings(_prev: SettingsState, formData: FormData): Promise<SettingsState> {
  try {
    const user = await assertCapability("settings.edit");
    const parsed = schema.safeParse(Object.fromEntries(formData.entries()));
    if (!parsed.success) {
      const fieldErrors: Record<string, string> = {};
      for (const issue of parsed.error.issues) fieldErrors[String(issue.path[0])] ??= issue.message;
      return { ok: false, error: "Please check the highlighted fields.", fieldErrors };
    }
    const d = parsed.data;

    const phoneE164 = d.phone ? toE164(d.phone) : null;
    if (d.phone && !phoneE164) return { ok: false, error: "That phone number doesn't look right.", fieldErrors: { phone: "Include the country code, e.g. +91 80059 67178." } };
    const whatsappE164 = d.whatsapp ? toE164(d.whatsapp) : null;
    if (d.whatsapp && !whatsappE164)
      return { ok: false, error: "That WhatsApp number doesn't look right.", fieldErrors: { whatsapp: "Include the country code. Leave empty if you don't use WhatsApp." } };

    const socials: { network: string; url: string }[] = [];
    for (const network of NETWORKS) {
      const raw = String(formData.get(`social.${network}`) ?? "").trim();
      if (!raw) continue;
      try {
        socials.push({ network, url: new URL(raw).toString() });
      } catch {
        return { ok: false, error: `That ${network} link isn't a full web address.`, fieldErrors: { [`social.${network}`]: "Start with https://" } };
      }
    }

    await db.siteSettings.update({
      where: { id: "singleton" },
      data: {
        businessName: d.businessName,
        brandLine: d.brandLine || null,
        tagline: d.tagline || null,
        phoneE164,
        whatsappE164,
        email: d.email || null,
        enquiryEmail: d.enquiryEmail || null,
        addressLine1: d.addressLine1 || null,
        addressLine2: d.addressLine2 || null,
        city: d.city || null,
        region: d.region || null,
        postalCode: d.postalCode || null,
        country: d.country || null,
        mapUrl: d.mapUrl || null,
        footerDescription: d.footerDescription || null,
        copyright: d.copyright || null,
        defaultCtaLabel: d.defaultCtaLabel || "Plan My Journey",
        defaultCtaHref: d.defaultCtaHref || "/plan-my-journey",
        newsletterEnabled: d.newsletterEnabled ?? false,
        logoId: d.logoId || null,
        logoLightId: d.logoLightId || null,
        defaultOgImageId: d.defaultOgImageId || null,
        socials: socials as Prisma.InputJsonValue,
      },
    });

    await recordAudit({ userId: user.id, action: "settings.save", entityType: "SiteSettings" });
    updateTag(TAGS.settings);
    updateTag(TAGS.nav);
    revalidatePath("/", "layout");
    return {
      ok: true,
      message: whatsappE164 ? "Saved. WhatsApp buttons are now live across the site." : "Saved.",
    };
  } catch (err) {
    if (err instanceof AuthError) return { ok: false, error: err.message };
    console.error("settings failed", err);
    return { ok: false, error: "Something went wrong saving that." };
  }
}
