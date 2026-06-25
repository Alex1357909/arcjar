import type { Metadata } from "next";
import "./globals.css";
import { ThemeProvider } from "@/components/ThemeProvider";
import { WalletProvider } from "@/components/WalletProvider";

export const metadata: Metadata = {
  title: "ArcJar — USDC Tips on Arc Testnet",
  description:
    "Create your shareable tip page. Receive USDC instantly on Arc Testnet — no middlemen.",
  icons: {
    icon: "/arcjar-logo.png",
  },
  openGraph: {
    title: "ArcJar — USDC Tips on Arc Testnet",
    description:
      "Create your shareable tip page and receive USDC tips instantly.",
    url: "https://arcjar.vercel.app",
    siteName: "ArcJar",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "ArcJar — USDC Tips on Arc Testnet",
    description:
      "Create your shareable tip page and receive USDC tips instantly.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark h-full antialiased" suppressHydrationWarning>
      <body className="min-h-full flex flex-col">
        <ThemeProvider>
          <WalletProvider>{children}</WalletProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}

