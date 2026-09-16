import "server-only";
import { draftMode } from "next/headers";
import type { ContentStatus } from "@/generated/prisma/enums";

/**
 * Public reads show PUBLISHED only. In Draft Mode (an editor previewing),
 * drafts are included too — archived content never is.
 * Safe inside `use cache`: Next re-executes cached scopes in Draft Mode.
 */
export async function visibleStatuses(): Promise<{ in: ContentStatus[] }> {
  const { isEnabled } = await draftMode();
  return { in: isEnabled ? ["PUBLISHED", "DRAFT"] : ["PUBLISHED"] };
}

export async function isPreview(): Promise<boolean> {
  return (await draftMode()).isEnabled;
}
