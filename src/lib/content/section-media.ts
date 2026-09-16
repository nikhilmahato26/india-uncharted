import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import { db } from "@/lib/db";
import { TAGS } from "./tags";
import { mediaSelect, toMedia, type MediaSource } from "./media";

/** Resolve every `mediaId` referenced by a set of sections in one query. */
export async function resolveSectionMedia(sections: { props: Record<string, unknown> }[]): Promise<Map<string, MediaSource>> {
  "use cache";
  cacheTag(TAGS.media, TAGS.sections);
  cacheLife("days");
  const ids = new Set<string>();
  for (const s of sections) {
    const single = s.props?.mediaId;
    if (typeof single === "string") ids.add(single);
    const many = s.props?.mediaIds;
    if (Array.isArray(many)) for (const id of many) if (typeof id === "string") ids.add(id);
    const poster = s.props?.posterMediaId;
    if (typeof poster === "string") ids.add(poster);
  }
  if (!ids.size) return new Map();
  const rows = await db.media.findMany({ where: { id: { in: [...ids] } }, select: mediaSelect });
  return new Map(rows.map((r) => [r.id, toMedia(r)!]));
}
