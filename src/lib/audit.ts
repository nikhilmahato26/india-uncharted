import "server-only";
import { db } from "@/lib/db";
import type { Prisma } from "@/generated/prisma/client";

/** Every mutation writes one line here: who, what, when, and the fields that changed. */
export async function recordAudit(entry: {
  userId?: string | null;
  action: string;
  entityType: string;
  entityId?: string | null;
  label?: string | null;
  diff?: Record<string, { from: unknown; to: unknown }> | null;
}) {
  try {
    await db.auditLog.create({
      data: {
        userId: entry.userId ?? null,
        action: entry.action,
        entityType: entry.entityType,
        entityId: entry.entityId ?? null,
        label: entry.label ?? null,
        diff: (entry.diff as Prisma.InputJsonValue | undefined) ?? undefined,
      },
    });
  } catch (err) {
    console.error("audit write failed", err);
  }
}

const IGNORED = new Set(["updatedAt", "createdAt", "id"]);

/** Field-level diff for the activity log; long values are summarised, not stored whole. */
export function diffFields(before: Record<string, unknown>, after: Record<string, unknown>) {
  const diff: Record<string, { from: unknown; to: unknown }> = {};
  for (const key of new Set([...Object.keys(before), ...Object.keys(after)])) {
    if (IGNORED.has(key)) continue;
    const from = before[key];
    const to = after[key];
    if (JSON.stringify(from) === JSON.stringify(to)) continue;
    diff[key] = { from: summarise(from), to: summarise(to) };
  }
  return Object.keys(diff).length ? diff : null;
}

function summarise(value: unknown): unknown {
  if (typeof value === "string" && value.length > 160) return `${value.slice(0, 157)}…`;
  if (value && typeof value === "object") {
    const json = JSON.stringify(value);
    if (json.length > 200) return `${json.slice(0, 197)}…`;
  }
  return value;
}
