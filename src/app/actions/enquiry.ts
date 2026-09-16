"use server";

import { headers } from "next/headers";
import { db } from "@/lib/db";
import { enquirySchema, makeRefCode, type EnquiryResult } from "@/lib/schemas/enquiry";
import { hashIp, rateLimit } from "@/lib/rate-limit";
import { toE164, whatsappHref, whatsappMessage } from "@/lib/phone";
import { sendEnquiryAlert } from "@/lib/email/send";
import { absoluteUrl } from "@/lib/site";

/**
 * Accepts an enquiry. The lead is saved first; notification failures are
 * logged, never surfaced — the traveller has already done their part.
 */
export async function submitEnquiry(_prev: EnquiryResult | null, formData: FormData): Promise<EnquiryResult> {
  const raw = Object.fromEntries(formData.entries());
  const parsed = enquirySchema.safeParse({
    ...raw,
    destinationsWanted: formData.getAll("destinationsWanted").map(String).filter(Boolean),
    travelStyles: formData.getAll("travelStyles").map(String).filter(Boolean),
  });

  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const key = String(issue.path[0] ?? "form");
      fieldErrors[key] ??= issue.message;
    }
    return { ok: false, error: "Please check the highlighted fields.", fieldErrors };
  }

  const data = parsed.data;

  // Honeypot: accept silently so a bot never learns it was caught.
  if (data.company) return { ok: true, refCode: makeRefCode(), whatsappHref: null };
  // Submitted implausibly fast — same silent acceptance.
  if (data.startedAt && Date.now() - data.startedAt < 1800) return { ok: true, refCode: makeRefCode(), whatsappHref: null };

  const h = await headers();
  const ip = h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? h.get("x-real-ip");
  const ipHash = hashIp(ip);
  if (ipHash && !(await rateLimit(`enquiry:${ipHash}`, 5, 600))) {
    return { ok: false, error: "That's a few enquiries in a short time. Please call us instead, or try again shortly." };
  }

  const refCode = makeRefCode();
  const phoneE164 = toE164(data.phone ?? null);

  try {
    const enquiry = await db.enquiry.create({
      data: {
        refCode,
        name: data.name,
        email: data.email,
        phoneE164,
        whatsappOptIn: data.whatsappOptIn,
        country: data.country,
        travelDateFrom: data.travelDateFrom ? new Date(data.travelDateFrom) : null,
        travelDateTo: data.travelDateTo ? new Date(data.travelDateTo) : null,
        flexibleDates: data.flexibleDates,
        adults: data.adults,
        children: data.children,
        destinationsWanted: data.destinationsWanted ?? [],
        travelStyles: data.travelStyles ?? [],
        budgetBand: data.budgetBand,
        message: data.message,
        sourcePath: data.sourcePath,
        entityType: data.entityType,
        entityId: data.entityId,
        entityNameSnapshot: data.entityName,
        channel: "FORM",
        ipHash,
        userAgent: h.get("user-agent")?.slice(0, 400) ?? null,
        consentAt: new Date(),
      },
      select: { id: true, refCode: true },
    });

    await sendEnquiryAlert({
      refCode: enquiry.refCode,
      name: data.name,
      email: data.email,
      phone: phoneE164,
      message: data.message ?? null,
      entityName: data.entityName ?? null,
      sourcePath: data.sourcePath ?? null,
      adminUrl: absoluteUrl(`/admin/enquiries/${enquiry.id}`),
    });

    const settings = await db.siteSettings.findUnique({ where: { id: "singleton" }, select: { whatsappE164: true } });
    const wa = settings?.whatsappE164
      ? whatsappHref(settings.whatsappE164, `${whatsappMessage({ entityName: data.entityName ?? null, url: null })} My reference is ${refCode}.`)
      : null;

    return { ok: true, refCode, whatsappHref: wa };
  } catch (err) {
    console.error("enquiry failed", err);
    return { ok: false, error: "Something went wrong at our end. Please try again, or call us." };
  }
}
