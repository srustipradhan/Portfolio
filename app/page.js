import Cursor from "@/components/Cursor";
import Nav from "@/components/Nav";
import Hero from "@/components/Hero";
import Bands from "@/components/Bands";
import About from "@/components/About";
import Journey from "@/components/Journey";
import Skills from "@/components/Skills";
import Experience from "@/components/Experience";
import Contact from "@/components/Contact";
import Mascot from "@/components/Mascot";
import SectionReveal from "@/components/SectionReveal";
import AnchorScroll from "@/components/AnchorScroll";

export default function Home() {
  return (
    <main>
      <Cursor />
      <AnchorScroll />
      <Nav />
      <Hero />
      <Bands />
      <SectionReveal><About /></SectionReveal>
      <SectionReveal lift={false}><Journey /></SectionReveal>
      <SectionReveal><Skills /></SectionReveal>
      <SectionReveal><Experience /></SectionReveal>
      <SectionReveal><Contact /></SectionReveal>
      <Mascot />
    </main>
  );
}
