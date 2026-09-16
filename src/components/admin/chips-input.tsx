"use client";

import { useState, type KeyboardEvent } from "react";
import { X } from "lucide-react";

/**
 * Keyword chips. Enter or comma commits one; Backspace on an empty field
 * removes the last. Each chip posts as its own value under the same name.
 */
export function ChipsInput({ name, label, initial = [], help, placeholder }: { name: string; label: string; initial?: string[]; help?: string; placeholder?: string }) {
  const [values, setValues] = useState<string[]>(initial);
  const [draft, setDraft] = useState("");

  const add = (raw: string) => {
    const value = raw.trim().replace(/,$/, "");
    if (!value || values.includes(value) || values.length >= 20) return;
    setValues((v) => [...v, value]);
    setDraft("");
  };

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      add(draft);
    } else if (e.key === "Backspace" && !draft && values.length) {
      setValues((v) => v.slice(0, -1));
    }
  };

  return (
    <div>
      <label htmlFor={`${name}-input`} className="text-small font-semibold text-ink">
        {label}
      </label>
      {help ? <p className="mt-1 text-caption text-ink-3">{help}</p> : null}
      {values.map((v) => (
        <input key={v} type="hidden" name={name} value={v} />
      ))}
      <div className="mt-2 flex flex-wrap items-center gap-2 border border-ink/25 bg-paper p-2 focus-within:border-terracotta-600">
        {values.map((v) => (
          <span key={v} className="inline-flex items-center gap-1.5 border border-terracotta-600/40 bg-terracotta-50 py-1 pr-1 pl-2.5 text-caption text-terracotta-800">
            {v}
            <button type="button" onClick={() => setValues((all) => all.filter((x) => x !== v))} aria-label={`Remove ${v}`} className="flex size-5 items-center justify-center hover:text-terracotta-950">
              <X className="size-3.5" strokeWidth={2} />
            </button>
          </span>
        ))}
        <input
          id={`${name}-input`}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={onKeyDown}
          onBlur={() => add(draft)}
          placeholder={placeholder ?? "Type and press Enter"}
          className="min-h-9 min-w-40 flex-1 bg-transparent px-1 text-small text-ink focus:outline-none"
        />
      </div>
    </div>
  );
}
