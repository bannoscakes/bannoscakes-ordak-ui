import { useCallback, useEffect, useRef } from "react";

/**
 * Small, cancelable debounce hook.
 * Returns [debouncedFn, cancel].
 */
export function useDebouncedCallback<T extends (...args: unknown[]) => void>(
  fn: T,
  delay: number
): [(...args: Parameters<T>) => void, () => void] {
  const fnRef = useRef(fn);
  const timeoutRef = useRef<number | null>(null);

  useEffect(() => {
    fnRef.current = fn;
  }, [fn]);

  const cancel = useCallback(() => {
    if (timeoutRef.current !== null) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  const debounced = useCallback((...args: Parameters<T>) => {
    if (timeoutRef.current !== null) {
      clearTimeout(timeoutRef.current);
    }
    timeoutRef.current = window.setTimeout(() => {
      fnRef.current(...args);
    }, delay);
  }, [delay]);

  useEffect(() => {
    return () => cancel();
  }, [cancel]);

  return [debounced, cancel];
}
