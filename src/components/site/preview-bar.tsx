import { isPreview } from "@/lib/content/visibility";

/**
 * Shown only while an editor is previewing. Draft content is visible above it,
 * so the bar has to say plainly that this is not what the public sees.
 */
export async function PreviewBar({ path }: { path: string }) {
  if (!(await isPreview())) return null;
  return (
    <div className="fixed inset-x-0 bottom-0 z-toast border-t border-gold-300 bg-ink px-4 py-2.5 text-paper">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3">
        <p className="text-small">
          <strong className="font-semibold">Preview.</strong> You’re seeing drafts and unpublished changes. Visitors don’t see this.
        </p>
        <a href={`/api/preview/exit?path=${encodeURIComponent(path)}`} className="inline-flex min-h-10 items-center border border-paper/50 px-4 text-caption font-semibold hover:bg-paper/10">
          Leave preview
        </a>
      </div>
    </div>
  );
}
