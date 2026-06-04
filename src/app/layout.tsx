import type { Metadata, Viewport } from "next";
import { JetBrains_Mono, Outfit } from "next/font/google";
import "./globals.css";
import { ServiceWorkerRegistration } from "./service-worker-registration";

const fontSans = Outfit({
  subsets: ["latin"],
  variable: "--font-sans",
});

const jetbrains = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://kelem.edu"),
  title: {
    default: "Kelem — Teacher Dashboard",
    template: "%s — Kelem",
  },
  description:
    "Academic portal for teachers to manage classes, track student performance, communicate with parents, and oversee attendance at Kelem.",
  manifest: "/manifest.webmanifest",
  icons: {
    icon: "/icon.svg",
    apple: [
      { url: "/pwa-192x192.png", sizes: "192x192", type: "image/png" },
      { url: "/pwa-512x512.png", sizes: "512x512", type: "image/png" },
    ],
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
    statusBarStyle: "default",
  },
  formatDetection: {
    telephone: false,
  },
};

export const viewport: Viewport = {
  themeColor: "#1A237E",
  colorScheme: "light",
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
        <ServiceWorkerRegistration />
      </body>
    </html>
  );
}
