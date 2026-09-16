"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useId, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { ChevronDown, Menu, Phone, X } from "lucide-react";
import type { NavItem } from "@/lib/content/nav";
import type { MediaSource } from "@/lib/content/media";
import { cn } from "@/lib/cn";
import { buttonClasses } from "@/components/ui/button";

type Props = {
  items: NavItem[];
  logo: MediaSource | null;
  logoLight: MediaSource | null;
  cta: { label: string; href: string };
  phone: { href: string; display: string } | null;
};

const EASE = [0.16, 1, 0.3, 1] as const;

export function SiteHeader({ items, logo, logoLight, cta, phone }: Props) {
  const pathname = usePathname();
  const overlayRoute = pathname === "/";
  const [scrolled, setScrolled] = useState(false);
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const [drawer, setDrawer] = useState(false);
  const reduce = useReducedMotion();
  const headerRef = useRef<HTMLElement>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 32);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Closing on navigation happens while rendering the new route, not in an effect:
  // React applies it before paint, so no menu flashes on the page just opened.
  const [lastPath, setLastPath] = useState(pathname);
  if (lastPath !== pathname) {
    setLastPath(pathname);
    if (openMenu) setOpenMenu(null);
    if (drawer) setDrawer(false);
  }

  useEffect(() => {
    if (!openMenu && !drawer) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpenMenu(null);
        setDrawer(false);
      }
    };
    const onClick = (e: MouseEvent) => {
      if (openMenu && headerRef.current && !headerRef.current.contains(e.target as Node)) setOpenMenu(null);
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("mousedown", onClick);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("mousedown", onClick);
    };
  }, [openMenu, drawer]);

  useEffect(() => {
    document.documentElement.style.overflow = drawer ? "hidden" : "";
    return () => {
      document.documentElement.style.overflow = "";
    };
  }, [drawer]);

  const transparent = overlayRoute && !scrolled && !openMenu;
  const hoverOpen = useCallback((label: string) => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    setOpenMenu(label);
  }, []);
  const hoverClose = useCallback(() => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    closeTimer.current = setTimeout(() => setOpenMenu(null), 160);
  }, []);

  const activeMega = items.find((i) => i.kind === "mega" && i.label === openMenu);
  const logoMedia = transparent ? logoLight ?? logo : logo;

  return (
    <>
      <a
        href="#main"
        className="sr-only z-toast bg-ink px-4 py-3 text-paper focus:not-sr-only focus:fixed focus:top-3 focus:left-3"
      >
        Skip to content
      </a>
      <header
        ref={headerRef}
        onMouseLeave={hoverClose}
        className={cn(
          "fixed inset-x-0 top-0 z-header transition-[background-color,color,box-shadow] duration-(--duration-base) ease-(--ease-out-expo)",
          transparent ? "bg-transparent text-paper" : "bg-paper/97 text-ink shadow-[0_1px_0_var(--color-rule)] backdrop-blur-[2px]",
        )}
        data-surface={transparent ? "dark" : "light"}
      >
        {/*
         * Floating over a photograph the header does not control, the light logo
         * and white type need their own ground. This scrim holds through the bar
         * and releases below it, so the picture still opens the page.
         */}
        <div
          aria-hidden="true"
          className={cn(
            "pointer-events-none absolute inset-x-0 top-0 h-[calc(100%+2.5rem)] transition-opacity duration-(--duration-base)",
            "bg-[linear-gradient(to_bottom,rgb(18_14_10/0.62)_0%,rgb(18_14_10/0.55)_42%,rgb(18_14_10/0.4)_64%,transparent_100%)]",
            transparent ? "opacity-100" : "opacity-0",
          )}
        />
        <div
          aria-hidden="true"
          className={cn("pearl-band relative h-1 transition-opacity duration-(--duration-base)", transparent ? "opacity-0" : "opacity-100")}
        />
        <div className="relative container-folio flex h-[4.5rem] items-center justify-between gap-6 lg:h-20">
          <Link href="/" className="relative -my-2 flex shrink-0 items-center py-2" aria-label="India Uncharted — home">
            {logoMedia ? (
              <Image
                src={logoMedia.src}
                alt="India Uncharted"
                width={logoMedia.width}
                height={logoMedia.height}
                priority
                className="h-10 w-auto lg:h-12"
              />
            ) : (
              <span className="font-display text-title">India Uncharted</span>
            )}
          </Link>

          <nav aria-label="Main" className="hidden lg:block">
            <ul className="flex items-center gap-1">
              {items.map((item) =>
                item.kind === "link" ? (
                  <li key={item.label}>
                    <NavAnchor href={item.href} active={pathname.startsWith(item.href)} onEnter={() => setOpenMenu(null)}>
                      {item.label}
                    </NavAnchor>
                  </li>
                ) : (
                  <li key={item.label} onMouseEnter={() => hoverOpen(item.label)}>
                    <button
                      type="button"
                      aria-expanded={openMenu === item.label}
                      aria-controls="mega-panel"
                      onClick={() => setOpenMenu((m) => (m === item.label ? null : item.label))}
                      className={cn(
                        "relative flex min-h-11 items-center gap-1 px-3 text-small font-medium",
                        "after:absolute after:inset-x-3 after:bottom-2 after:h-px after:origin-left after:scale-x-0 after:bg-current after:transition-transform after:duration-(--duration-base) after:ease-(--ease-out-expo)",
                        (openMenu === item.label || pathname.startsWith(item.href)) && "after:scale-x-100",
                      )}
                    >
                      {item.label}
                      <ChevronDown
                        className={cn("size-3.5 transition-transform duration-(--duration-base)", openMenu === item.label && "rotate-180")}
                        strokeWidth={1.75}
                        aria-hidden="true"
                      />
                    </button>
                  </li>
                ),
              )}
            </ul>
          </nav>

          <div className="flex items-center gap-2">
            <Link
              href={cta.href}
              className={cn(
                "hidden sm:inline-flex",
                buttonClasses({ variant: transparent ? "on-dark-solid" : "primary", size: "sm" }),
              )}
            >
              <span>{cta.label}</span>
            </Link>
            <button
              type="button"
              className="flex size-11 items-center justify-center lg:hidden"
              aria-label="Open menu"
              aria-expanded={drawer}
              onClick={() => setDrawer(true)}
            >
              <Menu className="size-6" strokeWidth={1.5} />
            </button>
          </div>
        </div>

        <AnimatePresence>
          {activeMega && activeMega.kind === "mega" ? (
            <motion.div
              id="mega-panel"
              key={activeMega.label}
              initial={reduce ? false : { opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={reduce ? { opacity: 0 } : { opacity: 0, y: -4 }}
              transition={{ duration: 0.28, ease: EASE }}
              onMouseEnter={() => hoverOpen(activeMega.label)}
              className="absolute inset-x-0 top-full hidden border-t border-rule bg-paper text-ink shadow-(--shadow-float) lg:block"
            >
              <MegaPanel item={activeMega} />
            </motion.div>
          ) : null}
        </AnimatePresence>
      </header>

      <MobileDrawer open={drawer} onClose={() => setDrawer(false)} items={items} cta={cta} phone={phone} logo={logo} />
    </>
  );
}

function NavAnchor({ href, active, children, onEnter }: { href: string; active: boolean; children: React.ReactNode; onEnter: () => void }) {
  return (
    <Link
      href={href}
      onMouseEnter={onEnter}
      aria-current={active ? "page" : undefined}
      className={cn(
        "relative flex min-h-11 items-center px-3 text-small font-medium",
        "after:absolute after:inset-x-3 after:bottom-2 after:h-px after:origin-left after:scale-x-0 after:bg-current after:transition-transform after:duration-(--duration-base) after:ease-(--ease-out-expo) hover:after:scale-x-100",
        active && "after:scale-x-100",
      )}
    >
      {children}
    </Link>
  );
}

function MegaPanel({ item }: { item: Extract<NavItem, { kind: "mega" }> }) {
  const many = item.columns.length > 2;
  return (
    <div className="container-folio grid grid-cols-12 gap-10 py-10">
      <div className={cn("col-span-12 grid gap-x-10 gap-y-8", many ? "grid-cols-3 xl:col-span-10 xl:grid-cols-4" : item.feature ? "col-span-7 grid-cols-2" : "col-span-9 grid-cols-3")}>
        {item.columns.map((col) => (
          <div key={col.heading}>
            {col.href ? (
              <Link href={col.href} className="font-display text-subtitle text-ink hover:text-terracotta-700">
                {col.heading}
              </Link>
            ) : (
              <p className="font-display text-subtitle text-ink">{col.heading}</p>
            )}
            <span aria-hidden="true" className="mt-2 mb-3 block h-px w-10 bg-gold-500" />
            <ul className={cn("space-y-1", !many && col.links.length > 6 && "columns-2 gap-8 space-y-0")}>
              {col.links.map((l) => (
                <li key={l.href} className="break-inside-avoid">
                  <Link href={l.href} className="flex min-h-9 items-center text-small text-ink-2 hover:text-terracotta-700">
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className={cn("col-span-12", many ? "xl:col-span-2" : item.feature ? "col-span-5" : "col-span-3")}>
        {item.feature ? (
          <Link href={item.feature.href} className="group/feature block">
            <div className="folio [--band:var(--color-forest-800)]">
              <div className="relative aspect-[16/10] overflow-hidden bg-paper-3">
                {item.feature.image ? (
                  <Image
                    src={item.feature.image.src}
                    alt={item.feature.image.alt}
                    fill
                    sizes="30vw"
                    className="object-cover transition-transform duration-(--duration-slow) ease-(--ease-out-expo) group-hover/feature:scale-[1.03]"
                  />
                ) : null}
              </div>
            </div>
            <p className="mt-3 font-display text-subtitle text-ink group-hover/feature:text-terracotta-700">{item.feature.title}</p>
            {item.feature.meta ? <p className="text-caption text-ink-3">{item.feature.meta}</p> : null}
          </Link>
        ) : (
          <Link href={item.href} className="inline-flex min-h-11 items-center gap-2 text-small font-semibold text-terracotta-700 underline underline-offset-4">
            All {item.label.toLowerCase()}
          </Link>
        )}
        {item.feature ? (
          <Link href={item.href} className="mt-4 inline-flex min-h-11 items-center text-small font-semibold text-terracotta-700 underline underline-offset-4">
            All {item.label.toLowerCase()}
          </Link>
        ) : null}
      </div>
    </div>
  );
}

function MobileDrawer({
  open,
  onClose,
  items,
  cta,
  phone,
  logo,
}: {
  open: boolean;
  onClose: () => void;
  items: NavItem[];
  cta: { label: string; href: string };
  phone: { href: string; display: string } | null;
  logo: MediaSource | null;
}) {
  const reduce = useReducedMotion();
  const titleId = useId();
  const [section, setSection] = useState<string | null>(null);
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (open) closeRef.current?.focus();
  }, [open]);

  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId}
          className="fixed inset-0 z-drawer flex flex-col bg-paper text-ink lg:hidden"
          initial={reduce ? { opacity: 0 } : { clipPath: "inset(0 0 100% 0)" }}
          animate={reduce ? { opacity: 1 } : { clipPath: "inset(0 0 0% 0)" }}
          exit={reduce ? { opacity: 0 } : { clipPath: "inset(0 0 100% 0)" }}
          transition={{ duration: 0.5, ease: EASE }}
        >
          <div aria-hidden="true" className="pearl-band h-1" />
          <div className="container-folio flex h-[4.5rem] items-center justify-between">
            <p id={titleId} className="sr-only">
              Menu
            </p>
            {logo ? <Image src={logo.src} alt="India Uncharted" width={logo.width} height={logo.height} className="h-10 w-auto" /> : null}
            <button ref={closeRef} type="button" onClick={onClose} className="flex size-11 items-center justify-center" aria-label="Close menu">
              <X className="size-6" strokeWidth={1.5} />
            </button>
          </div>
          <nav aria-label="Mobile" className="container-folio flex-1 overflow-y-auto pb-8">
            <ul className="divide-y divide-rule border-y border-rule">
              {items.map((item) =>
                item.kind === "link" ? (
                  <li key={item.label}>
                    <Link href={item.href} className="flex min-h-16 items-center font-display text-title" onClick={onClose}>
                      {item.label}
                    </Link>
                  </li>
                ) : (
                  <li key={item.label}>
                    <button
                      type="button"
                      className="flex min-h-16 w-full items-center justify-between font-display text-title"
                      aria-expanded={section === item.label}
                      onClick={() => setSection((s) => (s === item.label ? null : item.label))}
                    >
                      {item.label}
                      <ChevronDown className={cn("size-5 transition-transform duration-(--duration-base)", section === item.label && "rotate-180")} strokeWidth={1.5} />
                    </button>
                    <AnimatePresence initial={false}>
                      {section === item.label ? (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.32, ease: EASE }}
                          className="overflow-hidden"
                        >
                          <div className="space-y-5 pb-6">
                            {item.columns.map((col) => (
                              <div key={col.heading}>
                                {col.href ? (
                                  <Link href={col.href} onClick={onClose} className="text-label uppercase text-terracotta-700">
                                    {col.heading}
                                  </Link>
                                ) : (
                                  <p className="text-label uppercase text-terracotta-700">{col.heading}</p>
                                )}
                                <ul className="mt-1 grid grid-cols-2 gap-x-4">
                                  {col.links.map((l) => (
                                    <li key={l.href}>
                                      <Link href={l.href} onClick={onClose} className="flex min-h-11 items-center text-body text-ink-2">
                                        {l.label}
                                      </Link>
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            ))}
                            <Link href={item.href} onClick={onClose} className="inline-flex min-h-11 items-center text-small font-semibold text-terracotta-700 underline underline-offset-4">
                              All {item.label.toLowerCase()}
                            </Link>
                          </div>
                        </motion.div>
                      ) : null}
                    </AnimatePresence>
                  </li>
                ),
              )}
            </ul>
          </nav>
          <div className="container-folio grid gap-3 border-t border-rule py-5 pb-[max(1.25rem,env(safe-area-inset-bottom))]">
            <Link href={cta.href} onClick={onClose} className={buttonClasses({ variant: "primary", size: "lg", className: "w-full" })}>
              <span>{cta.label}</span>
            </Link>
            {phone ? (
              <a href={phone.href} className={buttonClasses({ variant: "secondary", size: "lg", className: "w-full" })}>
                <Phone className="size-4" strokeWidth={1.75} aria-hidden="true" />
                <span>Call {phone.display}</span>
              </a>
            ) : null}
          </div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
