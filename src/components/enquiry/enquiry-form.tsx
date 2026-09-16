"use client";

import { useActionState, useEffect, useId, useRef, useState } from "react";
import { Check, MessageCircle } from "lucide-react";
import { submitEnquiry } from "@/app/actions/enquiry";
import type { EnquiryResult } from "@/lib/schemas/enquiry";
import { BUDGET_BANDS } from "@/lib/schemas/enquiry";
import { Button } from "@/components/ui/button";
import { Checkbox, ChipGroup, Field, Input, Select, Textarea } from "@/components/ui/field";
import { cn } from "@/lib/cn";

export type EnquiryContext = {
  entityType?: "PAGE" | "REGION" | "DESTINATION" | "JOURNEY" | "EXPERIENCE" | "SERVICE" | "ARTICLE" | "CATEGORY";
  entityId?: string;
  entityName?: string;
};

/**
 * The enquiry form. It knows what the traveller was looking at, so nobody has
 * to retype the journey they just read. Works without JavaScript as a plain
 * POST; with JavaScript it swaps to a confirmation showing the reference code.
 */
export function EnquiryForm({
  context,
  destinations = [],
  styles = [],
  expanded = false,
  compact = false,
  className,
}: {
  context?: EnquiryContext;
  destinations?: { value: string; label: string }[];
  styles?: { value: string; label: string }[];
  expanded?: boolean;
  compact?: boolean;
  className?: string;
}) {
  const [state, action, pending] = useActionState<EnquiryResult | null, FormData>(submitEnquiry, null);
  // The page path and the time the visitor started typing are read when the form
  // is used, not while it renders: neither exists during prerendering, and the
  // timestamp only exists to catch bots that submit instantly.
  const startedAt = useRef(0);
  const ids = useId();
  const [showDates, setShowDates] = useState(expanded);
  const successRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (state?.ok) successRef.current?.focus();
  }, [state]);

  const err = (field: string) => (state && !state.ok ? state.fieldErrors?.[field] : undefined);

  if (state?.ok) {
    return (
      <div ref={successRef} tabIndex={-1} className={cn("border border-forest-800/30 bg-forest-50 p-6 outline-none", className)}>
        <p className="flex items-center gap-2 font-display text-title text-forest-900">
          <Check className="size-5" strokeWidth={2} aria-hidden="true" />
          Enquiry received
        </p>
        <p className="mt-3 text-body text-ink-2">
          Your reference is <strong className="text-ink">{state.refCode}</strong>. One of our travel designers will write back with a first outline — usually within a day.
        </p>
        {state.whatsappHref ? (
          <a
            href={state.whatsappHref}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-5 inline-flex min-h-12 items-center gap-2 border border-forest-800 px-5 text-small font-semibold text-forest-900 hover:bg-forest-100"
          >
            <MessageCircle className="size-4" strokeWidth={1.75} aria-hidden="true" />
            Continue on WhatsApp
          </a>
        ) : null}
      </div>
    );
  }

  return (
    <form
      action={(formData) => {
        formData.set("sourcePath", window.location.pathname);
        formData.set("startedAt", String(startedAt.current || Date.now()));
        return action(formData);
      }}
      onFocusCapture={() => {
        if (!startedAt.current) startedAt.current = Date.now();
      }}
      className={cn("grid gap-5", className)}
      noValidate
    >
      {context?.entityType ? <input type="hidden" name="entityType" value={context.entityType} /> : null}
      {context?.entityId ? <input type="hidden" name="entityId" value={context.entityId} /> : null}
      {context?.entityName ? <input type="hidden" name="entityName" value={context.entityName} /> : null}
      {/* honeypot */}
      <div aria-hidden="true" className="absolute left-[-9999px] h-0 w-0 overflow-hidden">
        <label htmlFor={`${ids}-company`}>Company</label>
        <input id={`${ids}-company`} name="company" type="text" tabIndex={-1} autoComplete="off" />
      </div>

      {context?.entityName ? (
        <p className="border-l-[1px] border-terracotta-600 bg-paper-2 px-4 py-3 text-small text-ink-2">
          About <strong className="text-ink">{context.entityName}</strong>
        </p>
      ) : null}

      {state && !state.ok && state.error ? (
        <p role="alert" className="border border-danger/40 bg-danger-soft px-4 py-3 text-small text-danger">
          {state.error}
        </p>
      ) : null}

      <div className={cn("grid gap-5", !compact && "sm:grid-cols-2")}>
        <Field label="Your name" required htmlFor={`${ids}-name`} error={err("name")}>
          <Input id={`${ids}-name`} name="name" autoComplete="name" required error={Boolean(err("name"))} />
        </Field>
        <Field label="Email" required htmlFor={`${ids}-email`} error={err("email")}>
          <Input id={`${ids}-email`} name="email" type="email" autoComplete="email" required error={Boolean(err("email"))} />
        </Field>
        <Field label="Phone or WhatsApp" htmlFor={`${ids}-phone`} error={err("phone")} hint="Include your country code.">
          <Input id={`${ids}-phone`} name="phone" type="tel" autoComplete="tel" inputMode="tel" error={Boolean(err("phone"))} />
        </Field>
        <Field label="Country" htmlFor={`${ids}-country`}>
          <Input id={`${ids}-country`} name="country" autoComplete="country-name" />
        </Field>
      </div>

      {showDates ? (
        <>
          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="Arriving" htmlFor={`${ids}-from`} error={err("travelDateFrom")}>
              <Input id={`${ids}-from`} name="travelDateFrom" type="date" />
            </Field>
            <Field label="Leaving" htmlFor={`${ids}-to`} error={err("travelDateTo")}>
              <Input id={`${ids}-to`} name="travelDateTo" type="date" error={Boolean(err("travelDateTo"))} />
            </Field>
          </div>
          <div className="grid gap-5 sm:grid-cols-3">
            <Field label="Adults" htmlFor={`${ids}-adults`}>
              <Input id={`${ids}-adults`} name="adults" type="number" min={1} max={60} inputMode="numeric" />
            </Field>
            <Field label="Children" htmlFor={`${ids}-children`}>
              <Input id={`${ids}-children`} name="children" type="number" min={0} max={30} inputMode="numeric" />
            </Field>
            <Field label="Budget" htmlFor={`${ids}-budget`} hint="Per person, excluding flights.">
              <Select id={`${ids}-budget`} name="budgetBand" defaultValue="UNDECIDED">
                {BUDGET_BANDS.map((b) => (
                  <option key={b.value} value={b.value}>
                    {b.label}
                  </option>
                ))}
              </Select>
            </Field>
          </div>
          <Checkbox name="flexibleDates" value="true" label="My dates are flexible" />
          {destinations.length ? (
            <Field label="Places you have in mind" htmlFor={`${ids}-dest`}>
              <ChipGroup name="destinationsWanted" options={destinations} />
            </Field>
          ) : null}
          {styles.length ? (
            <Field label="How you like to travel" htmlFor={`${ids}-style`}>
              <ChipGroup name="travelStyles" options={styles} />
            </Field>
          ) : null}
        </>
      ) : (
        <button type="button" onClick={() => setShowDates(true)} className="justify-self-start text-small font-semibold text-terracotta-700 underline underline-offset-4">
          Add dates, travellers and budget
        </button>
      )}

      <Field label="What would you like from India?" htmlFor={`${ids}-message`} error={err("message")}>
        <Textarea id={`${ids}-message`} name="message" rows={compact ? 3 : 5} placeholder="Anything that helps us plan: the pace you like, places you've already seen, what you'd rather avoid." />
      </Field>

      <Checkbox name="consent" value="on" required label="I'm happy for India Uncharted to contact me about this enquiry." />
      {err("consent") ? (
        <p role="alert" className="-mt-3 text-caption text-danger">
          {err("consent")}
        </p>
      ) : null}

      <Button type="submit" size="lg" loading={pending} className="justify-self-start">
        {pending ? "Sending…" : "Start planning"}
      </Button>
    </form>
  );
}
