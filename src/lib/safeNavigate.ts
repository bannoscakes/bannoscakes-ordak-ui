import type { NavigateFunction, To } from "react-router-dom";

/** Blocks bad targets (boolean/null/etc) and logs who tried it. */
export function makeSafeNavigate(navigate: NavigateFunction) {
  return (to: To, opts?: Parameters<NavigateFunction>[1]) => {
    if (typeof to !== "string") {
      // TEMP diagnostics to find the culprit
      // eslint-disable-next-line no-console
      console.warn("Blocked navigate with non-string target:", {
        to,
        typeof: typeof to,
        stack: new Error().stack?.split("\n").slice(0, 6).join("\n"),
      });
      return;
    }
    if (to === "" || to === "false") {
      console.warn("Blocked navigate to suspicious path:", { to });
      return;
    }
    navigate(to, opts);
  };
}

/** Safe navigation for window.history.pushState (current architecture) */
export function safePushState(path: string, title = '', state?: any) {
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
  } catch (error) {
    console.error("Error in safePushState:", error);
  }
}
