import Link from "next/link";
import Image from "next/image";
import type { ReactNode } from "react";
import type { BlockNode, InlineNode, Mark, RichDoc } from "@/lib/richtext/types";
import { isRichDoc } from "@/lib/richtext/types";
import { docOutline, headingSlug } from "@/lib/richtext/text";
import { cn } from "@/lib/cn";

/**
 * Tiptap JSON → React. An allowlist, rendered as real elements: no
 * dangerouslySetInnerHTML anywhere, so stored content can never inject markup.
 * Headings get the same ids as the table of contents.
 */

function renderMarks(node: InlineNode, key: number): ReactNode {
  if (node.type === "hardBreak") return <br key={key} />;
  let out: ReactNode = node.text;
  for (const mark of node.marks ?? []) {
    out = applyMark(mark, out, key);
  }
  return <span key={key}>{out}</span>;
}

function applyMark(mark: Mark, child: ReactNode, key: number): ReactNode {
  switch (mark.type) {
    case "bold":
      return <strong key={key}>{child}</strong>;
    case "italic":
      return <em key={key}>{child}</em>;
    case "underline":
      return <u key={key}>{child}</u>;
    case "link": {
      const href = mark.attrs.href;
      const external = /^https?:\/\//i.test(href);
      return external ? (
        <a key={key} href={href} target="_blank" rel="noopener noreferrer">
          {child}
        </a>
      ) : (
        <Link key={key} href={href}>
          {child}
        </Link>
      );
    }
    default:
      return child;
  }
}

function inline(nodes: InlineNode[] | undefined): ReactNode {
  return (nodes ?? []).map((n, i) => renderMarks(n, i));
}

function block(node: BlockNode, key: number, headingIds: Map<string, string>): ReactNode {
  switch (node.type) {
    case "paragraph":
      return <p key={key}>{inline(node.content)}</p>;
    case "heading": {
      const text = (node.content ?? []).map((n) => (n.type === "text" ? n.text : "")).join("");
      const id = headingIds.get(text);
      const Tag = `h${node.attrs.level}` as "h2" | "h3" | "h4" | "h5" | "h6";
      return (
        <Tag key={key} id={id}>
          {inline(node.content)}
        </Tag>
      );
    }
    case "bulletList":
      return (
        <ul key={key}>
          {node.content.map((li, i) => (
            <li key={i}>{li.content.map((b, j) => block(b, j, headingIds))}</li>
          ))}
        </ul>
      );
    case "orderedList":
      return (
        <ol key={key} start={node.attrs?.start}>
          {node.content.map((li, i) => (
            <li key={i}>{li.content.map((b, j) => block(b, j, headingIds))}</li>
          ))}
        </ol>
      );
    case "blockquote":
      return <blockquote key={key}>{node.content.map((b, i) => block(b, i, headingIds))}</blockquote>;
    case "horizontalRule":
      return <hr key={key} />;
    case "image":
      return (
        <figure key={key} className="not-prose my-8">
          <div className="folio [--band:var(--color-paper-3)] [--rule:var(--color-gold-500)]">
            <div className="relative aspect-3/2 overflow-hidden bg-paper-3">
              <Image src={node.attrs.src} alt={node.attrs.alt} fill sizes="(max-width: 768px) 92vw, 44rem" className="object-cover" />
            </div>
          </div>
          {node.attrs.caption ? <figcaption>{node.attrs.caption}</figcaption> : null}
        </figure>
      );
    case "table":
      return (
        <div key={key} className="overflow-x-auto" tabIndex={0} role="region" aria-label="Table">
          <table>
            <tbody>
              {node.content.map((row, i) => (
                <tr key={i}>
                  {row.content.map((cell, j) =>
                    cell.type === "tableHeader" ? (
                      <th key={j} scope="col">
                        {cell.content.map((b, k) => block(b, k, headingIds))}
                      </th>
                    ) : (
                      <td key={j}>{cell.content.map((b, k) => block(b, k, headingIds))}</td>
                    ),
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    case "callout":
      return (
        <aside key={key} className="not-prose my-6 border-t border-b border-rule bg-paper-2 px-5 py-4">
          {node.content.map((b, i) => block(b, i, headingIds))}
        </aside>
      );
    default:
      return null;
  }
}

export function RichText({ doc, className }: { doc: unknown; className?: string }) {
  if (!isRichDoc(doc) || !doc.content.length) return null;
  const outline = docOutline(doc);
  const headingIds = new Map<string, string>();
  for (const h of outline) if (!headingIds.has(h.text)) headingIds.set(h.text, h.id);
  return <div className={cn("prose-folio", className)}>{(doc as RichDoc).content.map((n, i) => block(n, i, headingIds))}</div>;
}

export { headingSlug };
