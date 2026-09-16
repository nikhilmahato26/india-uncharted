import type { Metadata, Viewport } from "next";
import { Cormorant_Garamond, DM_Sans } from "next/font/google";
import { SITE_URL, SITE_INDEXABLE } from "@/lib/site";
import "./globals.css";

const cormorant = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  style: ["normal", "italic"],
  variable: "--font-cormorant",
  display: "swap",
});

const dmSans = DM_Sans({
  subsets: ["latin"],
  axes: ["opsz"],
  variable: "--font-dm-sans",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  applicationName: "India Uncharted",
  // Staging and local builds can never be indexed (SITE_INDEXABLE is production-only).
  robots: SITE_INDEXABLE ? undefined : { index: false, follow: false },
  formatDetection: { telephone: false, email: false, address: false },
};

export const viewport: Viewport = {
  themeColor: "#f4eddf",
  viewportFit: "cover",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-IN" className={`${cormorant.variable} ${dmSans.variable}`}>
      <body>
        <div hidden dangerouslySetInnerHTML={{ __html: `<!--\nTHESIS: Every place is a painted folio — a framed scene, a narrow border band, its story written in the margin; refuses full-bleed-photo-plus-floating-cards travel templates.
OWN-WORLD: Wasli ivory ground; malachite forest and Indian-red terracotta as whole page fields; lamp-black ink; gold only as hairline rules and pearl bands. Square nested frames: margin → band → gold rule → plate. Cormorant display, DM Sans text.
STORY: The traveller sees India plate by plate, reads each route as continuous narration, trusts the specifics, starts planning a private journey.
FIRST VIEWPORT: 100svh plate inside a paper margin and pearl-dotted terracotta band; inscription centred on the top band; paper cartouche lower-left holds the H1, one line of copy, Explore India and Plan My Journey; plate caption lower-right.
FORM: Rajasthani miniature folio — my top-ranked grounded direction (1 of 7); seed 9c2e9603.
FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance
        \n-->` }} />
        {children}
      </body>
    </html>
  );
}
