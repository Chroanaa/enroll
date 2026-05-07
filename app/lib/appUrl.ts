export function getAppBaseUrl(fallbackOrigin?: string) {
  const configured =
    process.env.NEXT_PUBLIC_APP_URL?.trim() ||
    process.env.NEXTAUTH_URL?.trim() ||
    (process.env.VERCEL_URL?.trim()
      ? `https://${process.env.VERCEL_URL.trim().replace(/^https?:\/\//, "")}`
      : "");

  return (configured || fallbackOrigin || "").replace(/\/$/, "");
}

export function buildAppUrl(pathname: string, fallbackOrigin?: string) {
  const base = getAppBaseUrl(fallbackOrigin);
  const normalizedPath = pathname.startsWith("/") ? pathname : `/${pathname}`;
  return base ? `${base}${normalizedPath}` : normalizedPath;
}
