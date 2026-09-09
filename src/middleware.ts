import { type NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { SUPABASE_ANON_KEY, SUPABASE_URL, isSupabaseConfigured } from "@/lib/supabase/env";
import { CUSTOMER_SESSION_COOKIE } from "@/lib/customer/constants";

const DEV_BYPASS =
  process.env.ADMIN_DEV_BYPASS === "true" && process.env.NODE_ENV !== "production";

function isProtectedAdminPath(pathname: string) {
  return pathname.startsWith("/admin") && !pathname.startsWith("/admin/login");
}

function isProtectedAccountPath(pathname: string) {
  return (
    pathname.startsWith("/account") &&
    !pathname.startsWith("/account/login") &&
    !pathname.startsWith("/account/register")
  );
}

function accountLoginRedirect(request: NextRequest) {
  const url = request.nextUrl.clone();
  const redirectTarget = url.pathname + url.search;
  url.pathname = "/account/login";
  url.search = `?redirect=${encodeURIComponent(redirectTarget)}`;
  return NextResponse.redirect(url);
}

/**
 * 1. Refreshes the Supabase auth session on every request.
 * 2. First-line guard for /admin and /account: an unauthenticated request is
 *    bounced to the matching sign-in page before any protected page renders.
 *    The definitive check still runs server-side — `requireStaff()` for
 *    /admin, `requireCustomer()` for /account — this is only the fast path
 *    that avoids rendering a page a redirect would immediately replace.
 */
export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (!isSupabaseConfigured) {
    if (isProtectedAdminPath(pathname) && !DEV_BYPASS) {
      const url = request.nextUrl.clone();
      url.pathname = "/admin/login";
      url.search = "";
      return NextResponse.redirect(url);
    }
    // Local-mode customer sessions are a signed cookie, not a Supabase
    // session — middleware runs on the Edge runtime and can't verify the
    // signature (no `node:crypto`), so this only checks presence. A forged
    // or expired cookie still gets caught by `requireCustomer()` server-side.
    if (isProtectedAccountPath(pathname) && !request.cookies.get(CUSTOMER_SESSION_COOKIE)) {
      return accountLoginRedirect(request);
    }
    return NextResponse.next();
  }

  let response = NextResponse.next({ request });

  const supabase = createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) =>
          request.cookies.set(name, value),
        );
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options),
        );
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (isProtectedAdminPath(pathname) && !user) {
    const url = request.nextUrl.clone();
    url.pathname = "/admin/login";
    url.search = "";
    return NextResponse.redirect(url);
  }

  if (isProtectedAccountPath(pathname) && !user) {
    return accountLoginRedirect(request);
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except static assets and image optimisation.
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
