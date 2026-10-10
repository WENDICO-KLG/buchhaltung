export function isAllowedPushEndpoint(endpoint: unknown): endpoint is string {
  if (typeof endpoint !== "string" || endpoint.length > 2048) return false;
  try {
    const url = new URL(endpoint);
    if (url.protocol !== "https:" || url.username || url.password || url.port || url.hash || url.search) return false;
    return (url.hostname === "fcm.googleapis.com" && url.pathname.startsWith("/fcm/send/"))
      || (url.hostname === "updates.push.services.mozilla.com" && url.pathname.startsWith("/wpush/v2/"))
      || (url.hostname === "web.push.apple.com" && url.pathname.startsWith("/"));
  } catch { return false; }
}