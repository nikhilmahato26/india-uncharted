import { JsonLd } from "@/components/seo/json-ld";
import { cn } from "@/lib/cn";
import type { FaqView } from "@/lib/content/shared";

/**
 * FAQs as native <details>, so the answers are in the HTML, findable with
 * browser search and open without JavaScript. FAQPage markup is emitted only
 * because the questions are visible on the page.
 */
export function FaqBlock({
  faqs,
  heading = "Frequently asked questions",
  tone = "ink",
  id = "faqs",
  className,
  structuredData = true,
}: {
  faqs: FaqView[];
  heading?: string;
  tone?: "ink" | "paper";
  id?: string;
  className?: string;
  structuredData?: boolean;
}) {
  if (!faqs.length) return null;
  return (
    <div className={className}>
      <h2 id={id} className={cn("text-display-md", tone === "ink" ? "text-ink" : "text-paper")}>
        {heading}
      </h2>
      <div className={cn("mt-8 border-t", tone === "ink" ? "border-rule" : "border-paper/20")}>
        {faqs.map((f) => (
          <details key={f.id} className={cn("group/faq border-b", tone === "ink" ? "border-rule" : "border-paper/20")}>
            <summary
              className={cn(
                "flex cursor-pointer list-none items-start justify-between gap-6 py-5 font-display text-subtitle marker:hidden [&::-webkit-details-marker]:hidden",
                tone === "ink" ? "text-ink hover:text-terracotta-700" : "text-paper hover:text-gold-200",
              )}
            >
              <span>{f.question}</span>
              <span aria-hidden="true" className="relative mt-2 size-3 shrink-0">
                <span className={cn("absolute top-1/2 left-0 h-px w-3", tone === "ink" ? "bg-ink" : "bg-paper")} />
                <span
                  className={cn(
                    "absolute top-1/2 left-0 h-px w-3 rotate-90 transition-transform duration-(--duration-base) ease-(--ease-out-expo) group-open/faq:rotate-0",
                    tone === "ink" ? "bg-ink" : "bg-paper",
                  )}
                />
              </span>
            </summary>
            <div className={cn("measure pb-6 text-body", tone === "ink" ? "text-ink-2" : "text-paper/80")}>
              {f.answer.split(/\n{2,}/).map((para, i) => (
                <p key={i} className={i ? "mt-3" : undefined}>
                  {para}
                </p>
              ))}
            </div>
          </details>
        ))}
      </div>
      {structuredData ? (
        <JsonLd
          data={{
            "@context": "https://schema.org",
            "@type": "FAQPage",
            mainEntity: faqs.map((f) => ({
              "@type": "Question",
              name: f.question,
              acceptedAnswer: { "@type": "Answer", text: f.answer },
            })),
          }}
        />
      ) : null}
    </div>
  );
}
