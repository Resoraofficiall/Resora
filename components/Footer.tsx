import { Instagram, Twitter, Linkedin } from "lucide-react";

const columns = [
  {
    title: "Marketplace",
    links: ["Sellers", "Showcase", "Collections", "Authentication"],
  },
  {
    title: "Resora",
    links: ["Manifesto", "Careers", "Press", "Founding Circle"],
  },
  {
    title: "Support",
    links: ["Contact", "Concierge", "Shipping & Custody", "Privacy Policy"],
  },
];

export default function Footer() {
  return (
    <footer className="relative border-t border-hairline px-6 md:px-10 pt-20 pb-10">
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-12 mb-16">
          <div className="md:col-span-2">
            <a href="#top" className="font-display text-3xl tracking-widest2 text-ivory">
              RES<span className="text-gold">O</span>RA
            </a>
            <p className="mt-5 text-ivory/45 text-sm font-light leading-relaxed max-w-xs">
              A curated marketplace for the world&apos;s most exceptional
              sellers of rare, luxury, and one-of-a-kind objects.
            </p>
            <div className="flex items-center gap-4 mt-6">
              <a href="#" aria-label="Instagram" className="text-ivory/50 hover:text-gold transition-colors">
                <Instagram size={18} />
              </a>
              <a href="#" aria-label="Twitter" className="text-ivory/50 hover:text-gold transition-colors">
                <Twitter size={18} />
              </a>
              <a href="#" aria-label="LinkedIn" className="text-ivory/50 hover:text-gold transition-colors">
                <Linkedin size={18} />
              </a>
            </div>
          </div>

          {columns.map((col) => (
            <div key={col.title}>
              <h4 className="text-xs uppercase tracking-[0.3em] text-gold mb-5">
                {col.title}
              </h4>
              <ul className="space-y-3">
                {col.links.map((link) => (
                  <li key={link}>
                    <a
                      href="#"
                      className="text-ivory/50 text-sm font-light hover:text-ivory transition-colors"
                    >
                      {link}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="pt-8 border-t border-hairline flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-ivory/35 text-xs">
            © {new Date().getFullYear()} Resora. All rights reserved.
          </p>
          <p className="text-ivory/35 text-xs uppercase tracking-[0.2em]">
            Demo Platform — Built for Preview
          </p>
        </div>
      </div>
    </footer>
  );
}
