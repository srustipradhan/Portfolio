"use client";
import { useEffect, useRef, useState } from "react";
import { animate, motion, useInView } from "framer-motion";
import Character from "./Character";
import { profile } from "@/lib/data";

function Counter({ to, decimals = 0, suffix = "" }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true });
  const [v, setV] = useState(0);
  useEffect(() => {
    if (!inView) return;
    const c = animate(0, to, { duration: 1.8, ease: "easeOut", onUpdate: setV });
    return () => c.stop();
  }, [inView, to]);
  return <span ref={ref}>{v.toFixed(decimals)}{suffix}</span>;
}

const stats = [[1, 0, "+", "Years of experience"], [2, 0, "", "Companies"], [3, 0, "", "Projects shipped"], [8.67, 2, "", "B.Sc. CGPA"]];
const up = (d = 0) => ({ initial: { opacity: 0, y: 40 }, whileInView: { opacity: 1, y: 0 }, viewport: { once: true, margin: "-60px" }, transition: { duration: 0.7, delay: d, ease: [0.16, 1, 0.3, 1] } });

export default function About() {
  return (
    <section className="about" id="about">
      <div className="inner">
        <div className="about-grid">
          <div className="about-text">
            <motion.div className="label" {...up()}>( 01 ) Summary</motion.div>
            <motion.h2 className="about-title" {...up(0.08)}>Hi, I&apos;m {profile.firstName}.<br /><span>I build mobile apps.</span></motion.h2>
            <motion.p className="about-copy" {...up(0.16)}>{profile.summary}</motion.p>
          </div>
          <motion.div className="about-char" initial={{ opacity: 0, scale: 0.85, y: 40 }} whileInView={{ opacity: 1, scale: 1, y: 0 }} viewport={{ once: true, margin: "-60px" }} transition={{ type: "spring", stiffness: 80, damping: 14 }}>
            <Character />
          </motion.div>
        </div>
        <div className="stat-row">
          {stats.map(([n, d, s, l], i) => (
            <motion.div key={l} {...up(i * 0.08)}>
              <b><Counter to={n} decimals={d} suffix={s} /></b>
              <small>{l}</small>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
