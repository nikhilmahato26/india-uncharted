import type { Role } from "@/generated/prisma/enums";

/**
 * Every permission check goes through `can`. The UI hides what a role can't do,
 * but server actions call `can` again — hiding a button is not authorisation.
 */
export type Capability =
  | "content.edit"
  | "content.publish"
  | "content.delete"
  | "seo.entity"
  | "seo.jsonld"
  | "seo.global"
  | "seo.redirects"
  | "seo.head"
  | "media.upload"
  | "media.delete"
  | "enquiries.read"
  | "enquiries.manage"
  | "navigation.edit"
  | "settings.edit"
  | "notices.edit"
  | "users.manage"
  | "activity.read";

const MATRIX: Record<Capability, readonly Role[]> = {
  "content.edit": ["SUPER_ADMIN", "ADMIN", "EDITOR"],
  "content.publish": ["SUPER_ADMIN", "ADMIN"],
  "content.delete": ["SUPER_ADMIN", "ADMIN"],
  "seo.entity": ["SUPER_ADMIN", "ADMIN", "EDITOR"],
  "seo.jsonld": ["SUPER_ADMIN", "ADMIN"],
  "seo.global": ["SUPER_ADMIN", "ADMIN"],
  "seo.redirects": ["SUPER_ADMIN", "ADMIN"],
  "seo.head": ["SUPER_ADMIN"],
  "media.upload": ["SUPER_ADMIN", "ADMIN", "EDITOR"],
  "media.delete": ["SUPER_ADMIN", "ADMIN"],
  "enquiries.read": ["SUPER_ADMIN", "ADMIN", "EDITOR"],
  "enquiries.manage": ["SUPER_ADMIN", "ADMIN"],
  "navigation.edit": ["SUPER_ADMIN", "ADMIN"],
  "settings.edit": ["SUPER_ADMIN", "ADMIN"],
  "notices.edit": ["SUPER_ADMIN", "ADMIN"],
  "users.manage": ["SUPER_ADMIN"],
  "activity.read": ["SUPER_ADMIN", "ADMIN"],
};

export function can(role: Role | null | undefined, capability: Capability): boolean {
  if (!role) return false;
  return MATRIX[capability].includes(role);
}

export const ROLE_LABELS: Record<Role, string> = {
  SUPER_ADMIN: "Super admin",
  ADMIN: "Admin",
  EDITOR: "Editor",
};
