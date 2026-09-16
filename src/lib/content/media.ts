/** The shape every photograph reaches a component in. Only `MediaFrame` renders it. */
export type MediaSource = {
  id: string;
  src: string;
  width: number;
  height: number;
  alt: string;
  blurDataUrl: string | null;
  caption: string | null;
  credit: string | null;
};

export const mediaSelect = {
  id: true,
  url: true,
  width: true,
  height: true,
  altText: true,
  blurDataUrl: true,
  caption: true,
  credit: true,
} as const;

type MediaRow = {
  id: string;
  url: string;
  width: number;
  height: number;
  altText: string;
  blurDataUrl: string | null;
  caption: string | null;
  credit: string | null;
};

/**
 * `fallbackAlt` is used only when the library item has no alt text yet; it
 * names what the picture is attached to, never "image" or "photo".
 */
export function toMedia(row: MediaRow | null | undefined, fallbackAlt = ""): MediaSource | null {
  if (!row) return null;
  return {
    id: row.id,
    src: row.url,
    width: row.width,
    height: row.height,
    alt: row.altText || fallbackAlt,
    blurDataUrl: row.blurDataUrl,
    caption: row.caption,
    credit: row.credit,
  };
}
