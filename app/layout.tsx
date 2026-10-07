import type { Metadata } from "next"
import { DM_Sans, Geist_Mono } from "next/font/google"
import localFont from "next/font/local"

import "./globals.css"
import { PREFERENCES_SCRIPT } from "@/lib/i18n"
import { cn } from "@/lib/utils";

// Stand-in for Anthropic Sans, which is not publicly licensed. globals.css
// lists "Anthropic Sans" first, so it takes over wherever it is available.
const fontSans = DM_Sans({subsets:['latin'],variable:'--font-fallback-sans'})

const fontMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-geist-mono",
})

// Persian script only: Latin text never reaches it and keeps its own faces.
// No metric-matched fallback either, since that would claim Latin too.
const fontPersian = localFont({
  src: "../public/Vazirmatn/Vazirmatn-VariableFont_wght.ttf",
  variable: "--font-persian",
  weight: "100 900",
  adjustFontFallback: false,
  declarations: [
    {
      prop: "unicode-range",
      value: "U+0600-06FF, U+0750-077F, U+200C-200F, U+FB50-FDFF, U+FE70-FEFF",
    },
  ],
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
    // The script below sets the theme, language and direction before the
    // first paint, so the DOM is allowed to differ from what was rendered.
    <html
      lang="en"
      dir="ltr"
      data-theme="light"
      suppressHydrationWarning
      className={cn("antialiased", fontMono.variable, "font-sans", fontSans.variable, fontPersian.variable)}
    >
      <head>
        <script
          type={typeof window === "undefined" ? "text/javascript" : "text/plain"}
          suppressHydrationWarning
          dangerouslySetInnerHTML={{ __html: PREFERENCES_SCRIPT }}
        />
      </head>
      <body>{children}</body>
    </html>
  )
}
