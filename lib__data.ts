// lib/data.ts
// Static demo content for the Resora marketplace homepage.

export type Seller = {
  id: string;
  name: string;
  title: string;
  location: string;
  specialty: string;
  rating: number;
  itemsCurated: number;
  image: string;
  accent: string;
};

export const sellers: Seller[] = [
  {
    id: "syed",
    name: "Syed",
    title: "Master of Fine Timepieces",
    location: "Dubai, UAE",
    specialty: "Vintage & Rare Watches",
    rating: 4.9,
    itemsCurated: 128,
    image:
      "https://images.unsplash.com/photo-1594534475808-b18fc33b045e?q=80&w=1200&auto=format&fit=crop",
    accent: "from-gold/30",
  },
  {
    id: "mantasha",
    name: "Mantasha",
    title: "Curator of Heritage Jewelry",
    location: "Hyderabad, India",
    specialty: "Antique & Bridal Jewelry",
    rating: 5.0,
    itemsCurated: 94,
    image:
      "https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?q=80&w=1200&auto=format&fit=crop",
    accent: "from-gold/30",
  },
  {
    id: "zoya",
    name: "Zoya",
    title: "Atelier of Couture Textiles",
    location: "Lahore, Pakistan",
    specialty: "Handwoven Silk & Couture",
    rating: 4.8,
    itemsCurated: 156,
    image:
      "https://images.unsplash.com/photo-1490481651871-ab68de25d43d?q=80&w=1200&auto=format&fit=crop",
    accent: "from-gold/30",
  },
  {
    id: "afshan",
    name: "Afshan",
    title: "Connoisseur of Fine Art",
    location: "Istanbul, Turkey",
    specialty: "Contemporary & Classic Art",
    rating: 4.9,
    itemsCurated: 72,
    image:
      "https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=1200&auto=format&fit=crop",
    accent: "from-gold/30",
  },
];

export type Product = {
  id: string;
  name: string;
  seller: string;
  price: string;
  image: string;
  category: string;
};

export const products: Product[] = [
  {
    id: "p1",
    name: "The Meridian Chronograph",
    seller: "Syed",
    price: "$18,400",
    image:
      "https://images.unsplash.com/photo-1523170335258-f5ed11844a49?q=80&w=1400&auto=format&fit=crop",
    category: "Timepieces",
  },
  {
    id: "p2",
    name: "Zumurrud Kundan Necklace",
    seller: "Mantasha",
    price: "$26,900",
    image:
      "https://images.unsplash.com/photo-1611591437281-460bfbe1220a?q=80&w=1400&auto=format&fit=crop",
    category: "Jewelry",
  },
  {
    id: "p3",
    name: "Banarasi Zari Heirloom",
    seller: "Zoya",
    price: "$4,200",
    image:
      "https://images.unsplash.com/photo-1610030181087-c6bd68b1494c?q=80&w=1400&auto=format&fit=crop",
    category: "Textiles",
  },
  {
    id: "p4",
    name: "Bosphorus at Dusk (Oil)",
    seller: "Afshan",
    price: "$12,750",
    image:
      "https://images.unsplash.com/photo-1541961017774-22349e4a1262?q=80&w=1400&auto=format&fit=crop",
    category: "Fine Art",
  },
];

export type Collection = {
  id: string;
  title: string;
  description: string;
  image: string;
  count: number;
};

export const collections: Collection[] = [
  {
    id: "c1",
    title: "The Vault",
    description: "Rare timepieces from private collectors, verified and archived.",
    image:
      "https://images.unsplash.com/photo-1587836374828-4dbafa94cf0e?q=80&w=1400&auto=format&fit=crop",
    count: 42,
  },
  {
    id: "c2",
    title: "Heirloom",
    description: "Jewelry passed through generations, reimagined for new hands.",
    image:
      "https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?q=80&w=1400&auto=format&fit=crop",
    count: 58,
  },
  {
    id: "c3",
    title: "Atelier",
    description: "Handcrafted textiles and couture from master weavers.",
    image:
      "https://images.unsplash.com/photo-1544441893-675973e31985?q=80&w=1400&auto=format&fit=crop",
    count: 67,
  },
  {
    id: "c4",
    title: "Gallery",
    description: "Original fine art curated from ateliers across the world.",
    image:
      "https://images.unsplash.com/photo-1554907984-15263bfd63bd?q=80&w=1400&auto=format&fit=crop",
    count: 35,
  },
];
