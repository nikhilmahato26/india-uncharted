"use client";

import Image from "next/image";
import Link from "next/link";
import { useActionState, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, Upload } from "lucide-react";
import { deleteMedia, updateMedia, uploadMedia, type MediaState } from "@/app/actions/media";
import { Button } from "@/components/ui/button";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import { cn } from "@/lib/cn";

type Item = {
  id: string;
  url: string;
  altText: string;
  title: string | null;
  caption: string | null;
  credit: string | null;
  licence: string;
  width: number;
  height: number;
  bytes: number;
  createdAt: string;
  usageCount: number;
};

export function MediaLibrary({
  items,
  totals,
  activeFilter,
  canDelete,
}: {
  items: Item[];
  totals: { total: number; noAlt: number; unknownLicence: number };
  activeFilter: string | null;
  canDelete: boolean;
}) {
  const [state, action, uploading] = useActionState<MediaState, FormData>(uploadMedia, null);
  const [open, setOpen] = useState<Item | null>(null);

  return (
    <>
      <form action={action} className="mb-6 flex flex-wrap items-end gap-4 border border-rule bg-paper p-5">
        <div className="flex-1">
          <label htmlFor="files" className="text-small font-semibold text-ink">
            Add images
          </label>
          <p className="mt-1 text-caption text-ink-3">JPEG, PNG or WebP, up to 12MB each. Large photos are resized automatically.</p>
          <input
            id="files"
            name="files"
            type="file"
            accept="image/jpeg,image/png,image/webp,image/avif"
            multiple
            className="mt-2 block w-full text-small file:mr-3 file:min-h-11 file:border file:border-ink/25 file:bg-paper-2 file:px-4 file:text-small file:font-semibold"
          />
        </div>
        <Button type="submit" loading={uploading} icon={<Upload className="size-4" strokeWidth={1.75} />}>
          Upload
        </Button>
        {state?.ok ? (
          <p role="status" className="w-full text-small text-success">
            {state.count} {state.count === 1 ? "image" : "images"} added.
          </p>
        ) : null}
        {state && !state.ok ? (
          <p role="alert" className="w-full text-small text-danger">
            {state.error}
          </p>
        ) : null}
      </form>

      <nav aria-label="Filter images" className="mb-5 flex flex-wrap gap-2">
        {[
          { key: null, label: `All (${totals.total})` },
          { key: "no-alt", label: `No alt text (${totals.noAlt})` },
          { key: "unknown-licence", label: `Licence unconfirmed (${totals.unknownLicence})` },
        ].map((f) => (
          <Link
            key={f.label}
            href={f.key ? `/admin/media?filter=${f.key}` : "/admin/media"}
            aria-current={activeFilter === f.key ? "page" : undefined}
            className={cn(
              "inline-flex min-h-11 items-center border px-3 text-caption font-semibold",
              activeFilter === (f.key ?? null) ? "border-ink bg-ink text-paper" : "border-ink/20 text-ink-2 hover:border-ink/40",
            )}
          >
            {f.label}
          </Link>
        ))}
      </nav>

      <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {items.map((m) => (
          <li key={m.id}>
            <button type="button" onClick={() => setOpen(m)} className="block w-full border border-rule bg-paper p-1.5 text-left transition-colors hover:border-ink/40">
              <span className="relative block aspect-4/3 bg-paper-2">
                <Image src={m.url} alt="" fill sizes="(max-width: 640px) 45vw, 22vw" className="object-cover" />
              </span>
              <span className="mt-2 block truncate px-1 text-caption text-ink-2">{m.title ?? m.url.split("/").pop()}</span>
              <span className="mt-0.5 flex items-center gap-1.5 px-1 pb-1">
                {!m.altText ? (
                  <span className="flex items-center gap-1 text-caption text-warning">
                    <AlertTriangle className="size-3" strokeWidth={2} aria-hidden="true" /> no alt text
                  </span>
                ) : (
                  <span className="truncate text-caption text-ink-3">{m.altText}</span>
                )}
              </span>
            </button>
          </li>
        ))}
      </ul>

      {open ? <MediaDialog item={open} onClose={() => setOpen(null)} canDelete={canDelete} /> : null}
    </>
  );
}

function MediaDialog({ item, onClose, canDelete }: { item: Item; onClose: () => void; canDelete: boolean }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  return (
    <div role="dialog" aria-modal="true" aria-label="Image details" className="fixed inset-0 z-dialog flex items-end justify-center bg-ink/70 p-0 sm:items-center sm:p-6">
      <div className="max-h-[92dvh] w-full max-w-3xl overflow-y-auto bg-paper">
        <div className="flex items-center justify-between border-b border-rule px-5 py-4">
          <h2 className="font-display text-subtitle text-ink">Image details</h2>
          <button type="button" onClick={onClose} className="min-h-11 px-2 text-small text-ink-2 underline underline-offset-4">
            Close
          </button>
        </div>
        <div className="grid gap-5 p-5 sm:grid-cols-2">
          <div>
            <div className="relative aspect-4/3 border border-rule bg-paper-2">
              <Image src={item.url} alt={item.altText} fill sizes="40vw" className="object-contain" />
            </div>
            <p className="mt-2 text-caption text-ink-3">
              {item.width}×{item.height} · {(item.bytes / 1024).toFixed(0)} KB · used on {item.usageCount} {item.usageCount === 1 ? "page" : "pages"}
            </p>
          </div>

          <form
            action={(fd) =>
              startTransition(async () => {
                setError(null);
                try {
                  await updateMedia(item.id, fd);
                  router.refresh();
                  onClose();
                } catch (e) {
                  setError(e instanceof Error ? e.message : "That didn't save.");
                }
              })
            }
            className="grid gap-4"
          >
            <Field label="Alt text" htmlFor="altText" hint="What the picture shows. “Camels crossing a dune at sunset near Jaisalmer”, not “image1”.">
              <Textarea id="altText" name="altText" rows={3} defaultValue={item.altText} />
            </Field>
            <Field label="Title" htmlFor="title">
              <Input id="title" name="title" defaultValue={item.title ?? ""} />
            </Field>
            <Field label="Caption" htmlFor="caption" hint="Shown under the image where a caption is used.">
              <Input id="caption" name="caption" defaultValue={item.caption ?? ""} />
            </Field>
            <Field label="Credit" htmlFor="credit" hint="The photographer or source, if one must be named.">
              <Input id="credit" name="credit" defaultValue={item.credit ?? ""} />
            </Field>
            <Field label="Licence" htmlFor="licence" hint="Confirm you have the right to publish this image.">
              <Select id="licence" name="licence" defaultValue={item.licence}>
                <option value="OWNED">Ours — we took or commissioned it</option>
                <option value="LICENSED">Licensed — we have permission</option>
                <option value="UNKNOWN">Not confirmed yet</option>
              </Select>
            </Field>
            {error ? (
              <p role="alert" className="text-small text-danger">
                {error}
              </p>
            ) : null}
            <div className="flex flex-wrap items-center gap-3">
              <Button type="submit" loading={pending}>
                Save
              </Button>
              {canDelete ? (
                <button
                  type="button"
                  onClick={() =>
                    startTransition(async () => {
                      setError(null);
                      try {
                        await deleteMedia(item.id);
                        router.refresh();
                        onClose();
                      } catch (e) {
                        setError(e instanceof Error ? e.message : "That didn't delete.");
                      }
                    })
                  }
                  disabled={item.usageCount > 0}
                  title={item.usageCount > 0 ? "Used on a page — replace it there first." : undefined}
                  className="min-h-11 px-2 text-small text-danger underline underline-offset-4 disabled:text-ink-3 disabled:no-underline"
                >
                  {item.usageCount > 0 ? `Used on ${item.usageCount} ${item.usageCount === 1 ? "page" : "pages"}` : "Delete image"}
                </button>
              ) : null}
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
