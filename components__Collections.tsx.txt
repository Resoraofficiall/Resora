"use client";

import Image from "next/image";
import { motion } from "framer-motion";
import { collections } from "@/lib/data";

export default function Collections() {
  return (
    <section
      id="collections"
      className="relative py-28 md:py-36 px-6 md:px-10 border-t border-hairline"
    >
      <div className="max-w-7xl mx-auto">
        <div className="mb-16">
          <p className="text-xs uppercase tracking-[0.4em] text-bronze mb-4">
            Collections
          </p>
          <h2 className="font-display text-4xl md:text-6xl text-ivory max-w-2xl">
            Curated by <span className="italic text-gradient-gold">discipline,</span> not category.
          </h2>
        </div>

        {/* Asymmetric editorial grid */}
        <div className="grid grid-cols-1 md:grid-cols-6 gap-6">
          {collections.map((c, i) => {
            const spanClass =
              i === 0
                ? "md:col-span-4 md:row-span-2 h-[420px] md:h-full"
                : i === 1
                ? "md:col-span-2 h-[260px]"
                : i === 2
                ? "md:col-span-2 h-[260px]"
                : "md:col-span-6 h-[300px]";

            return (
              <motion.div
                key={c.id}
                initial={{ opacity: 0, y: 40 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-80px" }}
                transition={{ duration: 0.8, delay: i * 0.1, ease: "easeOut" }}
                className={`group relative overflow-hidden border border-hairline ${spanClass}`}
              >
                <Image
                  src={c.image}
                  alt={c.title}
                  fill
                  sizes="(max-width: 768px) 100vw, 60vw"
                  className="object-cover group-hover:scale-105 transition-transform duration-[1200ms] ease-out"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-obsidian via-obsidian/30 to-transparent" />
                <div className="absolute inset-0 bg-gold-sweep bg-[length:250%_100%] translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-[1300ms] ease-out pointer-events-none" />

                <div className="absolute bottom-0 inset-x-0 p-7 flex items-end justify-between">
                  <div>
                    <h3 className="font-display text-3xl text-ivory">{c.title}</h3>
                    <p className="text-ivory/50 text-sm font-light mt-1 max-w-xs">
                      {c.description}
                    </p>
                  </div>
                  <span className="text-gold text-xs uppercase tracking-[0.2em] whitespace-nowrap">
                    {c.count} pieces
                  </span>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
