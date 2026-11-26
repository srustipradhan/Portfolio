"use client";
import { useEffect } from "react";
import { scrollToSelector } from "@/lib/scroll";

// Makes every in-page link (#work, #contact, ...) land exactly on its section.
export default function AnchorScroll() {
  useEffect(() => {
    const onClick = (e) => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const a = e.target.closest?.('a[href^="#"]');
      if (!a) return;
      const hash = a.getAttribute("href");
      if (hash.length < 2 || !document.querySelector(hash)) return;
      e.preventDefault();
      scrollToSelector(hash);
      history.replaceState(null, "", hash);
    };
    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }, []);
  return null;
}
