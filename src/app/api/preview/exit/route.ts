import { draftMode } from "next/headers";
import { redirect } from "next/navigation";
import type { NextRequest } from "next/server";

/** Leaves Draft Mode and returns to the published version of the page. */
export async function GET(request: NextRequest) {
  (await draftMode()).disable();
  const raw = request.nextUrl.searchParams.get("path") ?? "/";
  redirect(raw.startsWith("/") && !raw.startsWith("//") ? raw : "/");
}
