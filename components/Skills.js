"use client";
import { motion } from "framer-motion";
import { skillGroups } from "@/lib/data";

export default function Skills() {
  return (
    <section className="skills" id="skills">
      <div className="inner">
        <div className="label">( 03 ) Technical skills</div>
        <h2 className="sec-title">THE <span>TOOLBOX</span></h2>
        <div className="srows">
          {skillGroups.map((g, i) => (
            <motion.div key={g.title} className="srow" initial="rest" whileHover="hover" whileInView="seen" viewport={{ once: true, margin: "-40px" }}
              variants={{ rest: { opacity: 0, y: 40 }, seen: { opacity: 1, y: 0, transition: { duration: 0.6, delay: (i % 4) * 0.05 } } }} data-hover>
              <motion.span className="srow-bg" variants={{ rest: { scaleY: 0 }, hover: { scaleY: 1 }, seen: { scaleY: 0 } }} transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }} />
              <span className="srow-n">0{i + 1}</span>
              <h3>{g.title}</h3>
              <p>{g.items.map((s) => <span key={s}>{s}</span>)}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
