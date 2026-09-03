import { useEffect, useRef, useState } from "react";

/** State that survives leaving and returning to the page (per browser tab). */
export function useStickyState<T>(key: string, initial: T) {
  const storageKey = `lv-sticky:${key}`;
  const [value, setValue] = useState<T>(() => {
    if (typeof window === "undefined") return initial;
    try {
      const raw = window.sessionStorage.getItem(storageKey);
      return raw ? (JSON.parse(raw) as T) : initial;
    } catch {
      return initial;
    }
  });

  useEffect(() => {
    try {
      window.sessionStorage.setItem(storageKey, JSON.stringify(value));
    } catch {
      /* storage unavailable — ignore */
    }
  }, [storageKey, value]);

  return [value, setValue] as const;
}

/** Restores the window scroll position for a page when it remounts. */
export function useStickyScroll(key: string) {
  const storageKey = `lv-sticky-scroll:${key}`;
  const restored = useRef(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!restored.current) {
      restored.current = true;
      const saved = Number(window.sessionStorage.getItem(storageKey) ?? "0");
      if (saved > 0) requestAnimationFrame(() => window.scrollTo({ top: saved }));
    }
    const onScroll = () => window.sessionStorage.setItem(storageKey, String(window.scrollY));
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.sessionStorage.setItem(storageKey, String(window.scrollY));
      window.removeEventListener("scroll", onScroll);
    };
  }, [storageKey]);
}
