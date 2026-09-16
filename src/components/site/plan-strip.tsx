import { MessageCircle, Phone } from "lucide-react";
import { formatPhone, telHref, whatsappHref, whatsappMessage } from "@/lib/phone";
import { EnquiryDialog } from "@/components/enquiry/enquiry-dialog";
import type { EnquiryContext } from "@/components/enquiry/enquiry-form";
import { SunMark } from "@/components/brand/marks";

/**
 * The quiet panel beside long-form content: quote-on-request, one way to start
 * an enquiry, and the real phone number. WhatsApp appears only if the client
 * has confirmed a WhatsApp number in settings.
 */
export function PlanStrip({
  destinationName,
  entity,
  phoneE164,
  whatsappE164,
  priceText,
  note,
}: {
  destinationName?: string;
  entity: EnquiryContext;
  phoneE164: string | null;
  whatsappE164: string | null;
  priceText?: string;
  note?: string;
}) {
  return (
    <div className="border border-rule bg-paper-2 p-6 lg:sticky lg:top-28">
      <SunMark className="size-7 text-terracotta-600" />
      <p className="mt-3 font-display text-title text-ink">{priceText ?? "Quoted for your dates"}</p>
      <p className="mt-2 text-small text-ink-2">
        {note ?? `Every journey${destinationName ? ` to ${destinationName}` : ""} is planned privately, so the price depends on your dates, pace and where you stay.`}
      </p>
      <div className="mt-5 grid gap-3">
        <EnquiryDialog label="Send an enquiry" context={entity} size="md" className="w-full" />
        {whatsappE164 ? (
          <a
            href={whatsappHref(whatsappE164, whatsappMessage({ entityName: entity.entityName ?? null, url: null }))}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex min-h-12 w-full items-center justify-center gap-2 border border-ink/25 px-5 text-small font-semibold text-ink hover:bg-paper"
          >
            <MessageCircle className="size-4" strokeWidth={1.75} aria-hidden="true" />
            Chat on WhatsApp
          </a>
        ) : null}
        {phoneE164 ? (
          <a href={telHref(phoneE164)} className="inline-flex min-h-12 w-full items-center justify-center gap-2 border border-ink/25 px-5 text-small font-semibold text-ink hover:bg-paper">
            <Phone className="size-4" strokeWidth={1.75} aria-hidden="true" />
            {formatPhone(phoneE164)}
          </a>
        ) : null}
      </div>
    </div>
  );
}
