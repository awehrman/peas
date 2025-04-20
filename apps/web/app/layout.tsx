import type { Metadata } from "next";
import { Source_Sans_3 } from "next/font/google";
import { Header } from "@peas/ui";
import "./globals.css";
import "./fonts.css";
import { ClientNavigation } from "./components/ClientNavigation";

const sourceSans = Source_Sans_3({
  subsets: ["latin"],
  variable: "--font-source-sans",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Peas",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${sourceSans.variable} font-sans`}>
        <ClientNavigation />
        <Header />
        <main>{children}</main>
      </body>
    </html>
  );
}
