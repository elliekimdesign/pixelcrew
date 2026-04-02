import { Inter, JetBrains_Mono, Space_Grotesk } from "next/font/google";

export const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
});

export const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
});

export const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-heading",
  weight: ["400", "500", "600", "700"],
});
