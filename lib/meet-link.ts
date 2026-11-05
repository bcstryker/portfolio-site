export function normalizeMeetLink(value: string): string | null {
  try {
    const url = new URL(value.trim());
    if (url.protocol !== "https:" || url.hostname !== "meet.google.com" || url.port || url.username || url.password || !/^\/[a-z]{3}-[a-z]{4}-[a-z]{3}\/?$/.test(url.pathname)) return null;
    return `https://meet.google.com${url.pathname.replace(/\/$/, "")}`;
  } catch {return null;}
}
