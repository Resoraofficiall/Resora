"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";

export default function VaultIntro() {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    document.body.style.overflow = "hidden";
    const timer = setTimeout(() => {
      setVisible(false);
      document.body.style.overflow = "";
    }, 2600);
    return () => {
      clearTimeout(timer);
      document.body.style.overflow = "";
    };
  }, []);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-obsidian"
          exit={{ opacity: 0 }}
          transition={{ duration: 0.8, ease: "easeInOut" }}
        >
          {/* Left panel */}
          <motion.div
            className="absolute inset-y-0 left-0 w-1/2 bg-charcoal"
            initial={{ x: 0 }}
            animate={{ x: "-100%" }}
            transition={{ duration: 1.1, delay: 1.3, ease: [0.76, 0, 0.24, 1] }}
          />
          {/* Right panel */}
          <motion.div
            className="absolute inset-y-0 right-0 w-1/2 bg-charcoal"
            initial={{ x: 0 }}
            animate={{ x: "100%" }}
            transition={{ duration: 1.1, delay: 1.3, ease: [0.76, 0, 0.24, 1] }}
          />

          {/* Gold seam */}
          <motion.div
            className="absolute inset-y-0 left-1/2 w-px -translate-x-1/2 bg-gold"
            initial={{ scaleY: 0, opacity: 0 }}
            animate={{ scaleY: 1, opacity: 1 }}
            transition={{ duration: 0.9, ease: "easeOut" }}
            style={{ boxShadow: "0 0 24px 2px rgba(198,165,103,0.6)" }}
          />

          {/* Logo emergence */}
          <motion.div
            className="relative z-10 flex flex-col items-center"
            initial={{ opacity: 0, letterSpacing: "0.6em" }}
            animate={{ opacity: 1, letterSpacing: "0.35em" }}
            transition={{ duration: 1.2, delay: 0.3, ease: "easeOut" }}
          >
            <span className="font-display text-4xl md:text-6xl tracking-widest2 text-gradient-gold">
              RESORA
            </span>
            <motion.span
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.8, delay: 1 }}
              className="mt-3 text-[10px] md:text-xs uppercase tracking-[0.5em] text-bronze"
            >
              The Extraordinary, Curated
            </motion.span>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
