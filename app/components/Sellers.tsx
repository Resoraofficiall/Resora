"use client";

import SellerCard from "@/components/SellerCard";
import { sellers } from "@/lib/data";

export default function Sellers() {
  return (
    <section id="sellers" className="relative py-28 md:py-36 px-6 md:px-10">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row md:items-end md:justify-between mb-16 gap-6">
          <div>
            <p className="text-xs uppercase tracking-[0.4em] text-bronze mb-4">
              Featured Sellers
            </p>
            <h2 className="font-display text-4xl md:text-6xl text-ivory">
              Four Houses, <span className="italic text-gradient-gold">One Standard</span>
            </h2>
          </div>
          <p className="max-w-sm text-ivory/50 text-sm font-light leading-relaxed">
            Every seller on Resora is personally vetted and admitted by
            invitation only. Their reputation is the collateral.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {sellers.map((seller, i) => (
            <SellerCard key={seller.id} seller={seller} index={i} />
          ))}
        </div>
      </div>
    </section>
  );
}
