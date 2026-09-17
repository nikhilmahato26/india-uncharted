"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import Script from "next/script";
import { usePathname } from "next/navigation";
import {
  CONSENT_EVENT,
  OPEN_SETTINGS_EVENT,
  consentCookie,
  isTrackerCookie,
  parseConsent,
  trackerNames,
  type AnalyticsConfig,
  type Consent,
} from "@/lib/analytics";

/**
 * Loads analytics only with the visitor's say-so. Until they choose, nothing is
 * requested from Google or Meta. Declining is one click, same as accepting, and
 * a browser sending Global Privacy Control is treated as having declined.
 */

type State = Consent | "none" | "server";

function subscribe(onChange: () => void) {
  window.addEventListener(CONSENT_EVENT, onChange);
  return () => window.removeEventListener(CONSENT_EVENT, onChange);
}

function readState(): State {
  if ((navigator as Navigator & { globalPrivacyControl?: boolean }).globalPrivacyControl) return "denied";
  return parseConsent(document.cookie) ?? "none";
}

function clearTrackerCookies() {
  const host = location.hostname;
  const parent = host.split(".").slice(-2).join(".");
  for (const part of document.cookie.split(";")) {
    const name = part.trim().split("=")[0];
    if (!name || !isTrackerCookie(name)) continue;
    for (const domain of ["", `; Domain=${host}`, `; Domain=.${parent}`]) {
      document.cookie = `${name}=; Max-Age=0; Path=/${domain}`;
    }
  }
}

export function ConsentManager({ config, cookiePolicyHref }: { config: AnalyticsConfig; cookiePolicyHref: string | null }) {
  const stored = useSyncExternalStore(subscribe, readState, () => "server" as const);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const show = () => setOpen(true);
    window.addEventListener(OPEN_SETTINGS_EVENT, show);
    return () => window.removeEventListener(OPEN_SETTINGS_EVENT, show);
  }, []);

  const granted = !config.consentRequired || stored === "granted";
  const asking = config.consentRequired && (stored === "none" || open);

  function choose(choice: Consent) {
    const wasGranted = stored === "granted";
    document.cookie = consentCookie(choice, location.protocol === "https:");
    setOpen(false);
    if (wasGranted && choice === "denied") {
      // Scripts already running can't be unloaded; clear what they stored and start clean.
      clearTrackerCookies();
      location.reload();
      return;
    }
    window.dispatchEvent(new Event(CONSENT_EVENT));
  }

  return (
    <>
      {granted && stored !== "server" ? <Trackers config={config} /> : null}
      {asking && stored !== "server" ? (
        <section
          aria-label="Cookie choices"
          className="fixed inset-x-3 bottom-3 z-toast border border-rule bg-paper p-5 text-ink shadow-(--shadow-float) sm:right-auto sm:bottom-5 sm:left-5 sm:max-w-md"
        >
          <p className="font-display text-title">Cookies, briefly</p>
          <p className="mt-2 text-small text-ink-2">
            We&rsquo;d like to use {trackerNames(config).join(" and ")} to see how people find and use this site. Nothing is loaded unless you agree, and you can change your
            mind from the link in the footer.
            {cookiePolicyHref ? (
              <>
                {" "}
                <Link href={cookiePolicyHref} className="underline underline-offset-4 hover:text-ink">
                  Cookie policy
                </Link>
              </>
            ) : null}
          </p>
          <div className="mt-4 grid grid-cols-2 gap-3">
            <button type="button" onClick={() => choose("denied")} className="min-h-11 border border-ink/40 px-4 text-small font-semibold text-ink hover:border-ink">
              Decline
            </button>
            <button type="button" onClick={() => choose("granted")} className="min-h-11 border border-ink/40 px-4 text-small font-semibold text-ink hover:border-ink">
              Accept
            </button>
          </div>
        </section>
      ) : null}
    </>
  );
}

/** IDs are format-checked when saved (G-…, GTM-…, digits), and JSON-encoded here regardless. */
function Trackers({ config }: { config: AnalyticsConfig }) {
  const pathname = usePathname();
  // The page this component mounted on is counted by the Pixel's own init script.
  // Keyed on the path rather than on "first run", so an effect that runs twice or a
  // remount after accepting can never count the same page again.
  const lastCounted = useRef(pathname);

  useEffect(() => {
    if (pathname === lastCounted.current) return;
    lastCounted.current = pathname;
    const fbq = (window as Window & { fbq?: (...args: unknown[]) => void }).fbq;
    if (config.metaPixelId && fbq) fbq("track", "PageView");
  }, [pathname, config.metaPixelId]);

  return (
    <>
      {config.ga4Id ? (
        <>
          <Script id="ga4-src" src={`https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(config.ga4Id)}`} strategy="afterInteractive" />
          <Script id="ga4-init" strategy="afterInteractive">
            {`window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config',${JSON.stringify(config.ga4Id)});`}
          </Script>
        </>
      ) : null}
      {config.gtmId ? (
        <Script id="gtm-init" strategy="afterInteractive">
          {`(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src='https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);})(window,document,'script','dataLayer',${JSON.stringify(config.gtmId)});`}
        </Script>
      ) : null}
      {config.metaPixelId ? (
        <Script id="meta-pixel" strategy="afterInteractive">
          {`!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');fbq('init',${JSON.stringify(config.metaPixelId)});fbq('track','PageView');`}
        </Script>
      ) : null}
    </>
  );
}
