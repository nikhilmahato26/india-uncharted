"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import {
  ArrowRightLeft,
  CarFront,
  CloudRain,
  ExternalLink,
  FileText,
  Footprints,
  Gauge,
  History,
  Image as ImageIcon,
  Inbox,
  LogOut,
  Map,
  MapPin,
  Menu,
  MessageCircleQuestion,
  Newspaper,
  Quote,
  Route,
  Search,
  Settings,
  Stethoscope,
  Tags,
  Users,
  X,
  type LucideIcon,
} from "lucide-react";
import { ADMIN_NAV } from "./nav-items";
import { can } from "@/lib/auth/rbac";
import type { SessionUser } from "@/lib/auth/session";
import { logout } from "@/app/actions/auth";
import { SunMark } from "@/components/brand/marks";
import { cn } from "@/lib/cn";

const ICONS: Record<string, LucideIcon> = {
  gauge: Gauge,
  inbox: Inbox,
  "map-pin": MapPin,
  map: Map,
  route: Route,
  footprints: Footprints,
  newspaper: Newspaper,
  "car-front": CarFront,
  "file-text": FileText,
  "message-circle-question": MessageCircleQuestion,
  quote: Quote,
  image: ImageIcon,
  search: Search,
  stethoscope: Stethoscope,
  tags: Tags,
  "arrow-right-left": ArrowRightLeft,
  settings: Settings,
  "cloud-rain": CloudRain,
  history: History,
  users: Users,
};

/**
 * Admin chrome: a quiet sidebar on desktop, a drawer on a phone. The owner
 * edits prices standing in a doorway as often as at a desk, so every control
 * here has to work at 390px.
 */
export function AdminShell({ user, children }: { user: SessionUser; children: React.ReactNode }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  // Reset while rendering the new route rather than in an effect: React applies it
  // before paint, so the drawer never flashes open on the page you just opened.
  const [lastPath, setLastPath] = useState(pathname);
  if (lastPath !== pathname) {
    setLastPath(pathname);
    if (open) setOpen(false);
  }
  useEffect(() => {
    document.documentElement.style.overflow = open ? "hidden" : "";
    return () => {
      document.documentElement.style.overflow = "";
    };
  }, [open]);

  const groups = ADMIN_NAV.map((g) => ({ ...g, items: g.items.filter((i) => !i.capability || can(user.role, i.capability)) })).filter((g) => g.items.length);

  const nav = (
    /* Tight enough that every group, SEO and Settings included, is in view on a
       laptop screen without scrolling the sidebar. */
    <nav aria-label="Admin" className="flex flex-1 flex-col gap-5 overflow-y-auto px-4 pb-6">
      {groups.map((group) => (
        <div key={group.heading}>
          <p className="px-2 text-label uppercase text-ink-3">{group.heading}</p>
          <ul className="mt-2 space-y-0.5">
            {group.items.map((item) => {
              const Icon = ICONS[item.icon] ?? FileText;
              const active = item.exact ? pathname === item.href : pathname === item.href || pathname.startsWith(`${item.href}/`);
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "flex min-h-9 items-center gap-3 px-2 py-1 text-small transition-colors",
                      active ? "bg-terracotta-600 text-paper" : "text-ink-2 hover:bg-paper-3/60 hover:text-ink",
                    )}
                  >
                    <Icon className="size-4 shrink-0" strokeWidth={1.75} aria-hidden="true" />
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );

  const account = (
    <div className="border-t border-rule px-4 py-4">
      <p className="truncate text-small font-semibold text-ink">{user.name}</p>
      <p className="truncate text-caption text-ink-3">{user.email}</p>
      <p className="mt-1 text-caption text-terracotta-700">{user.role.replace("_", " ").toLowerCase()}</p>
      <div className="mt-3 flex flex-wrap gap-3">
        <Link href="/admin/account" className="inline-flex min-h-9 items-center gap-1.5 text-caption text-ink-2 underline underline-offset-4 hover:text-ink">
          Your account
        </Link>
        <Link href="/" target="_blank" className="inline-flex min-h-9 items-center gap-1.5 text-caption text-ink-2 underline underline-offset-4 hover:text-ink">
          View site
          <ExternalLink className="size-3.5" strokeWidth={1.75} aria-hidden="true" />
        </Link>
        <form action={logout}>
          <button type="submit" className="inline-flex min-h-9 items-center gap-1.5 text-caption text-ink-2 underline underline-offset-4 hover:text-ink">
            Sign out
            <LogOut className="size-3.5" strokeWidth={1.75} aria-hidden="true" />
          </button>
        </form>
      </div>
    </div>
  );

  return (
    <div className="min-h-dvh bg-paper-2">
      {/* desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 hidden w-64 flex-col border-r border-rule bg-paper lg:flex">
        <div aria-hidden="true" className="pearl-band h-1.5" />
        <Link href="/admin" className="flex items-center gap-2.5 px-5 py-5">
          <SunMark className="size-6 text-terracotta-600" />
          <span className="font-display text-subtitle text-ink">India Uncharted</span>
        </Link>
        {nav}
        {account}
      </aside>

      {/* mobile bar */}
      <header className="sticky top-0 z-sticky flex items-center justify-between border-b border-rule bg-paper px-4 py-3 lg:hidden">
        <Link href="/admin" className="flex items-center gap-2">
          <SunMark className="size-5 text-terracotta-600" />
          <span className="font-display text-subtitle text-ink">Admin</span>
        </Link>
        <button type="button" onClick={() => setOpen(true)} aria-label="Open menu" aria-expanded={open} className="flex size-11 items-center justify-center text-ink">
          <Menu className="size-6" strokeWidth={1.5} />
        </button>
      </header>

      {open ? (
        <div role="dialog" aria-modal="true" aria-label="Admin menu" className="fixed inset-0 z-drawer flex flex-col bg-paper lg:hidden">
          <div className="flex items-center justify-between border-b border-rule px-4 py-3">
            <span className="font-display text-subtitle text-ink">Menu</span>
            <button type="button" onClick={() => setOpen(false)} aria-label="Close menu" className="flex size-11 items-center justify-center text-ink">
              <X className="size-6" strokeWidth={1.5} />
            </button>
          </div>
          {nav}
          {account}
        </div>
      ) : null}

      <div className="lg:pl-64">
        <main className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 lg:px-10 lg:py-10">{children}</main>
      </div>
    </div>
  );
}
