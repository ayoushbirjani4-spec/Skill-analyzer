import type { Metadata } from "next";
import type { ReactNode } from "react";
import { DM_Sans, Syne } from "next/font/google";
import Link from "next/link";
import ThemeToggle from "@/components/theme-toggle";
import "./globals.css";

const headingFont = Syne({
  variable: "--font-heading",
  subsets: ["latin"]
});

const bodyFont = DM_Sans({
  variable: "--font-body",
  subsets: ["latin"]
});

export const metadata: Metadata = {
  title: "SkillAnalyzer",
  description: "AI-powered skill gap analysis"
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${headingFont.variable} ${bodyFont.variable} antialiased`}>
        <nav className="sticky top-0 z-50 border-b border-border bg-background/90 backdrop-blur">
          <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
            <Link href="/" className="font-heading font-bold text-accent tracking-wide text-lg">SkillAnalyzer</Link>
            <div className="flex items-center gap-4 text-sm">
              <Link href="/" className="text-foreground hover:text-accent transition-colors">New Analysis</Link>
              <Link href="/chat" className="text-muted hover:text-foreground transition-colors">Chat</Link>
              <Link href="/#roles" className="text-muted hover:text-foreground transition-colors">Roles</Link>
              <ThemeToggle />
            </div>
          </div>
        </nav>
        {children}
      </body>
    </html>
  );
}
