import Image from "next/image";
import Link from "next/link";
import type { NavItem } from "@/lib/content/nav";
import type { MediaSource } from "@/lib/content/media";
import { buttonClasses } from "@/components/ui/button";

/**
 * The header as it appears in the prerendered shell, before the interactive one
 * takes over: same height, same links, fully usable without JavaScript.
 */
export function HeaderFallback({ items, logo, cta }: { items: NavItem[]; logo: MediaSource | null; cta: { label: string; href: string } }) {
  return (
    <header className="fixed inset-x-0 top-0 z-header bg-paper/97 text-ink shadow-[0_1px_0_var(--color-rule)]">
      <div aria-hidden="true" className="pearl-band h-1" />
      <div className="container-folio flex h-[4.5rem] items-center justify-between gap-6 lg:h-20">
        <Link href="/" className="flex shrink-0 items-center py-2" aria-label="India Uncharted — home">
          {logo ? (
            <Image src={logo.src} alt="India Uncharted" width={logo.width} height={logo.height} priority className="h-10 w-auto lg:h-12" />
          ) : (
            <span className="font-display text-title">India Uncharted</span>
          )}
        </Link>
        <nav aria-label="Main" className="hidden lg:block">
          <ul className="flex items-center gap-1">
            {items.map((item) => (
              <li key={item.label}>
                <Link href={item.href} className="flex min-h-11 items-center px-3 text-small font-medium">
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        <Link href={cta.href} className={buttonClasses({ variant: "primary", size: "sm", className: "hidden sm:inline-flex" })}>
          <span>{cta.label}</span>
        </Link>
      </div>
    </header>
  );
}
