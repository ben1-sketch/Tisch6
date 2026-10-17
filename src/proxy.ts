import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { defaultLocale, locales } from "@/i18n/config";
import { isSupabaseConfigured, supabasePublishableKey, supabaseUrl } from "@/lib/supabase/env";

function pickLocale(request: NextRequest) {
  const header = request.headers.get("accept-language") ?? "";
  const preferred = header
    .split(",")
    .map((part) => part.split(";")[0].trim().slice(0, 2).toLowerCase());
  return preferred.find((l) => (locales as readonly string[]).includes(l)) ?? defaultLocale;
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Seiten ohne Sprachpräfix auf /de/... umleiten
  if (!pathname.startsWith("/api")) {
    const hasLocale = locales.some(
      (l) => pathname === `/${l}` || pathname.startsWith(`/${l}/`),
    );
    if (!hasLocale) {
      const url = request.nextUrl.clone();
      url.pathname = `/${pickLocale(request)}${pathname === "/" ? "" : pathname}`;
      return NextResponse.redirect(url);
    }
  }

  // Supabase-Session erneuern, damit Server-Code immer gültige Cookies sieht
  let response = NextResponse.next({ request });
  if (isSupabaseConfigured) {
    const supabase = createServerClient(
      supabaseUrl,
      supabasePublishableKey,
      {
        cookies: {
          getAll: () => request.cookies.getAll(),
          setAll: (cookiesToSet, headers) => {
            cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
            response = NextResponse.next({ request });
            cookiesToSet.forEach(({ name, value, options }) =>
              response.cookies.set(name, value, options),
            );
            Object.entries(headers).forEach(([key, value]) => response.headers.set(key, value));
          },
        },
      },
    );
    await supabase.auth.getUser();
  }
  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|icon.svg|robots.txt|sitemap.xml|.*\\.(?:png|jpg|jpeg|svg|webp|ico)$).*)"],
};
