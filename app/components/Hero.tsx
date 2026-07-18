"use client";

import { motion } from "framer-motion";
import { ArrowDown } from "lucide-react";

export default function Hero() {
  return (
    <section
      id="top"
      className="relative min-h-[100svh] flex flex-col items-center justify-center overflow-hidden px-6"
    >
      {/* Ambient golden lighting */}
      <div className="absolute inset-0 bg-radial-glow pointer-events-none" />
      <motion.div
        className="absolute -top-40 left-1/2 -translate-x-1/2 w-[900px] h-[900px] rounded-full bg-gold/10 blur-[160px] animate-floatSlow pointer-events-none"
        aria-hidden
      />
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-obsidian pointer-events-none" />

      <div className="relative z-10 flex flex-col items-center text-center max-w-4xl">
        <motion.p
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 3.0 }}
          className="text-xs md:text-sm uppercase tracking-[0.5em] text-bronze mb-6"
        >
          Invitation Only Marketplace
        </motion.p>

        <motion.h1
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, delay: 3.2, ease: "easeOut" }}
          className="font-display text-[13vw] leading-[0.95] md:text-8xl lg:text-9xl tracking-wide text-ivory"
        >
          The Art of
          <br />
          <span className="text-gradient-gold italic">Owning Less,</span>
          <br />
          Better.
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 3.6 }}
          className="mt-8 max-w-xl text-ivory/60 text-base md:text-lg font-light leading-relaxed"
        >
          Resora connects a small circle of discerning collectors with the
          world&apos;s most exceptional sellers — timepieces, jewelry,
          textiles, and art, each piece verified and vaulted for its next
          keeper.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 4.0 }}
          className="mt-12 flex flex-col sm:flex-row items-center gap-5"
        >
          <a
            id="cta"
            href="#sellers"
            className="group relative overflow-hidden bg-gold text-obsidian px-9 py-4 text-xs uppercase tracking-[0.3em] font-medium"
          >
            <span className="relative z-10">Enter the Showroom</span>
            <span className="absolute inset-0 bg-gold-sweep bg-[length:200%_100%] animate-shimmer opacity-70" />
          </a>
          <a
            href="#manifesto"
            className="text-ivory/70 text-xs uppercase tracking-[0.3em] border-b border-ivory/30 pb-1 hover:text-gold hover:border-gold transition-colors duration-300"
          >
            Our Manifesto
          </a>
        </motion.div>
      </div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1, delay: 4.6 }}
        className="absolute bottom-10 flex flex-col items-center gap-2 text-bronze"
      >
        <span className="text-[10px] uppercase tracking-[0.4em]">Scroll</span>
        <motion.div
          animate={{ y: [0, 8, 0] }}
          transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
        >
          <ArrowDown size={16} />
        </motion.div>
      </motion.div>
    </section>
  );
}
