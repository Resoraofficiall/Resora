"use client";

import { motion } from "framer-motion";

export default function CtaBanner() {
  return (
    <section className="relative py-28 md:py-36 px-6 md:px-10 border-t border-hairline overflow-hidden">
      <motion.div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] rounded-full bg-gold/10 blur-[150px] animate-pulseGold pointer-events-none"
        aria-hidden
      />
      <div className="max-w-3xl mx-auto text-center relative z-10">
        <motion.h2
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.9, ease: "easeOut" }}
          className="font-display text-4xl md:text-6xl text-ivory"
        >
          Resora opens by <span className="italic text-gradient-gold">invitation.</span>
        </motion.h2>
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.9, delay: 0.15, ease: "easeOut" }}
          className="mt-6 text-ivory/55 font-light max-w-xl mx-auto"
        >
          Join the founding circle of collectors and sellers shaping the
          future of the marketplace for the extraordinary.
        </motion.p>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.9, delay: 0.3, ease: "easeOut" }}
          className="mt-10"
        >
          <a
            href="#top"
            className="group relative inline-block overflow-hidden bg-gold text-obsidian px-10 py-4 text-xs uppercase tracking-[0.3em] font-medium"
          >
            <span className="relative z-10">Request Your Invitation</span>
            <span className="absolute inset-0 bg-gold-sweep bg-[length:200%_100%] animate-shimmer opacity-70" />
          </a>
        </motion.div>
      </div>
    </section>
  );
}
