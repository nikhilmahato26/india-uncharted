import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { getSession } from "@/lib/auth/session";
import { getLoginMedia } from "@/lib/content/editorial";
import { LoginForm } from "./login-form";
import Link from "next/link";
import { SunMark, RidgeRule } from "@/components/brand/marks";
import { MediaFrame } from "@/components/ui/media-frame";

// Admin pages are per-user and always render at request time.
export const instant = false;

export const metadata: Metadata = { title: "Sign in | India Uncharted admin", robots: { index: false, follow: false } };

/**
 * The folio grammar carried into the one screen most visitors never see: a
 * plate on one side, the page's business — signing in — written on paper
 * beside it. Nothing here is decoration for its own sake; the photograph is
 * Jodhpur, where the client actually works.
 */
export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  if (await getSession()) redirect("/admin");
  const [{ next }, hero] = await Promise.all([searchParams, getLoginMedia()]);

  return (
    <main className="grid min-h-dvh bg-paper lg:grid-cols-2">
      {/* Plate — hidden on a phone, where the form is the only thing worth the screen. */}
      <div className="relative hidden bg-ink p-(--spacing-band) lg:block">
        <div className="folio pearl-band relative h-full [--band:var(--color-forest-800)] [--rule:var(--color-gold-300)]">
          <MediaFrame media={hero?.media ?? null} ratio="fill" sizes="50vw" priority scrim="top-bottom" label="Jodhpur" className="h-full" />
          <div className="absolute inset-x-0 top-0 p-8 xl:p-12">
            <Link href="/" className="inline-flex items-center gap-2.5 text-paper">
              <SunMark className="size-7" />
              <span className="font-display text-subtitle">India Uncharted</span>
            </Link>
          </div>
          {hero?.caption ? (
            <div className="absolute inset-x-0 bottom-0 p-8 xl:p-12">
              <p className="max-w-sm font-display text-title text-paper">Private journeys, planned from Jodhpur.</p>
              <p className="mt-2 text-label text-gold-300">{hero.caption}</p>
            </div>
          ) : null}
        </div>
      </div>

      {/* Paper — the form, centred, at the width a form should be read at. */}
      <div className="flex items-center justify-center px-5 py-16 sm:px-10">
        <div className="w-full max-w-sm">
          <div className="flex items-center gap-2.5 lg:hidden">
            <SunMark className="size-7 text-terracotta-600" />
            <span className="font-display text-subtitle text-ink">India Uncharted</span>
          </div>
          <h1 className="mt-8 font-display text-display-md text-ink lg:mt-0">Sign in</h1>
          <p className="mt-2 text-small text-ink-2">Manage destinations, journeys, enquiries and the rest of the site.</p>

          <Suspense>
            <LoginForm next={next} />
          </Suspense>

          <RidgeRule tone="ink" className="mt-10" />
          <p className="mt-6 text-center text-caption text-ink-3">Trouble signing in? Ask whoever set up the site to reset your password.</p>
        </div>
      </div>
    </main>
  );
}
