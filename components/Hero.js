"use client";
import { useRef, useSyncExternalStore } from "react";
import { motion, useScroll, useTransform } from "framer-motion";
import Phone from "./Phone";
import { EnergyScreen } from "./Screens";
import { profile } from "@/lib/data";

const lines = [["MOBILE", "var(--white)"], ["FULL STACK", "var(--lime)"], ["DEVELOPER", "var(--orange)"]];

const subMobile = (cb) => {
  const mq = window.matchMedia("(max-width: 1000px)");
  mq.addEventListener("change", cb);
  return () => mq.removeEventListener("change", cb);
};
const snapMobile = () => window.matchMedia("(max-width: 1000px)").matches;

export default function Hero() {
  const ref = useRef(null);
  const isMobile = useSyncExternalStore(subMobile, snapMobile, () => false);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end start"] });
  const xs = [useTransform(scrollYProgress, [0, 1], [0, -220]), useTransform(scrollYProgress, [0, 1], [0, 160]), useTransform(scrollYProgress, [0, 1], [0, -120])];
  const phoneY = useTransform(scrollYProgress, [0, 1], [0, 260]);
  const phoneRot = useTransform(scrollYProgress, [0, 1], [-8, 22]);

  return (
    <section className="hero" id="top" ref={ref}>
      <div className="hero-meta">
        <span>{profile.name}</span>
        <span className="live"><i /> Available for freelance</span>
      </div>

      <div className="hero-lines">
        {lines.map(([t, c], i) => (
          <motion.div key={t} style={isMobile ? undefined : { x: xs[i] }}>
            <div className="mask">
              <motion.h1 style={{ color: c }} initial={{ y: "110%" }} animate={{ y: 0 }} transition={{ delay: 0.15 + i * 0.12, duration: 0.9, ease: [0.16, 1, 0.3, 1] }}>{t}</motion.h1>
            </div>
          </motion.div>
        ))}
      </div>

      <motion.div className="hero-phone" style={isMobile ? undefined : { y: phoneY, rotate: phoneRot }} initial={{ opacity: 0, scale: 0.6 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.7, type: "spring", stiffness: 80, damping: 13 }}>
        <motion.div animate={{ y: [0, -14, 0] }} transition={{ duration: 4.5, repeat: Infinity, ease: "easeInOut" }}>
          <div className="phone-fit">
            <Phone><EnergyScreen /></Phone>
          </div>
        </motion.div>
      </motion.div>

      <div className="hero-foot">
        <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.1 }}>{profile.tagline}</motion.p>
        <motion.div className="scroll-cue" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.3 }}>
          Scroll <motion.span animate={{ y: [0, 8, 0] }} transition={{ repeat: Infinity, duration: 1.4 }}>↓</motion.span>
        </motion.div>
      </div>
    </section>
  );
}
