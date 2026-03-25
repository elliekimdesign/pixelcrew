import type { Metadata } from "next";
import { IBM_Plex_Sans, JetBrains_Mono, Jersey_10 } from "next/font/google";
import "./globals.css";

const ibmPlex = IBM_Plex_Sans({
  weight: ["400", "500", "600"],
  subsets: ["latin"],
  variable: "--font-sans",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
});

const jersey = Jersey_10({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-pixel",
});

export const metadata: Metadata = {
  title: "AI Assistant",
  description: "Personal AI Assistant",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={`${ibmPlex.variable} ${jetbrainsMono.variable} ${jersey.variable}`}>{children}</body>
    </html>
  );
}
