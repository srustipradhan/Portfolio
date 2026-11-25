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
