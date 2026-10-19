import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Mesa | Menú digital",
  description: "Menú digital y comandas para restaurantes.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es" suppressHydrationWarning>
      <body>{children}</body>
    </html>
  );
}
