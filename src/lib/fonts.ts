import { Instrument_Sans, Inter, JetBrains_Mono } from "next/font/google";

export const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
});

export const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
});

export const instrumentSans = Instrument_Sans({
  subsets: ["latin"],
  variable: "--font-task-title",
  weight: ["400", "500", "600", "700"],
});
