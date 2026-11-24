import { useLayoutEffect } from "react";

/** The shell applies the theme for signed-in pages; these pages sit outside it. Read only. */
export function useStoredTheme() {
  useLayoutEffect(() => {
    try { document.documentElement.classList.toggle("light", window.localStorage.getItem("wendico-books.theme") === "light"); } catch { /* storage blocked: dark stays */ }
  }, []);
}
