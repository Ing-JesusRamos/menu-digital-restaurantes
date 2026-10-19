import { createServerClient } from "@supabase/ssr";
import type { User } from "@supabase/supabase-js";

function getSupabaseConfig() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) {
    throw new Error(
      "NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are required for Supabase Auth",
    );
  }

  return { url, key };
}

function getRequestCookies(request: Request) {
  const header = request.headers.get("cookie");
  if (!header) return [];

  return header
    .split(/;\s*/)
    .map((part) => {
      const separator = part.indexOf("=");
      if (separator < 0) return null;
      return {
        name: part.slice(0, separator),
        value: decodeURIComponent(part.slice(separator + 1)),
      };
    })
    .filter((cookie): cookie is { name: string; value: string } => cookie !== null);
}

function getBearerToken(request: Request) {
  const authorization = request.headers.get("authorization");
  if (!authorization) return undefined;

  const match = authorization.match(/^Bearer\s+(.+)$/i);
  return match?.[1];
}

/**
 * Resolve the authenticated Supabase user from a bearer token or SSR cookies.
 * The anon/publishable key is sufficient: getUser validates the token with
 * Supabase Auth. The service-role key is deliberately not used here.
 */
export async function getSupabaseUser(request: Request): Promise<User | null> {
  const { url, key } = getSupabaseConfig();
  const accessToken = getBearerToken(request);

  if (accessToken) {
    const client = createServerClient(url, key, {
      cookies: {
        getAll: () => [],
        setAll: () => undefined,
      },
      global: {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    });
    const { data, error } = await client.auth.getUser(accessToken);
    return error ? null : data.user;
  }

  const client = createServerClient(url, key, {
    cookies: {
      getAll: () => getRequestCookies(request),
      setAll: () => undefined,
    },
  });
  const { data, error } = await client.auth.getUser();
  return error ? null : data.user;
}
