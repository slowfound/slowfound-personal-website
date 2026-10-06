import resume from "@/resume.json"

// Snapshot from slowfound-identity.md (as of 2026-08-10).
export const github = {
  handle: "slowfound",
  href: "https://github.com/slowfound",
  bio: "experimenting…",
  stats: [
    { label: "stars", value: "815" },
    { label: "forks", value: "370" },
    { label: "followers", value: "127" },
  ],
  repos: [
    {
      name: "next-prisma-tailwind-ecommerce",
      stars: 377,
      href: "https://github.com/slowfound/next-prisma-tailwind-ecommerce",
      project: "ecommerce",
    },
    {
      name: "metatrader5-quant-server-python",
      stars: 215,
      href: "https://github.com/slowfound/metatrader5-quant-server-python",
      project: "mt5",
    },
    {
      name: "supabase-database-backup",
      stars: 161,
      href: "https://github.com/slowfound/supabase-database-backup",
      project: "supabase",
    },
  ],
}

export const youtube = {
  handle: "@slowfound",
  href: "https://www.youtube.com/@slowfound",
  stats: [
    { label: "subscribers", value: "1.53K" },
    { label: "videos", value: "14" },
  ],
  featured: [
    {
      title: "MetaTrader 5 Quant Server with Python",
      meta: "Series",
      href: "https://www.youtube.com/playlist?list=PLotEOI0Sz3OzdSp7qR6vHs8EYnmQwqWAF",
      project: "mt5",
    },
    {
      title: "Supabase database backup & recovery",
      meta: "Self-hosting",
      href: "https://www.youtube.com/@slowfound",
    },
    {
      title: "One Traefik, multiple projects",
      meta: "Self-hosting",
      href: "https://www.youtube.com/@slowfound",
    },
  ],
}

export type Project = {
  id: string
  /** Shown on the folder tab, so keep it short. */
  label: string
  title: string
  kind: string
  summary: string
  facts: { label: string; value: string }[]
  /** Where the work actually lives: a repo, a video, a store page. The last stop. */
  links: { label: string; value: string; href: string }[]
  /** A Hairline figure in public/hairline that shows the work instead of describing it. */
  figure?: string
  /** The last word, in mono, under everything else. */
  verdict?: string
}

export const projects: Project[] = [
  {
    id: "mt5",
    label: "MT5 server",
    title: "MetaTrader 5 quant server",
    kind: "repository · video series",
    summary:
      "MetaTrader 5, a VNC desktop and a Flask API in one Docker container, on Linux, where MetaTrader was never meant to run.",
    facts: [
      { label: "stars", value: "215" },
      { label: "forks", value: "119" },
      { label: "stars a month", value: "10.2" },
    ],
    links: [
      {
        label: "code",
        value: "slowfound/metatrader5-quant-server-python",
        href: "https://github.com/slowfound/metatrader5-quant-server-python",
      },
      {
        label: "series",
        value: "MetaTrader 5 Quant Server with Python",
        href: "https://www.youtube.com/playlist?list=PLotEOI0Sz3OzdSp7qR6vHs8EYnmQwqWAF",
      },
    ],
  },
  {
    id: "ecommerce",
    label: "Storefront",
    title: "next-prisma-tailwind-ecommerce",
    kind: "repository",
    summary:
      "A storefront and its admin panel on Next.js, Prisma and Tailwind. Most of its stars come from template directories, not from me.",
    facts: [
      { label: "stars", value: "377" },
      { label: "forks", value: "99" },
      { label: "since", value: "2022" },
    ],
    links: [
      {
        label: "code",
        value: "slowfound/next-prisma-tailwind-ecommerce",
        href: "https://github.com/slowfound/next-prisma-tailwind-ecommerce",
      },
    ],
  },
  {
    id: "supabase",
    label: "Supabase backup",
    title: "supabase-database-backup",
    kind: "repository",
    summary:
      "Backs up a Supabase database on a schedule with GitHub Actions, and restores it on the day you need it.",
    facts: [
      { label: "stars", value: "161" },
      { label: "forks", value: "130" },
      { label: "forks per star", value: "0.81" },
    ],
    links: [
      {
        label: "code",
        value: "slowfound/supabase-database-backup",
        href: "https://github.com/slowfound/supabase-database-backup",
      },
    ],
  },
]

/** Built, never shipped. Listed under the Projects tab. */
export const unpublished: Project[] = [
  {
    id: "devour",
    label: "Evolving token",
    title: "A token that eats its own supply",
    kind: "erc-721 · unpublished",
    summary:
      "One token per wallet. Buy a second and it is burnt, and its stats are added to the one you already hold, which comes back rarer. Every sale shrinks the collection. In theory, down to one.",
    facts: [
      { label: "minted", value: "1000" },
      { label: "per wallet", value: "1" },
      { label: "floor", value: "1" },
    ],
    links: [
      {
        label: "contract",
        value: "Titanbornes/titanbornes-contracts",
        href: "https://github.com/Titanbornes/titanbornes-contracts",
      },
    ],
    figure: "bracket",
    verdict: "built for an industry I now despise",
  },
  {
    id: "villa",
    label: "Villa solver",
    title: "A villa that refuses to be wrong",
    kind: "unreal engine 5 · unpublished",
    summary:
      "Wave Function Collapse with two buttons: add a tile, or delete one. Delete a kitchen and its neighbours re-solve until the building is legal again, walls and roof included.",
    facts: [
      { label: "buttons", value: "2" },
      { label: "invalid buildings", value: "0" },
      { label: "web builds", value: "0" },
    ],
    links: [
      {
        label: "code",
        value: "slowfound/ue5-wfc",
        href: "https://github.com/slowfound/ue5-wfc",
      },
    ],
    figure: "vandal",
    verdict: "the solver worked. unreal engine was the price",
  },
  {
    id: "factions",
    label: "Faction bot",
    title: "A server that stole from itself",
    kind: "discord bot · unpublished",
    summary:
      "Two factions, 500 whitelist spots each, no changing sides. Some mini-games stole spots from the other faction, which helped the thief and made everyone's tokens cheaper, the thief's included.",
    facts: [
      { label: "factions", value: "2" },
      { label: "spots", value: "1000" },
      { label: "defections", value: "0" },
    ],
    links: [
      {
        label: "code",
        value: "Titanbornes/titanbornes-bot",
        href: "https://github.com/Titanbornes/titanbornes-bot",
      },
    ],
    figure: "tug",
    verdict: "it worked. the factions started making memes about each other",
  },
]

export const contact = [
  {
    label: "email",
    value: "slowfounded@gmail.com",
    href: "mailto:slowfounded@gmail.com",
  },
  {
    label: "linkedin",
    value: "in/slowfound",
    href: "https://www.linkedin.com/in/slowfound",
  },
]

function year(date: string) {
  return date === "Present" ? "Now" : date.slice(-4)
}

function span(start: string, end: string) {
  const a = year(start)
  const b = year(end)
  return a === b ? a : `${a} – ${b}`
}

export const work = resume.work.map((job) => ({
  company: job.company,
  title: job.title,
  href: job.href,
  logo: job.logoUrl,
  period: span(job.start, job.end),
}))
