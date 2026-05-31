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
    default: "Ethio-Global Academy — Teacher Dashboard",
    template: "%s — Ethio-Global Academy",
  },
  description:
    "Academic portal for teachers to manage classes, track student performance, communicate with parents, and oversee attendance at Ethio-Global Academy.",
  icons: {
    icon: "/icon.svg",
  },
  openGraph: {
    title: "Ethio-Global Academy — Teacher Dashboard",
    description:
      "Academic portal for teachers to manage classes, track student performance, communicate with parents, and oversee attendance.",
    url: "https://ethioglobalacademy.com",
    siteName: "Ethio-Global Academy",
    locale: "en_US",
    type: "website",
  },
  applicationName: "Ethio-Global Academy",
  appleWebApp: {
    title: "EGA Teacher",
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
