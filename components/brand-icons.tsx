import { cn } from "@/lib/utils"

/** GitHub's mark, in the text colour, as GitHub ships it. */
function GitHubMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 16 16" aria-hidden className={cn("fill-current", className)}>
      <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z" />
    </svg>
  )
}

/** YouTube's play button, in its own red. */
function YouTubeMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 28 20" aria-hidden className={className}>
      <path
        fill="#FF0033"
        d="M27.4 3.1A3.5 3.5 0 0 0 25 .6C22.8 0 14 0 14 0S5.2 0 3 .6A3.5 3.5 0 0 0 .6 3.1C0 5.3 0 10 0 10s0 4.7.6 6.9A3.5 3.5 0 0 0 3 19.4c2.2.6 11 .6 11 .6s8.8 0 11-.6a3.5 3.5 0 0 0 2.4-2.5c.6-2.2.6-6.9.6-6.9s0-4.7-.6-6.9z"
      />
      <path fill="#fff" d="M11.2 14.3 18.5 10l-7.3-4.3z" />
    </svg>
  )
}

type Brand = "github" | "youtube"

function brandOf(href: string): Brand | null {
  if (/^https?:\/\/(www\.)?github\.com\//.test(href)) return "github"
  if (/^https?:\/\/(www\.)?(youtube\.com|youtu\.be)\//.test(href)) return "youtube"
  return null
}

/** The mark of the site a link leads to, sized to sit in a line of text. */
function BrandMark({ brand, className }: { brand: Brand | null; className?: string }) {
  if (brand === "github") return <GitHubMark className={cn("h-[0.95em] w-[0.95em]", className)} />
  if (brand === "youtube") return <YouTubeMark className={cn("h-[0.8em] w-[1.12em]", className)} />
  return null
}

export { BrandMark, brandOf, type Brand }
