import type { BlockNode, InlineNode, RichDoc } from "./types";
import { isRichDoc } from "./types";

/** Plain-text helpers shared by SEO analysis, reading time, excerpts and search. */

function inlineText(nodes: InlineNode[] | undefined): string {
  if (!nodes) return "";
  return nodes.map((n) => (n.type === "text" ? n.text : " ")).join("");
}

function blockText(node: BlockNode): string {
  switch (node.type) {
    case "paragraph":
    case "heading":
      return inlineText(node.content);
    case "bulletList":
    case "orderedList":
      return node.content.map((li) => li.content.map(blockText).join(" ")).join("\n");
    case "blockquote":
    case "callout":
      return node.content.map(blockText).join("\n");
    case "table":
      return node.content.map((row) => row.content.map((c) => c.content.map(blockText).join(" ")).join(" ")).join("\n");
    case "image":
      return node.attrs.caption ?? "";
    default:
      return "";
  }
}

export function docToPlainText(doc: unknown): string {
  if (!isRichDoc(doc)) return "";
  return doc.content.map(blockText).filter(Boolean).join("\n\n").replace(/[ \t]+/g, " ").trim();
}

export function wordCount(...parts: Array<string | null | undefined>): number {
  return parts
    .filter(Boolean)
    .join(" ")
    .split(/\s+/)
    .filter((w) => /[\p{L}\p{N}]/u.test(w)).length;
}

export function readingMinutes(doc: unknown): number {
  return Math.max(1, Math.round(wordCount(docToPlainText(doc)) / 220));
}

export function headingSlug(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s-]/gu, "")
    .trim()
    .replace(/\s+/g, "-")
    .slice(0, 80);
}

export type TocEntry = { id: string; text: string; level: number };

/** H2/H3 outline with stable, de-duplicated ids — used for the table of contents and the heading checker. */
export function docOutline(doc: unknown): TocEntry[] {
  if (!isRichDoc(doc)) return [];
  const used = new Map<string, number>();
  const out: TocEntry[] = [];
  for (const node of (doc as RichDoc).content) {
    if (node.type !== "heading") continue;
    const text = inlineText(node.content).trim();
    if (!text) continue;
    const base = headingSlug(text) || "section";
    const n = used.get(base) ?? 0;
    used.set(base, n + 1);
    out.push({ id: n ? `${base}-${n + 1}` : base, text, level: node.attrs.level });
  }
  return out;
}

export function excerpt(text: string | null | undefined, max = 160): string {
  if (!text) return "";
  const clean = text.replace(/\s+/g, " ").trim();
  if (clean.length <= max) return clean;
  const cut = clean.slice(0, max - 1);
  return `${cut.slice(0, Math.max(cut.lastIndexOf(" "), max * 0.6))}…`;
}

/** Remove emoji and pictographs (the old site used them as heading icons). */
export function stripEmoji(text: string): string {
  return text
    .replace(/[\p{Extended_Pictographic}\u{1F1E6}-\u{1F1FF}\u{FE0F}\u{200D}]/gu, "")
    .replace(/\s{2,}/g, " ")
    .trim();
}

/**
 * A card intro is cut from the client's own opening paragraph. Cutting on a
 * character count leaves sentences clipped mid-word ("…heritage monum"), so the
 * cut lands on the last full sentence that fits, or failing that on a word
 * boundary with an ellipsis.
 */
export function summarize(text: string, max = 300): string {
  const clean = text.replace(/\s+/g, " ").trim();
  if (clean.length <= max) return clean;
  const window = clean.slice(0, max + 1);
  const sentence = Math.max(window.lastIndexOf(". "), window.lastIndexOf("! "), window.lastIndexOf("? "));
  if (sentence >= max * 0.55) return window.slice(0, sentence + 1).trim();
  const word = window.lastIndexOf(" ");
  return `${window.slice(0, word > 0 ? word : max).replace(/[,;:\u2013\u2014\s]+$/, "")}\u2026`;
}
