import type { Metadata } from "next";
import { Source_Sans_3 } from "next/font/google";
import "./globals.css";
import "@peas/ui/styles.css";
import "./fonts.css";
import { ClientHeader } from "./components/client/header";

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
        <ClientHeader />
        <main className="m-10">{children}</main>
      </body>
    </html>
  );
}
