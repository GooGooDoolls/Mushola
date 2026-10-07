import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Mushola Financial",
  description: "Sistem pencatatan keuangan mushola"
};

export default function RootLayout({
  children
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="id">
      <body>{children}</body>
    </html>
  );
}
