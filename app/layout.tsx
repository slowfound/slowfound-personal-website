import type { Metadata } from "next"
import { DM_Sans, Geist_Mono } from "next/font/google"

import "./globals.css"
import { cn } from "@/lib/utils";

// Stand-in for Anthropic Sans, which is not publicly licensed. globals.css
// lists "Anthropic Sans" first, so it takes over wherever it is available.
const fontSans = DM_Sans({subsets:['latin'],variable:'--font-fallback-sans'})

const fontMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-geist-mono",
})

export const metadata: Metadata = {
  title: "slowfound",
  description: "GitHub, YouTube, work and contact details of slowfound.",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html
      lang="en"
      className={cn("antialiased", fontMono.variable, "font-sans", fontSans.variable)}
    >
      <body>{children}</body>
    </html>
  )
}
