import type { Capability } from "@/lib/auth/rbac";

/** One definition of the admin menu, used by the sidebar and the mobile drawer. */
export type AdminNavItem = { label: string; href: string; icon: string; capability?: Capability; exact?: boolean };
export type AdminNavGroup = { heading: string; items: AdminNavItem[] };

export const ADMIN_NAV: AdminNavGroup[] = [
  {
    heading: "Overview",
    items: [
      { label: "Dashboard", href: "/admin", icon: "gauge", exact: true },
      { label: "Enquiries", href: "/admin/enquiries", icon: "inbox", capability: "enquiries.read" },
    ],
  },
  {
    heading: "Content",
    items: [
      { label: "Homepage", href: "/admin/homepage", icon: "house" },
      { label: "Destinations", href: "/admin/destinations", icon: "map-pin" },
      { label: "Regions", href: "/admin/regions", icon: "map" },
      { label: "Journeys", href: "/admin/journeys", icon: "route" },
      { label: "Experiences", href: "/admin/experiences", icon: "footprints" },
      { label: "Travel guide", href: "/admin/articles", icon: "newspaper" },
      { label: "Services", href: "/admin/services", icon: "car-front" },
      { label: "Pages", href: "/admin/pages", icon: "file-text" },
      { label: "FAQs", href: "/admin/faqs", icon: "message-circle-question" },
      { label: "Guest stories", href: "/admin/testimonials", icon: "quote" },
      { label: "Media", href: "/admin/media", icon: "image" },
    ],
  },
  {
    heading: "SEO",
    items: [
      { label: "SEO manager", href: "/admin/seo", icon: "search", capability: "seo.global", exact: true },
      { label: "Health report", href: "/admin/seo/health", icon: "stethoscope", capability: "seo.global" },
      { label: "Keywords", href: "/admin/seo/keywords", icon: "tags", capability: "seo.global" },
      { label: "Redirects", href: "/admin/seo/redirects", icon: "arrow-right-left", capability: "seo.redirects" },
    ],
  },
  {
    heading: "Site",
    items: [
      { label: "Settings", href: "/admin/settings", icon: "settings", capability: "settings.edit" },
      { label: "Seasonal notices", href: "/admin/notices", icon: "cloud-rain", capability: "notices.edit" },
      { label: "Activity", href: "/admin/activity", icon: "history", capability: "activity.read" },
      { label: "Users", href: "/admin/users", icon: "users", capability: "users.manage" },
    ],
  },
];
