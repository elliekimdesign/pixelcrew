import type { Metadata } from "next";
import { inter, jetbrainsMono, instrumentSans } from "@/lib/fonts";
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
      <body className={`${inter.variable} ${jetbrainsMono.variable} ${instrumentSans.variable}`}>{children}</body>
    </html>
  );
}
