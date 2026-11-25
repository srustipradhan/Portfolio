"use client";
import { useEffect, useState } from "react";
import { motion, useMotionValue, useSpring } from "framer-motion";

export default function Cursor() {
  const x = useMotionValue(-100);
  const y = useMotionValue(-100);
  const sx = useSpring(x, { stiffness: 700, damping: 42, mass: 0.25 });
  const sy = useSpring(y, { stiffness: 700, damping: 42, mass: 0.25 });
  const rx = useSpring(x, { stiffness: 320, damping: 28, mass: 0.5 });
  const ry = useSpring(y, { stiffness: 320, damping: 28, mass: 0.5 });
  const [hover, setHover] = useState(false);
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    const move = (e) => {
      x.set(e.clientX);
      y.set(e.clientY);
      setHidden(!!e.target.closest?.("input, textarea"));
    };
    const over = (e) => {
      setHover(!!e.target.closest?.("a, button, [data-hover]"));
      setHidden(!!e.target.closest?.("input, textarea"));
    };
    const leave = () => setHidden(true);
    const enter = () => setHidden(false);

    window.addEventListener("mousemove", move);
    window.addEventListener("mouseover", over);
    document.documentElement.addEventListener("mouseleave", leave);
    document.documentElement.addEventListener("mouseenter", enter);
    return () => {
      window.removeEventListener("mousemove", move);
      window.removeEventListener("mouseover", over);
      document.documentElement.removeEventListener("mouseleave", leave);
      document.documentElement.removeEventListener("mouseenter", enter);
    };
  }, [x, y]);

  return (
    <>
      <motion.div
        className="cursor cursor-ring-wrap"
        style={{ x: rx, y: ry }}
        animate={{ opacity: hidden ? 0 : hover ? 1 : 0 }}
        transition={{ duration: 0.16 }}
      >
        <motion.div
          className="cursor-ring"
          animate={{ scale: hover ? 1 : 0.45 }}
          transition={{ type: "spring", stiffness: 340, damping: 24 }}
        />
      </motion.div>
      <motion.div
        className="cursor"
        style={{ x: sx, y: sy }}
        animate={{ opacity: hidden ? 0 : 1 }}
        transition={{ duration: 0.12 }}
      >
        <motion.div
          className="cursor-dot"
          animate={{ scale: hover ? 0.55 : 1 }}
          transition={{ type: "spring", stiffness: 420, damping: 26 }}
        />
      </motion.div>
    </>
  );
}
