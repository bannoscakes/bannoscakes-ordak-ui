/** Custom event name for programmatic navigation (fixes #498 - avoids duplicate pushState patching) */
export const NAVIGATION_EVENT = 'app:navigation';

/** Safe navigation for window.history.pushState (current architecture) */
export function safePushState(path: string, title = '', state?: unknown) {
  if (typeof path !== "string") {
    // eslint-disable-next-line no-console
    console.warn("Blocked pushState with non-string path:", {
      path,
      typeof: typeof path,
      stack: new Error().stack?.split("\n").slice(0, 6).join("\n"),
    });
    return;
  }
  if (path === "" || path === "false") {
    console.warn("Blocked pushState to suspicious path:", { path });
    return;
  }

  try {
    window.history.pushState(state || {}, title, path);
    // Dispatch custom event so components can react without patching pushState
    window.dispatchEvent(new CustomEvent(NAVIGATION_EVENT, { detail: { path } }));
  } catch (error) {
    console.error("Error in safePushState:", error);
  }
}
