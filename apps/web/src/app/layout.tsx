import type { Metadata } from "next";
import { Source_Sans_3 } from "next/font/google";
import "./globals.css";
import "@peas/ui/styles.css";
import "./fonts.css";
import ClientHeader from "../components/client/header";
import ClientNavigation from "..g/components/client/navigation";
import { ThemeProvider } from "@peas/ui";

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
        <ThemeProvider>
          <div className="flex h-screen">
            <ClientNavigation />
            <div className="flex-1 flex flex-col h-screen">
              <ClientHeader />
              <main className="flex-1 overflow-auto p-8">{children}</main>
            </div>
          </div>
        </ThemeProvider>
      </body>
    </html>
  );
}
