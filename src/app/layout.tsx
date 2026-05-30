import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Tip Jar — Send USDC on Arc Testnet",
  description:
    "Support your favorite creator by sending USDC tips on Arc Testnet. Powered by Circle App Kit SDK.",
  openGraph: {
    title: "Tip Jar — Send USDC on Arc Testnet",
    description:
      "Support your favorite creator by sending USDC tips on Arc Testnet.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark h-full antialiased">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
