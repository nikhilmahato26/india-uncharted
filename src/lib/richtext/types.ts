/**
 * Rich text is stored as a Tiptap (ProseMirror) JSON document and rendered on
 * the server through an allowlist (render.tsx). Nothing else is ever emitted,
 * so stored content can't inject markup.
 */

export type Mark =
  | { type: "bold" }
  | { type: "italic" }
  | { type: "underline" }
  | { type: "link"; attrs: { href: string; target?: string | null; entityType?: string | null; entityId?: string | null } };

export type TextNode = { type: "text"; text: string; marks?: Mark[] };
export type HardBreakNode = { type: "hardBreak" };
export type InlineNode = TextNode | HardBreakNode;

export type ParagraphNode = { type: "paragraph"; content?: InlineNode[] };
export type HeadingNode = { type: "heading"; attrs: { level: 2 | 3 | 4 | 5 | 6 }; content?: InlineNode[] };
export type ListItemNode = { type: "listItem"; content: BlockNode[] };
export type BulletListNode = { type: "bulletList"; content: ListItemNode[] };
export type OrderedListNode = { type: "orderedList"; attrs?: { start?: number }; content: ListItemNode[] };
export type BlockquoteNode = { type: "blockquote"; content: BlockNode[] };
export type HorizontalRuleNode = { type: "horizontalRule" };
export type ImageNode = {
  type: "image";
  attrs: { src: string; alt: string; title?: string | null; mediaId?: string | null; caption?: string | null };
};
export type TableCellNode = { type: "tableCell" | "tableHeader"; content: BlockNode[] };
export type TableRowNode = { type: "tableRow"; content: TableCellNode[] };
export type TableNode = { type: "table"; content: TableRowNode[] };
export type CalloutNode = { type: "callout"; attrs: { tone: "note" | "tip" | "warning" }; content: BlockNode[] };

export type BlockNode =
  | ParagraphNode
  | HeadingNode
  | BulletListNode
  | OrderedListNode
  | BlockquoteNode
  | HorizontalRuleNode
  | ImageNode
  | TableNode
  | CalloutNode;

export type RichDoc = { type: "doc"; content: BlockNode[] };

export function isRichDoc(value: unknown): value is RichDoc {
  return (
    typeof value === "object" &&
    value !== null &&
    (value as { type?: unknown }).type === "doc" &&
    Array.isArray((value as { content?: unknown }).content)
  );
}

export function emptyDoc(): RichDoc {
  return { type: "doc", content: [] };
}

export function paragraphDoc(text: string): RichDoc {
  const paras = text
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean);
  return {
    type: "doc",
    content: paras.map((p) => ({ type: "paragraph", content: [{ type: "text", text: p }] })),
  };
}
