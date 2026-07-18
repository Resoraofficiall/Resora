"use client";

import Image from "next/image";
import { motion } from "framer-motion";
import { Star, MapPin, Gem } from "lucide-react";
import type { Seller } from "@/lib/data";

type SellerCardProps = {
  seller: Seller;
  index?: number;
};

export default function SellerCard({ seller, index = 0 }: SellerCardProps) {
  return (
    <motion.article
      initial={{ opacity: 0, y: 40 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: 0.7, delay: index * 0.12, ease: "easeOut" }}
      className="group relative border border-hairline hover:border-gold/50 transition-colors duration-500 bg-panel"
    >
      <div className="relative h-72 overflow-hidden">
        <Image
          src={seller.image}
          alt={`${seller.name}, ${seller.title}`}
          fill
          sizes="(max-width: 768px) 100vw, 25vw"
          className="object-cover grayscale-[30%] group-hover:grayscale-0 group-hover:scale-105 transition-all duration-700 ease-out"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-obsidian via-obsidian/10 to-transparent" />

        {/* Glass light sweep on hover */}
        <div className="absolute inset-0 bg-gold-sweep bg-[length:250%_100%] translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-[1200ms] ease-out pointer-events-none" />

        <div className="absolute top-4 right-4 flex items-center gap-1 bg-obsidian/70 backdrop-blur-sm border border-gold/30 px-2.5 py-1">
          <Star size={11} className="fill-gold text-gold" />
          <span className="text-[11px] text-ivory">{seller.rating.toFixed(1)}</span>
        </div>
      </div>

      <div className="p-6">
        <h3 className="font-display text-2xl text-ivory mb-1">{seller.name}</h3>
        <p className="text-gold text-xs uppercase tracking-[0.15em] mb-4">
          {seller.title}
        </p>

        <div className="flex items-center gap-2 text-ivory/50 text-xs mb-2">
          <MapPin size={12} />
          <span>{seller.location}</span>
        </div>
        <div className="flex items-center gap-2 text-ivory/50 text-xs mb-5">
          <Gem size={12} />
          <span>{seller.specialty}</span>
        </div>

        <div className="flex items-center justify-between pt-4 border-t border-hairline">
          <span className="text-[11px] text-ivory/40 uppercase tracking-widest">
            {seller.itemsCurated} pieces curated
          </span>
          <span className="text-[11px] text-gold uppercase tracking-widest group-hover:tracking-[0.2em] transition-all duration-300">
            View →
          </span>
        </div>
      </div>
    </motion.article>
  );
}
