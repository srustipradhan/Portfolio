"use client";
import { useRef } from "react";
import { motion, useReducedMotion, useScroll, useTransform } from "framer-motion";

// Wraps a whole section. As it scrolls up into view it rises, scales in, fades up and its top corners
// round off then square away. Tied to scroll position, so scrolling back up plays it in reverse.
// `lift={false}` skips the movement (used for sections that measure their own scroll position).
export default function SectionReveal({ children, lift = true, radius = 44 }) {
  const ref = useRef(null);
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "start 0.4"] });
  const y = useTransform(scrollYProgress, [0, 1], [lift ? 90 : 0, 0]);
  const scale = useTransform(scrollYProgress, [0, 1], [lift ? 0.93 : 1, 1]);
  const opacity = useTransform(scrollYProgress, [0, 0.55], [0.15, 1]);
  const r = useTransform(scrollYProgress, [0, 1], [radius, 0]);

  return (
    <motion.div
      ref={ref}
      className="reveal"
      style={reduce ? undefined : { y, scale, opacity, borderTopLeftRadius: r, borderTopRightRadius: r }}
    >
      {children}
    </motion.div>
  );
}
