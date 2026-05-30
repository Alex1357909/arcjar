import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ArcJar",
  description:
    "Send USDC tips on Arc Testnet — create your ArcJar",
  icons: {
    icon: "/arcjar-logo.png",
  },
  openGraph: {
    title: "ArcJar",
    description:
      "Send USDC tips on Arc Testnet — create your ArcJar",
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
