"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { X } from "lucide-react";
import { buttonClasses } from "@/components/ui/button";
import { EnquiryForm, type EnquiryContext } from "./enquiry-form";
import { cn } from "@/lib/cn";

/**
 * Native <dialog>: focus trap, Escape and the top layer come from the platform.
 * The trigger is a real button, and the form inside already knows the journey
 * the traveller was reading.
 */
export function EnquiryDialog({
  label,
  context,
  variant = "primary",
  size = "lg",
  className,
  title,
}: {
  label: string;
  context?: EnquiryContext;
  variant?: "primary" | "secondary" | "on-dark" | "on-dark-solid" | "ghost";
  size?: "sm" | "md" | "lg";
  className?: string;
  title?: string;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const [open, setOpen] = useState(false);

  const close = useCallback(() => {
    ref.current?.close();
    setOpen(false);
  }, []);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    const onClose = () => setOpen(false);
    dialog.addEventListener("close", onClose);
    return () => dialog.removeEventListener("close", onClose);
  }, []);

  useEffect(() => {
    document.documentElement.style.overflow = open ? "hidden" : "";
    return () => {
      document.documentElement.style.overflow = "";
    };
  }, [open]);

  return (
    <>
      <button
        type="button"
        onClick={() => {
          ref.current?.showModal();
          setOpen(true);
        }}
        className={buttonClasses({ variant, size, className })}
      >
        <span>{label}</span>
      </button>

      <dialog
        ref={ref}
        aria-labelledby="enquiry-dialog-title"
        onClick={(e) => {
          if (e.target === ref.current) close();
        }}
        className={cn(
          "m-0 max-h-dvh w-full max-w-none bg-transparent p-0 backdrop:bg-ink/70 sm:max-h-[92dvh] sm:max-w-2xl",
          "sm:top-1/2 sm:left-1/2 sm:-translate-x-1/2 sm:-translate-y-1/2",
          "open:flex open:flex-col",
        )}
      >
        <div className="flex max-h-dvh w-full flex-col overflow-hidden bg-paper sm:max-h-[92dvh]">
          <div aria-hidden="true" className="pearl-band h-1.5 shrink-0" />
          <div className="flex items-start justify-between gap-6 border-b border-rule px-6 py-5">
            <div>
              <h2 id="enquiry-dialog-title" className="font-display text-title text-ink">
                {title ?? "Plan this journey"}
              </h2>
              <p className="mt-1 text-caption text-ink-3">Tell us the essentials — we’ll come back with a first outline.</p>
            </div>
            <button type="button" onClick={close} aria-label="Close" className="-mt-1 -mr-2 flex size-11 shrink-0 items-center justify-center text-ink-2 hover:text-ink">
              <X className="size-5" strokeWidth={1.5} />
            </button>
          </div>
          <div className="overflow-y-auto px-6 py-6 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
            <EnquiryForm context={context} compact />
          </div>
        </div>
      </dialog>
    </>
  );
}
