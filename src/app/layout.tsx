import type { Metadata, Viewport } from "next";
import { Fraunces, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin", "latin-ext"],
  display: "swap",
  axes: ["SOFT", "WONK", "opsz"],
});

const jetbrains = JetBrains_Mono({
  variable: "--font-jetbrains",
  subsets: ["latin", "latin-ext"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "PayMe — kancelářská účetní knížka",
  description:
    "Kamarádská účetní knížka pro jednu polici v kanceláři. Ťukni, vezmi, vyrovnej se na konci měsíce.",
  applicationName: "PayMe",
};

export const viewport: Viewport = {
  themeColor: "#f1e9d3",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="cs"
      className={`${fraunces.variable} ${jetbrains.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
