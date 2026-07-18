import VaultIntro from "@/components/VaultIntro";
import Navbar from "@/components/Navbar";
import Hero from "@/components/Hero";
import Sellers from "@/components/Sellers";
import Showcase from "@/components/Showcase";
import Manifesto from "@/components/Manifesto";
import Collections from "@/components/Collections";
import CtaBanner from "@/components/CtaBanner";
import Footer from "@/components/Footer";

export default function Home() {
  return (
    <>
      <VaultIntro />
      <Navbar />
      <main>
        <Hero />
        <Sellers />
        <Showcase />
        <Manifesto />
        <Collections />
        <CtaBanner />
      </main>
      <Footer />
    </>
  );
}
