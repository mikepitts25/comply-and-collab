import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Comply & Collab",
  description:
    "Collaborative cyber compliance: RMF/ATO, ACAS & STIG findings, POA&Ms, and mitigation tracking.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
