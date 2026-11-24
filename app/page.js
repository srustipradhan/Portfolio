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

export default function Home() {
  return (
    <main>
      <Cursor />
      <Nav />
      <Hero />
      <Bands />
      <About />
      <Journey />
      <Skills />
      <Experience />
      <Contact />
      <Mascot />
    </main>
  );
}
