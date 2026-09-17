import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE, verifySessionToken } from "@/lib/auth/jwt";
import { normalizePath } from "@/lib/redirects";
import { getRedirectMap, recordRedirectHit } from "@/lib/redirect-store";

/**
 * 1. Admin gate — an optimistic check only. Every admin page and server action
 *    re-verifies the session against the database (lib/auth/session.ts).
 * 2. Redirects — resolved from the Redirect table with exact status codes,
 *    so migrated WordPress URLs keep their search equity.
 */
export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname.startsWith("/admin") && !pathname.startsWith("/admin/login")) {
    const claims = await verifySessionToken(request.cookies.get(SESSION_COOKIE)?.value);
    if (!claims) {
      const login = new URL("/admin/login", request.url);
      if (pathname !== "/admin") login.searchParams.set("next", pathname);
      return NextResponse.redirect(login);
    }
    return NextResponse.next();
  }

  if (pathname.startsWith("/preview")) {
    const claims = await verifySessionToken(request.cookies.get(SESSION_COOKIE)?.value);
    if (!claims) return NextResponse.redirect(new URL("/admin/login", request.url));
    return NextResponse.next();
  }

  const map = await getRedirectMap();
  if (map.size > 0) {
    const hit = map.get(normalizePath(pathname));
    if (hit) {
      recordRedirectHit(hit.id);
      if (hit.statusCode === 410 || !hit.toPath) {
        // Returned from here rather than rewritten to /gone: a rewrite serves the
        // target page's own 200, and a retired URL has to answer 410 to be
        // dropped from the index.
        return new NextResponse(gonePage(), { status: 410, headers: { "content-type": "text/html; charset=utf-8", "x-robots-tag": "noindex" } });
      }
      const target = new URL(hit.toPath, request.url);
      if (target.toString() !== request.nextUrl.toString()) {
        return NextResponse.redirect(target, hit.statusCode);
      }
    }
  }

  // next.config sets skipTrailingSlashRedirect so a migrated URL like
  // "/about-us/" reaches the Redirect table in one hop. Anything that gets
  // here still wearing a trailing slash is normalised now.
  if (pathname.length > 1 && pathname.endsWith("/")) {
    // Built from request.url, not nextUrl.clone(): cloning re-applies Next's own
    // trailing-slash normalisation and the redirect would point at itself.
    const url = new URL(`${pathname.replace(/\/+$/, "")}${request.nextUrl.search}`, request.url);
    return NextResponse.redirect(url, 308);
  }

  // The path travels with the request so a 404 can log which address was asked for.
  const headers = new Headers(request.headers);
  headers.set("x-pathname", pathname);
  return NextResponse.next({ request: { headers } });
}


/** Self-contained so it never depends on the app rendering. Same palette as the site. */
function gonePage() {
  return `<!doctype html>
<html lang="en-IN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex,follow"><title>Page removed | India Uncharted</title>
<style>
  :root { color-scheme: light }
  body { margin:0; background:#f4eddf; color:#221b15; font:17px/1.6 ui-sans-serif,system-ui,sans-serif; display:grid; min-height:100dvh; place-items:center; padding:2rem }
  main { max-width:34rem }
  .band { height:10px; background:#a5432a; background-image:radial-gradient(circle,#d9bc78 1.1px,transparent 1.6px); background-size:9px 9px; position:fixed; inset:0 0 auto }
  h1 { font:500 clamp(2rem,6vw,3rem)/1.05 Georgia,serif; margin:0 0 1rem }
  p { color:#4b4036; margin:0 0 1.75rem }
  a { display:inline-block; margin-right:.75rem; padding:.85rem 1.5rem; border:1px solid #221b15; color:#221b15; text-decoration:none; font-weight:600; font-size:.94rem }
  a.primary { background:#a5432a; border-color:#a5432a; color:#f4eddf }
</style></head>
<body><div class="band"></div><main>
  <h1>This page has been retired.</h1>
  <p>It is not coming back, but the journeys and destinations it covered are still here.</p>
  <a class="primary" href="/">India Uncharted</a><a href="/destinations">Destinations</a><a href="/journeys">Journeys</a>
</main></body></html>`;
}

export const config = {
  matcher: [
    // Everything except Next internals, API routes and files with an extension.
    "/((?!_next/|api/|media/|favicon.ico|robots.txt|sitemap.xml|sitemaps/|.*\\.[a-zA-Z0-9]{2,5}$).*)",
  ],
};
