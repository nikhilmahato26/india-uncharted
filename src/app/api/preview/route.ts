import { draftMode } from "next/headers";
import { redirect } from "next/navigation";
import type { NextRequest } from "next/server";
import { getSession } from "@/lib/auth/session";

/**
 * Turns on Draft Mode for a signed-in editor and sends them to the real page,
 * where unpublished content renders exactly as it will once published.
 * /api/preview?path=/destinations/khichan
 */
export async function GET(request: NextRequest) {
  const user = await getSession();
  if (!user) redirect(`/admin/login?next=${encodeURIComponent(request.nextUrl.pathname + request.nextUrl.search)}`);

  const raw = request.nextUrl.searchParams.get("path") ?? "/";
  // Only ever preview our own pages.
  const path = raw.startsWith("/") && !raw.startsWith("//") ? raw : "/";

  (await draftMode()).enable();
  redirect(path);
}
