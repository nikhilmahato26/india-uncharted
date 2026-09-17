"use client";

import { OPEN_SETTINGS_EVENT } from "@/lib/analytics";

/** Reopens the cookie choice. Withdrawing consent has to be as easy as giving it. */
export function CookieSettingsButton({ className }: { className?: string }) {
  return (
    <button type="button" onClick={() => window.dispatchEvent(new Event(OPEN_SETTINGS_EVENT))} className={className}>
      Cookie settings
    </button>
  );
}
