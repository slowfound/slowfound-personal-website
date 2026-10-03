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
    },
    {
      name: "metatrader5-quant-server-python",
      stars: 215,
      href: "https://github.com/slowfound/metatrader5-quant-server-python",
    },
    {
      name: "supabase-database-backup",
      stars: 161,
      href: "https://github.com/slowfound/supabase-database-backup",
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
  period: span(job.start, job.end),
}))

export const education = resume.education.map((school) => ({
  school: school.school,
  degree: school.degree,
  href: school.href,
  period: span(school.start, school.end),
}))
