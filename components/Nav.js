"use client";
import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";

const links = [
  ["Work", "#work"],
  ["Skills", "#skills"],
  ["Experience", "#experience"],
  ["Hire me", "#contact"],
];

const sections = {
  about: { num: "01", label: "About" },
  work: { num: "02", label: "Projects" },
  skills: { num: "03", label: "Skills" },
  experience: { num: "04", label: "Experience" },
  contact: { num: "05", label: "Contact" },
};

export default function Nav() {
  const [sec, setSec] = useState("top");
  // colours of whatever is directly behind the header, so its text always has proper contrast
  const [theme, setTheme] = useState({ bg: "transparent", fg: "#fff" });

  useEffect(() => {
    let raf = 0;
    const sample = () => {
      raf = 0;
      let bg = [10, 10, 10];
      for (const el of document.elementsFromPoint(window.innerWidth / 2, 3)) {
        if (el.closest(".nav, .mascot-layer, .cursor")) continue;
        const m = getComputedStyle(el).backgroundColor.match(/rgba?\(([^)]+)\)/);
        if (!m) continue;
        const [r, g, b, a = 1] = m[1].split(/[,\s/]+/).filter(Boolean).map(Number);
        if (a > 0.5) { bg = [r, g, b]; break; }
      }
      const lum = (0.299 * bg[0] + 0.587 * bg[1] + 0.114 * bg[2]) / 255;
      const next = { bg: window.scrollY > 30 ? `rgb(${bg.join(",")})` : "transparent", fg: lum > 0.45 ? "#0a0a0a" : "#fff" };
      setTheme((t) => (t.bg === next.bg && t.fg === next.fg ? t : next));
    };
    const onScroll = () => { if (!raf) raf = requestAnimationFrame(sample); };
    sample();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, []);

  useEffect(() => {
    const obs = new IntersectionObserver(
      (entries) => {
        entries.forEach((en) => {
          if (en.isIntersecting) setSec(en.target.id);
        });
      },
      { rootMargin: "-45% 0px -45% 0px" }
    );

    ["top", ...Object.keys(sections)].forEach((id) => {
      const el = document.getElementById(id);
      if (el) obs.observe(el);
    });
    return () => obs.disconnect();
  }, []);

  const current = sections[sec];

  return (
    <motion.header
      className="nav"
      style={{ backgroundColor: theme.bg, color: theme.fg }}
      initial={{ y: -40, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ delay: 0.8, duration: 0.6 }}
    >
      <div className="nav-brand">
        <a href="#top" className="nav-logo">
          SRUSTI<sup>®</sup>
        </a>
        <AnimatePresence mode="wait">
          {current && (
            <motion.a
              key={sec}
              href={`#${sec}`}
              className="nav-sec"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
            >
              <span>( {current.num} )</span> {current.label}
            </motion.a>
          )}
        </AnimatePresence>
      </div>

      <nav>
        {links.map(([l, h]) => {
          const isActive = h === `#${sec}`;
          return (
            <a key={l} href={h} className={isActive ? "nav-link active" : "nav-link"}>
              <span data-t={l}>{l}</span>
            </a>
          );
        })}
      </nav>
    </motion.header>
  );
}
