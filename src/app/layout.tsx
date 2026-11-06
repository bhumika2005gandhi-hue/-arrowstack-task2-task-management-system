import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "TaskFlow · Arrowstack Task 2 — AS-2026-7346",
  description:
    "Full-stack task management system built with Next.js 16, Prisma + SQLite, Tailwind CSS, and shadcn/ui. Arrowstack Batch 2026 Task 2 — Ref: AS-2026-7346 · Bhumika Gandhi.",
  keywords: ["TaskFlow", "task management", "Next.js", "Prisma", "Arrowstack", "Bhumika Gandhi"],
  authors: [{ name: "Bhumika Gandhi" }],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}
      >
        {children}
        <Toaster />
      </body>
    </html>
  );
}
