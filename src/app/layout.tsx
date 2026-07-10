import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "MatchDeck",
  description: "A fun mobile web app for secret brainstorming, dramatic reveals, and matching ideas with friends.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
