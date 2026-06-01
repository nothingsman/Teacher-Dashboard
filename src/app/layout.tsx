import type { Metadata } from "next";
import { JetBrains_Mono, Outfit } from "next/font/google";
import "./globals.css";

const fontSans = Outfit({
  subsets: ["latin"],
  variable: "--font-sans",
});

const jetbrains = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
});

export const metadata: Metadata = {
  title: {
    default: "Kelem — Teacher Dashboard",
    template: "%s — Kelem",
  },
  description:
    "Academic portal for teachers to manage classes, track student performance, communicate with parents, and oversee attendance at Kelem.",
  icons: {
    icon: "/icon.svg",
  },
  openGraph: {
    title: "Kelem — Teacher Dashboard",
    description:
      "Academic portal for teachers to manage classes, track student performance, communicate with parents, and oversee attendance.",
    url: "https://kelem.edu",
    siteName: "Kelem",
    locale: "en_US",
    type: "website",
  },
  applicationName: "Kelem",
  appleWebApp: {
    title: "Kelem Teacher",
    capable: true,
    statusBarStyle: "black-translucent",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${fontSans.variable} ${jetbrains.variable}`} suppressHydrationWarning>
      <body className="antialiased min-h-screen bg-slate-50 font-sans text-slate-900" suppressHydrationWarning>
        {children}
      </body>
    </html>
  );
}
