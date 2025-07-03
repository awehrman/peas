import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "@peas/tailwind";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Peas Playground",
  description: "A playground for experimenting with Peas functionality",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>{children}</body>
    </html>
  );
} 