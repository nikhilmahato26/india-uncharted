import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { getSession } from "@/lib/auth/session";
import { LoginForm } from "./login-form";
import { SunMark } from "@/components/brand/marks";

// Admin pages are per-user and always render at request time.
export const instant = false;

export const metadata: Metadata = { title: "Sign in | India Uncharted admin", robots: { index: false, follow: false } };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  if (await getSession()) redirect("/admin");
  const { next } = await searchParams;

  return (
    <main className="flex min-h-dvh items-center justify-center bg-paper-2 px-5 py-16">
      <div className="w-full max-w-md">
        <div className="bg-paper p-8 outline outline-gold-500/60 -outline-offset-[6px]">
          <SunMark className="size-8 text-terracotta-600" />
          <h1 className="mt-4 font-display text-title text-ink">India Uncharted</h1>
          <p className="mt-1 text-small text-ink-3">Sign in to manage the website.</p>
          <Suspense>
            <LoginForm next={next} />
          </Suspense>
        </div>
        <p className="mt-6 text-center text-caption text-ink-3">
          Trouble signing in? Ask whoever set up the site to reset your password.
        </p>
      </div>
    </main>
  );
}
