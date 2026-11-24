import { Anton, Manrope, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const display = Anton({ variable: "--font-display", subsets: ["latin"], weight: "400" });
const sans = Manrope({ variable: "--font-sans", subsets: ["latin"] });
const mono = JetBrains_Mono({ variable: "--font-mono", subsets: ["latin"] });

export const metadata = {
  title: "Srusti Saranjana Pradhan — Mobile Full Stack Developer",
  description: "Portfolio of a mobile full stack developer building scalable, reliable apps.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={`${display.variable} ${sans.variable} ${mono.variable}`}>
      <body>{children}</body>
    </html>
  );
}
