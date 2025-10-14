export function installDevHistoryGuard() {
  if (import.meta.env.PROD) return;
  const orig = window.history.pushState.bind(window.history);

  window.history.pushState = ((data: any, title: string, url?: string | URL | null) => {
    const to = typeof url === "string" ? url : (url instanceof URL ? url.pathname + url.search : url);
    if (to === "false" || to === "" || typeof to !== "string") {
      // eslint-disable-next-line no-console
      console.warn("[dev-history-guard] blocked pushState", { to, stack: new Error().stack?.split("\n").slice(0,6).join("\n") });
      return; // block it in dev so it can't flip to /false
    }
    return orig(data, title, url as any);
  }) as typeof window.history.pushState;
}
