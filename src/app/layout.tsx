import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "LLM Copy Demo",
  description: "Constrained LLM copy generation with validation, retry, and fallback.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
