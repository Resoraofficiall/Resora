"use client";

import Image from "next/image";
import { motion } from "framer-motion";
import { products } from "@/lib/data";

export default function Showcase() {
  return (
    <section id="showcase" className="relative py-28 md:py-36 px-6 md:px-10 border-t border-hairline">
      <div className="max-w-7xl mx-auto">
        <div className="mb-16">
          <p className="text-xs uppercase tracking-[0.4em] text-bronze mb-4">
            The Showcase
          </p>
          <h2 className="font-display text-4xl md:text-6xl text-ivory max-w-2xl">
            Objects worth <span className="italic text-gradient-gold">a lifetime.</span>
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-16">
          {products.map((product, i) => (
            <motion.div
              key={product.id}
              initial={{ opacity: 0, y: 50 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-100px" }}
              transition={{ duration: 0.8, delay: (i % 2) * 0.15, ease: "easeOut" }}
              className="group"
            >
              <div className="relative h-[380px] md:h-[460px] overflow-hidden bg-panel border border-hairline">
                <Image
                  src={product.image}
                  alt={product.name}
                  fill
                  sizes="(max-width: 768px) 100vw, 50vw"
                  className="object-cover group-hover:scale-[1.04] transition-transform duration-[1200ms] ease-out"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-obsidian/80 via-transparent to-transparent" />
                <div className="absolute inset-0 bg-gold-sweep bg-[length:250%_100%] translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-[1300ms] ease-out pointer-events-none" />

                <div className="absolute top-5 left-5 text-[10px] uppercase tracking-[0.3em] text-ivory/70 bg-obsidian/60 backdrop-blur-sm px-3 py-1.5 border border-hairline">
                  {product.category}
                </div>

                <div className="absolute bottom-0 inset-x-0 p-6 flex items-end justify-between">
                  <div>
                    <h3 className="font-display text-2xl md:text-3xl text-ivory">
                      {product.name}
                    </h3>
                    <p className="text-ivory/50 text-xs uppercase tracking-[0.2em] mt-1">
                      Curated by {product.seller}
                    </p>
                  </div>
                  <span className="font-display text-xl text-gold whitespace-nowrap">
                    {product.price}
                  </span>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
