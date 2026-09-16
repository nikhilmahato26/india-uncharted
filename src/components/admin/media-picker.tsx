"use client";

import Image from "next/image";
import { useMemo, useRef, useState } from "react";
import { ImageOff, Search, X } from "lucide-react";
import { cn } from "@/lib/cn";

export type MediaOption = { id: string; url: string; alt: string; title: string | null; width: number; height: number; licence: string };

/**
 * Picks an image from the library. Shows the alt text with each option,
 * because choosing a picture with no alt text is a decision worth seeing.
 */
export function MediaPicker({ name, label, options, initialId, help }: { name: string; label: string; options: MediaOption[]; initialId?: string | null; help?: string }) {
  const [selected, setSelected] = useState<string | null>(initialId ?? null);
  const [query, setQuery] = useState("");
  const dialog = useRef<HTMLDialogElement>(null);

  const current = options.find((o) => o.id === selected) ?? null;
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options.slice(0, 120);
    return options.filter((o) => `${o.title ?? ""} ${o.alt} ${o.url}`.toLowerCase().includes(q)).slice(0, 120);
  }, [options, query]);

  return (
    <div>
      <p className="text-small font-semibold text-ink">{label}</p>
      {help ? <p className="mt-1 text-caption text-ink-3">{help}</p> : null}
      <input type="hidden" name={name} value={selected ?? ""} />
      <div className="mt-2 flex items-start gap-4">
        <div className="relative size-24 shrink-0 border border-rule bg-paper-2">
          {current ? (
            <Image src={current.url} alt={current.alt || ""} fill sizes="96px" className="object-cover" />
          ) : (
            <span className="flex size-full items-center justify-center text-ink-3">
              <ImageOff className="size-5" strokeWidth={1.5} aria-hidden="true" />
            </span>
          )}
        </div>
        <div className="min-w-0 flex-1">
          {current ? (
            <>
              <p className="truncate text-small text-ink">{current.title || current.url.split("/").pop()}</p>
              <p className={cn("mt-0.5 text-caption", current.alt ? "text-ink-3" : "text-warning")}>{current.alt || "No alt text — add one in the media library."}</p>
            </>
          ) : (
            <p className="text-small text-ink-3">Nothing chosen.</p>
          )}
          <div className="mt-2 flex gap-3">
            <button type="button" onClick={() => dialog.current?.showModal()} className="text-caption font-semibold text-terracotta-700 underline underline-offset-4">
              {current ? "Change image" : "Choose image"}
            </button>
            {current ? (
              <button type="button" onClick={() => setSelected(null)} className="text-caption text-ink-2 underline underline-offset-4">
                Remove
              </button>
            ) : null}
          </div>
        </div>
      </div>

      <dialog ref={dialog} className="m-0 max-h-dvh w-full max-w-4xl bg-transparent p-0 backdrop:bg-ink/70 sm:top-1/2 sm:left-1/2 sm:max-h-[88dvh] sm:-translate-x-1/2 sm:-translate-y-1/2">
        <div className="flex max-h-dvh flex-col bg-paper sm:max-h-[88dvh]">
          <div className="flex items-center justify-between gap-4 border-b border-rule px-5 py-4">
            <h2 className="font-display text-subtitle text-ink">Choose an image</h2>
            <button type="button" onClick={() => dialog.current?.close()} aria-label="Close" className="flex size-10 items-center justify-center text-ink-2 hover:text-ink">
              <X className="size-5" strokeWidth={1.5} />
            </button>
          </div>
          <div className="border-b border-rule px-5 py-3">
            <div className="relative">
              <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-ink-3" strokeWidth={1.75} aria-hidden="true" />
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search the library…"
                aria-label="Search images"
                className="min-h-11 w-full border border-ink/25 bg-paper py-2 pr-3 pl-9 text-small focus:border-terracotta-600 focus:outline-none"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3 overflow-y-auto p-5 sm:grid-cols-4 lg:grid-cols-5">
            {filtered.map((o) => (
              <button
                key={o.id}
                type="button"
                onClick={() => {
                  setSelected(o.id);
                  dialog.current?.close();
                }}
                className={cn("group/pick border p-1 text-left transition-colors", selected === o.id ? "border-terracotta-600" : "border-rule hover:border-ink/40")}
              >
                <span className="relative block aspect-4/3 bg-paper-2">
                  <Image src={o.url} alt="" fill sizes="20vw" className="object-cover" />
                </span>
                <span className="mt-1 block truncate text-caption text-ink-2">{o.title || o.url.split("/").pop()}</span>
                {!o.alt ? <span className="block text-caption text-warning">no alt text</span> : null}
              </button>
            ))}
            {!filtered.length ? <p className="col-span-full py-8 text-center text-small text-ink-3">Nothing matches that.</p> : null}
          </div>
        </div>
      </dialog>
    </div>
  );
}
