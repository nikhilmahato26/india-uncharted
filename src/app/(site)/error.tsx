"use client";

import { useEffect } from "react";
import Link from "next/link";
import { buttonClasses } from "@/components/ui/button";

/** Route-level error boundary: says what happened and what to do, never the stack. */
export default function SiteError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="container-folio flex min-h-[70svh] flex-col justify-center py-24">
      <h1 className="max-w-2xl text-display-md text-ink">This page didn’t load.</h1>
      <p className="measure mt-4 text-lead text-ink-2">
        Something went wrong at our end, not yours. Try again — and if it keeps happening, call or write and we’ll send what you were looking for directly.
      </p>
      <div className="mt-8 flex flex-wrap gap-3">
        <button type="button" onClick={reset} className={buttonClasses({ variant: "primary" })}>
          <span>Try again</span>
        </button>
        <Link href="/" className={buttonClasses({ variant: "secondary" })}>
          <span>Back to the homepage</span>
        </Link>
        <Link href="/contact" className={buttonClasses({ variant: "ghost" })}>
          <span>Contact us</span>
        </Link>
      </div>
      {error.digest ? <p className="mt-8 text-caption text-ink-3">Reference: {error.digest}</p> : null}
    </div>
  );
}
