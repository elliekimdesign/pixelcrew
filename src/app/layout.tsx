import type { Metadata } from "next";
import { inter, jetbrainsMono, spaceGrotesk } from "@/lib/fonts";
import "./globals.css";

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
      <body className={`${inter.className} ${inter.variable} ${jetbrainsMono.variable} ${spaceGrotesk.variable}`}>{children}</body>
    </html>
  );
}
