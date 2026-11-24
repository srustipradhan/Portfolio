"use client";
import { motion } from "framer-motion";

export default function Phone({ children, className = "", ...rest }) {
  return (
    <motion.div className={`phone ${className}`} {...rest}>
      <div className="phone-screen">
        <div className="island" />
        {children}
      </div>
    </motion.div>
  );
}
