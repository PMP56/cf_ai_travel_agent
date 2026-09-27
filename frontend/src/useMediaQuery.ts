import { useCallback, useSyncExternalStore } from "react";

/**
 * Tracks a media query in JS.
 *
 * Needed because two things here cannot be solved with CSS alone. The map is a
 * WebGL canvas, so rendering it in both a desktop column and a mobile block and
 * hiding one with `lg:hidden` would build two GL contexts and run two map
 * instances. And the place detail is a side column on desktop but a sheet on
 * mobile — different parents, so one element cannot simply be restyled.
 * Both need to know which layout is *live*, not merely which is visible.
 *
 * `useSyncExternalStore` rather than useState + useEffect: matchMedia is an
 * external store, this is the API built for subscribing to one, and it reads
 * the current value during render so there is no first-paint flash of the wrong
 * layout and no setState inside an effect.
 */
export function useMediaQuery(query: string): boolean {
  const subscribe = useCallback(
    (onChange: () => void) => {
      const mql = window.matchMedia(query);
      mql.addEventListener("change", onChange);
      return () => mql.removeEventListener("change", onChange);
    },
    [query]
  );

  const getSnapshot = useCallback(() => window.matchMedia(query).matches, [query]);

  // Server/prerender has no matchMedia; assume the narrow layout, which is the
  // safe default because it renders everything in one column.
  const getServerSnapshot = useCallback(() => false, []);

  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

/** Matches Tailwind's `lg` breakpoint, where the three-column layout begins. */
export const DESKTOP_QUERY = "(min-width: 1024px)";
