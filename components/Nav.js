"use client";
import { motion } from "framer-motion";

const links = [["Work", "#work"], ["Skills", "#skills"], ["Experience", "#experience"], ["Hire me", "#contact"]];

export default function Nav() {
  return (
    <motion.header className="nav" initial={{ y: -40, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.8, duration: 0.6 }}>
      <a href="#top" className="nav-logo">SRUSTI<sup>®</sup></a>
      <nav>
        {links.map(([l, h]) => (
          <a key={l} href={h} className="nav-link"><span data-t={l}>{l}</span></a>
        ))}
      </nav>
    </motion.header>
  );
}
