Overview
I reviewed the navigation and data-loading flow around the dashboard and inventory sections to understand why the first visit is responsive while later visits feel broken or redirect you back to the dashboard.

Navigation state mismatches
The sidebar always pushes URLs like /?view=inventory, but the dashboard reads the page query parameter on load. When you refresh or deep-link into inventory, page is missing, so the dashboard falls back to the default “dashboard” view, which matches the behavior you described after reloading.

After the initial mount, the dashboard never re-parses the URL—it only does so once in a useEffect with an empty dependency list—so browser navigation or programmatic calls to safePushState do not update its internal activeView. This easily desynchronizes the URL from the visible content and helps explain why the second navigation attempt leaves the tables blank or stuck.

RoleBasedRouter globally overrides window.history.pushState to watch navigations, but it does not provide the same hook for replaceState. If any other code uses replaceState, the dashboard will miss the change and keep rendering stale content.

Data-loading inefficiencies impacting responsiveness
Every 30 seconds—whether you are looking at the dashboard or not—the dashboard downloads up to 1,000 orders for each store just to recompute counts. That is a heavy network burst that can stall the UI, particularly once multiple tabs or teammates have the app open.

The staff workspace performs its own two-store queue fetch (100 orders per store) on every mount, even though the dashboard just finished doing a similar download. There is no sharing, throttling, or caching between these screens, so hopping between them multiplies the load.

Inventory tabs each trigger separate Supabase RPC calls. The components tab alone requests 100 records immediately on mount. If you visit another tab and come back, a new request runs; meanwhile the dashboard polling continues in the background.

During most of these fetches there is no loading skeleton or placeholder, so the tables appear blank until the request finishes. Because the loading state is never used in the returned JSX, the user simply sees an empty panel during network latency, which matches the “tables are not opening” perception.

Session and recovery considerations
The authentication service refreshes the session and reloads the user profile on many auth events. If the profile RPC is slow, the RootApp component sits in a loading state that only shows a spinner after three seconds. Re-entrancy during these transitions can trigger the reconnect overlay and block the UI until the profile call returns.

Additional observations
Because navigation is forced into a single “/” path, deep links such as /inventory are immediately rewritten to /, losing the intended destination. That compounds the reload issue and makes it hard to bookmark secondary screens.

Debug logging is left in many RPC consumers (console.log statements throughout the inventory and BOM modules). In production, these logs can add noticeable overhead when large payloads are printed to the console.

These issues together explain why the first navigation feels fine (everything is freshly mounted and loaded) but subsequent visits show empty tables or bounce you back to the dashboard.


