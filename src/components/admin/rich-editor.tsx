"use client";

import { useEditor, EditorContent, useEditorState, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";
import { useState, type ReactNode } from "react";
import { Bold, Italic, Link2, List, ListOrdered, Minus, Quote, Redo2, Undo2 } from "lucide-react";
import { cn } from "@/lib/cn";

/**
 * The content editor. H1 is deliberately absent: the page's own title is the
 * H1, and a second one weakens it. The outline below the toolbar shows the
 * heading structure and warns when a level is skipped.
 */
export function RichEditor({ name, initial, label }: { name: string; initial: unknown; label: string }) {
  const [json, setJson] = useState<string>(() => (initial ? JSON.stringify(initial) : ""));

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        heading: { levels: [2, 3, 4] },
        link: false,
      }),
      Link.configure({ openOnClick: false, autolink: true, protocols: ["http", "https", "mailto", "tel"] }),
    ],
    content: (initial as object) ?? "",
    editorProps: {
      attributes: {
        class: "prose-folio min-h-64 max-w-none px-4 py-4 focus:outline-none",
        "aria-label": label,
      },
    },
    onUpdate: ({ editor }) => setJson(JSON.stringify(editor.getJSON())),
  });

  if (!editor) return <div className="min-h-64 border border-ink/25 bg-paper" aria-busy="true" />;

  return (
    <div>
      <input type="hidden" name={name} value={json} />
      <div className="border border-ink/25 bg-paper">
        <Toolbar editor={editor} />
        <EditorContent editor={editor} />
      </div>
      <Outline editor={editor} />
    </div>
  );
}

/** The heading structure, so an editor can see the shape of the page they are writing. */
function Outline({ editor }: { editor: Editor }) {
  const outline = useEditorState({
    editor,
    selector: ({ editor }) => {
      const out: { level: number; text: string }[] = [];
      editor.state.doc.descendants((node) => {
        if (node.type.name === "heading") out.push({ level: node.attrs.level as number, text: node.textContent });
      });
      return out;
    },
  });
  const skipped = outline.some((h, i) => i > 0 && h.level - outline[i - 1]!.level > 1);

  return (
    <>
      {outline.length ? (
        <details className="mt-2 text-caption text-ink-3">
          <summary className="cursor-pointer">Heading outline ({outline.length})</summary>
          <ul className="mt-2 space-y-0.5">
            {outline.map((h, i) => (
              <li key={i} style={{ paddingLeft: `${(h.level - 2) * 12}px` }}>
                <span className="text-ink-3">H{h.level}</span> <span className="text-ink-2">{h.text || "(empty)"}</span>
              </li>
            ))}
          </ul>
          {skipped ? <p className="mt-2 text-warning">A heading level is skipped. Go H2 → H3 → H4 so the structure reads in order.</p> : null}
        </details>
      ) : null}
    </>
  );
}

function Btn({ onClick, active, label, children, disabled }: { onClick: () => void; active?: boolean; label: string; children: ReactNode; disabled?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      aria-pressed={active}
      title={label}
      className={cn(
        "flex size-9 items-center justify-center border border-transparent text-small text-ink-2 transition-colors hover:bg-paper-3/70 disabled:opacity-30",
        active && "border-ink/20 bg-paper-3 text-ink",
      )}
    >
      {children}
    </button>
  );
}

function Toolbar({ editor }: { editor: Editor }) {
  const state = useEditorState({
    editor,
    selector: ({ editor }) => ({
      h2: editor.isActive("heading", { level: 2 }),
      h3: editor.isActive("heading", { level: 3 }),
      h4: editor.isActive("heading", { level: 4 }),
      bold: editor.isActive("bold"),
      italic: editor.isActive("italic"),
      link: editor.isActive("link"),
      bulletList: editor.isActive("bulletList"),
      orderedList: editor.isActive("orderedList"),
      blockquote: editor.isActive("blockquote"),
      canUndo: editor.can().undo(),
      canRedo: editor.can().redo(),
    }),
  });

  return (
    <div className="flex flex-wrap items-center gap-0.5 border-b border-rule bg-paper-2 px-2 py-1.5">
      {[2, 3, 4].map((level) => (
        <Btn
          key={level}
          label={`Heading ${level}`}
          active={state[`h${level}` as "h2" | "h3" | "h4"]}
          onClick={() => editor.chain().focus().toggleHeading({ level: level as 2 | 3 | 4 }).run()}
        >
          <span className="font-display text-body">H{level}</span>
        </Btn>
      ))}
      <span aria-hidden="true" className="mx-1 h-6 w-px bg-rule" />
      <Btn label="Bold" active={state.bold} onClick={() => editor.chain().focus().toggleBold().run()}>
        <Bold className="size-4" strokeWidth={2} />
      </Btn>
      <Btn label="Italic" active={state.italic} onClick={() => editor.chain().focus().toggleItalic().run()}>
        <Italic className="size-4" strokeWidth={2} />
      </Btn>
      <Btn
        label="Link"
        active={state.link}
        onClick={() => {
          const previous = editor.getAttributes("link").href as string | undefined;
          const url = window.prompt("Link to (a path like /destinations/jaipur, or a full address)", previous ?? "");
          if (url === null) return;
          if (url === "") editor.chain().focus().extendMarkRange("link").unsetLink().run();
          else editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
        }}
      >
        <Link2 className="size-4" strokeWidth={2} />
      </Btn>
      <span aria-hidden="true" className="mx-1 h-6 w-px bg-rule" />
      <Btn label="Bulleted list" active={state.bulletList} onClick={() => editor.chain().focus().toggleBulletList().run()}>
        <List className="size-4" strokeWidth={2} />
      </Btn>
      <Btn label="Numbered list" active={state.orderedList} onClick={() => editor.chain().focus().toggleOrderedList().run()}>
        <ListOrdered className="size-4" strokeWidth={2} />
      </Btn>
      <Btn label="Quote" active={state.blockquote} onClick={() => editor.chain().focus().toggleBlockquote().run()}>
        <Quote className="size-4" strokeWidth={2} />
      </Btn>
      <Btn label="Divider" onClick={() => editor.chain().focus().setHorizontalRule().run()}>
        <Minus className="size-4" strokeWidth={2} />
      </Btn>
      <span aria-hidden="true" className="mx-1 h-6 w-px bg-rule" />
      <Btn label="Undo" disabled={!state.canUndo} onClick={() => editor.chain().focus().undo().run()}>
        <Undo2 className="size-4" strokeWidth={2} />
      </Btn>
      <Btn label="Redo" disabled={!state.canRedo} onClick={() => editor.chain().focus().redo().run()}>
        <Redo2 className="size-4" strokeWidth={2} />
      </Btn>
    </div>
  );
}
