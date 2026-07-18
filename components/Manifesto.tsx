"use client";

import { motion } from "framer-motion";

export default function Manifesto() {
  return (
    <section
      id="manifesto"
      className="relative py-32 md:py-48 px-6 md:px-10 border-t border-hairline overflow-hidden"
    >
      <div className="absolute inset-0 bg-radial-glow pointer-events-none" />
      <div className="max-w-5xl mx-auto text-center relative z-10">
        <motion.span
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="text-xs uppercase tracking-[0.4em] text-bronze"
        >
          Our Manifesto
        </motion.span>

        <motion.p
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 1, delay: 0.15, ease: "easeOut" }}
          className="font-display text-3xl md:text-5xl lg:text-6xl leading-[1.2] text-ivory mt-8"
        >
          &ldquo;We do not sell products.
          <br />
          We transfer{" "}
          <span className="italic text-gradient-gold">custodianship</span>
          <br />
          of things worth keeping.&rdquo;
        </motion.p>

        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, delay: 0.5 }}
          className="mt-10 w-16 h-px bg-gold mx-auto"
        />

        <motion.p
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, delay: 0.6 }}
          className="mt-6 text-ivory/40 text-xs uppercase tracking-[0.3em]"
        >
          The Resora Founding Circle
        </motion.p>
      </div>
    </section>
  );
}
