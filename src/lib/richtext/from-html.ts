import * as cheerio from "cheerio";
import type { AnyNode, Element } from "domhandler";
import type { BlockNode, InlineNode, ListItemNode, Mark, RichDoc, TableRowNode } from "./types";
import { stripEmoji } from "./text";

/**
 * HTML → Tiptap JSON. Used by the WordPress importer and by "paste HTML" in the
 * editor. Anything outside the allowlist is flattened to its text, so legacy
 * page-builder markup, inline styles and scripts never survive.
 */

export type FromHtmlOptions = {
  /** Map an <a href> to a site-internal path (or null to drop the link). */
  rewriteLink?: (href: string) => string | null;
  /** Map an <img src> to a stored image (or null to drop the image). */
  rewriteImage?: (src: string, alt: string) => { src: string; alt: string; mediaId?: string | null } | null;
  /** Lowest heading level allowed in the body; H1 is always demoted. */
  minHeadingLevel?: 2 | 3;
};

const BLOCK_TAGS = new Set(["p", "h1", "h2", "h3", "h4", "h5", "h6", "ul", "ol", "blockquote", "hr", "img", "table", "figure", "div", "section", "article"]);

function normaliseText(text: string): string {
  return text.replace(/ /g, " ").replace(/[ \t\r\n]+/g, " ");
}

function addMark(marks: Mark[], mark: Mark): Mark[] {
  return marks.some((m) => m.type === mark.type) ? marks : [...marks, mark];
}

function inlineFrom($: cheerio.CheerioAPI, nodes: AnyNode[], marks: Mark[], opts: FromHtmlOptions): InlineNode[] {
  const out: InlineNode[] = [];
  for (const node of nodes) {
    if (node.type === "text") {
      const text = normaliseText((node as unknown as { data: string }).data);
      if (text) out.push(marks.length ? { type: "text", text, marks } : { type: "text", text });
      continue;
    }
    if (node.type !== "tag") continue;
    const el = node as Element;
    const tag = el.tagName.toLowerCase();
    const children = el.children as AnyNode[];
    if (tag === "br") out.push({ type: "hardBreak" });
    else if (tag === "strong" || tag === "b") out.push(...inlineFrom($, children, addMark(marks, { type: "bold" }), opts));
    else if (tag === "em" || tag === "i") out.push(...inlineFrom($, children, addMark(marks, { type: "italic" }), opts));
    else if (tag === "u") out.push(...inlineFrom($, children, addMark(marks, { type: "underline" }), opts));
    else if (tag === "a") {
      const raw = $(el).attr("href") ?? "";
      const href = opts.rewriteLink ? opts.rewriteLink(raw) : raw;
      const safe = href && /^(https?:|mailto:|tel:|\/|#)/i.test(href) ? href : null;
      out.push(...inlineFrom($, children, safe ? addMark(marks, { type: "link", attrs: { href: safe } }) : marks, opts));
    } else if (tag === "img") {
      // inline images are not supported; handled at block level
    } else out.push(...inlineFrom($, children, marks, opts));
  }
  return tidyInline(out);
}

function tidyInline(nodes: InlineNode[]): InlineNode[] {
  // merge adjacent text with identical marks, trim edges, drop leading/trailing breaks
  const merged: InlineNode[] = [];
  for (const n of nodes) {
    const prev = merged[merged.length - 1];
    if (n.type === "text" && prev?.type === "text" && JSON.stringify(prev.marks ?? []) === JSON.stringify(n.marks ?? [])) {
      prev.text += n.text;
    } else merged.push(n.type === "text" ? { ...n } : n);
  }
  while (merged[0]?.type === "hardBreak") merged.shift();
  while (merged[merged.length - 1]?.type === "hardBreak") merged.pop();
  const first = merged[0];
  if (first?.type === "text") first.text = first.text.replace(/^\s+/, "");
  const last = merged[merged.length - 1];
  if (last?.type === "text") last.text = last.text.replace(/\s+$/, "");
  return merged.filter((n) => n.type !== "text" || n.text.length > 0);
}

function hasBlockChildren(el: Element): boolean {
  return (el.children as AnyNode[]).some((c) => c.type === "tag" && BLOCK_TAGS.has((c as Element).tagName.toLowerCase()));
}

function blocksFrom($: cheerio.CheerioAPI, nodes: AnyNode[], opts: FromHtmlOptions): BlockNode[] {
  const out: BlockNode[] = [];
  let pendingInline: AnyNode[] = [];
  const flush = () => {
    if (!pendingInline.length) return;
    const content = inlineFrom($, pendingInline, [], opts);
    if (content.some((n) => n.type === "text" && n.text.trim())) out.push({ type: "paragraph", content });
    pendingInline = [];
  };

  for (const node of nodes) {
    if (node.type === "text") {
      pendingInline.push(node);
      continue;
    }
    if (node.type !== "tag") continue;
    const el = node as Element;
    const tag = el.tagName.toLowerCase();
    if (["script", "style", "noscript", "svg", "iframe", "form", "button", "input"].includes(tag)) continue;

    if (!BLOCK_TAGS.has(tag) && !["li", "tr", "thead", "tbody"].includes(tag)) {
      pendingInline.push(node);
      continue;
    }
    flush();
    const children = el.children as AnyNode[];

    if (/^h[1-6]$/.test(tag)) {
      const min = opts.minHeadingLevel ?? 2;
      const level = Math.min(6, Math.max(min, Number(tag[1]))) as 2 | 3 | 4 | 5 | 6;
      const content = inlineFrom($, children, [], opts).map((n) => (n.type === "text" ? { ...n, text: stripEmoji(n.text) } : n));
      if (content.some((n) => n.type === "text" && n.text.trim())) out.push({ type: "heading", attrs: { level }, content });
    } else if (tag === "p") {
      if (hasBlockChildren(el)) out.push(...blocksFrom($, children, opts));
      else {
        const content = inlineFrom($, children, [], opts);
        if (content.some((n) => n.type === "text" && n.text.trim())) out.push({ type: "paragraph", content });
      }
    } else if (tag === "ul" || tag === "ol") {
      const items: ListItemNode[] = [];
      $(el)
        .children("li")
        .each((_, li) => {
          const content = blocksFrom($, li.children as AnyNode[], opts);
          if (content.length) items.push({ type: "listItem", content });
        });
      if (items.length) out.push(tag === "ul" ? { type: "bulletList", content: items } : { type: "orderedList", content: items });
    } else if (tag === "blockquote") {
      const content = blocksFrom($, children, opts);
      if (content.length) out.push({ type: "blockquote", content });
    } else if (tag === "hr") {
      out.push({ type: "horizontalRule" });
    } else if (tag === "img") {
      const src = $(el).attr("src") ?? "";
      const alt = ($(el).attr("alt") ?? "").trim();
      const mapped = opts.rewriteImage ? opts.rewriteImage(src, alt) : null;
      if (mapped) out.push({ type: "image", attrs: { src: mapped.src, alt: mapped.alt, mediaId: mapped.mediaId ?? null } });
    } else if (tag === "table") {
      const rows: TableRowNode[] = [];
      $(el)
        .find("tr")
        .each((_, tr) => {
          const cells = $(tr)
            .children("td,th")
            .toArray()
            .map((cell) => ({
              type: (cell.tagName.toLowerCase() === "th" ? "tableHeader" : "tableCell") as "tableHeader" | "tableCell",
              content: (() => {
                const b = blocksFrom($, cell.children as AnyNode[], opts);
                return b.length ? b : [{ type: "paragraph" as const }];
              })(),
            }));
          if (cells.length) rows.push({ type: "tableRow", content: cells });
        });
      if (rows.length) out.push({ type: "table", content: rows });
    } else {
      // div / section / figure / li-like wrappers: descend
      out.push(...blocksFrom($, children, opts));
    }
  }
  flush();
  return out;
}

export function htmlToDoc(html: string, opts: FromHtmlOptions = {}): RichDoc {
  const $ = cheerio.load(`<body>${html}</body>`);
  const body = $("body").get(0);
  const content = body ? blocksFrom($, body.children as AnyNode[], opts) : [];
  return { type: "doc", content };
}

/** Convert a list of cheerio elements (already selected) into a document. */
export function elementsToDoc($: cheerio.CheerioAPI, elements: AnyNode[], opts: FromHtmlOptions = {}): RichDoc {
  return { type: "doc", content: blocksFrom($, elements, opts) };
}
