import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "eMenu API Dashboard",
  description: "App-to-App API Flow Tester",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
