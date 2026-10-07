import type { Text } from "@/lib/i18n"
import resume from "@/resume.json"

type Stat = { label: Text; value: string }

// Snapshot from slowfound-identity.md (as of 2026-08-10).
export const github = {
  handle: "slowfound",
  href: "https://github.com/slowfound",
  bio: { en: "experimenting…", fa: "در حال آزمایش…" } as Text,
  stats: [
    { label: { en: "stars", fa: "ستاره" }, value: "815" },
    { label: { en: "forks", fa: "فورک" }, value: "370" },
    { label: { en: "followers", fa: "دنبال‌کننده" }, value: "127" },
  ] as Stat[],
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

const SELF_HOSTING: Text = { en: "Self-hosting", fa: "میزبانی شخصی" }

export const youtube = {
  handle: "@slowfound",
  href: "https://www.youtube.com/@slowfound",
  stats: [
    { label: { en: "subscribers", fa: "مشترک" }, value: "1.53K" },
    { label: { en: "videos", fa: "ویدیو" }, value: "14" },
  ] as Stat[],
  featured: [
    {
      title: {
        en: "MetaTrader 5 Quant Server with Python",
        fa: "سرور کوانت متاتریدر ۵ با پایتون",
      },
      meta: { en: "Series", fa: "مجموعه" },
      href: "https://www.youtube.com/playlist?list=PLotEOI0Sz3OzdSp7qR6vHs8EYnmQwqWAF",
      project: "mt5",
    },
    {
      title: {
        en: "Supabase database backup & recovery",
        fa: "پشتیبان‌گیری و بازیابی دیتابیس Supabase",
      },
      meta: SELF_HOSTING,
      href: "https://www.youtube.com/@slowfound",
    },
    {
      title: { en: "One Traefik, multiple projects", fa: "یک Traefik، چند پروژه" },
      meta: SELF_HOSTING,
      href: "https://www.youtube.com/@slowfound",
    },
  ] as { title: Text; meta: Text; href: string; project?: string }[],
}

export type Project = {
  id: string
  /** Shown on the folder tab, so keep it short. */
  label: Text
  title: Text
  kind: Text
  summary: Text
  facts: Stat[]
  /** Where the work actually lives: a repo, a video, a store page. The last stop. */
  links: { label: Text; value: Text; href: string }[]
  /** A Hairline figure in public/hairline that shows the work instead of describing it. */
  figure?: string
  /** The last word, in mono, under everything else. */
  verdict?: Text
}

const STARS: Text = { en: "stars", fa: "ستاره" }
const FORKS: Text = { en: "forks", fa: "فورک" }
const CODE: Text = { en: "code", fa: "کد" }
const REPOSITORY: Text = { en: "repository", fa: "مخزن" }

export const projects: Project[] = [
  {
    id: "mt5",
    label: { en: "MT5 server", fa: "سرور MT5" },
    title: { en: "MetaTrader 5 quant server", fa: "سرور کوانت متاتریدر ۵" },
    kind: { en: "repository · video series", fa: "مخزن · مجموعه ویدیو" },
    summary: {
      en: "MetaTrader 5, a VNC desktop and a Flask API in one Docker container, on Linux, where MetaTrader was never meant to run.",
      fa: "متاتریدر ۵، یک دسکتاپ VNC و یک API با Flask، همه در یک کانتینر Docker، روی لینوکس؛ جایی که متاتریدر هیچ‌وقت قرار نبود اجرا شود.",
    },
    facts: [
      { label: STARS, value: "215" },
      { label: FORKS, value: "119" },
      { label: { en: "stars a month", fa: "ستاره در ماه" }, value: "10.2" },
    ],
    links: [
      {
        label: CODE,
        value: "slowfound/metatrader5-quant-server-python",
        href: "https://github.com/slowfound/metatrader5-quant-server-python",
      },
      {
        label: { en: "series", fa: "مجموعه" },
        value: {
          en: "MetaTrader 5 Quant Server with Python",
          fa: "سرور کوانت متاتریدر ۵ با پایتون",
        },
        href: "https://www.youtube.com/playlist?list=PLotEOI0Sz3OzdSp7qR6vHs8EYnmQwqWAF",
      },
    ],
  },
  {
    id: "ecommerce",
    label: { en: "Storefront", fa: "فروشگاه" },
    title: "next-prisma-tailwind-ecommerce",
    kind: REPOSITORY,
    summary: {
      en: "A storefront and its admin panel on Next.js, Prisma and Tailwind. Most of its stars come from template directories, not from me.",
      fa: "یک فروشگاه اینترنتی و پنل مدیریتش با Next.js، Prisma و Tailwind. بیشتر ستاره‌هایش را فهرست‌های قالب آورده‌اند، نه من.",
    },
    facts: [
      { label: STARS, value: "377" },
      { label: FORKS, value: "99" },
      { label: { en: "since", fa: "از سال" }, value: "2022" },
    ],
    links: [
      {
        label: CODE,
        value: "slowfound/next-prisma-tailwind-ecommerce",
        href: "https://github.com/slowfound/next-prisma-tailwind-ecommerce",
      },
    ],
  },
  {
    id: "supabase",
    label: { en: "Supabase backup", fa: "پشتیبان Supabase" },
    title: "supabase-database-backup",
    kind: REPOSITORY,
    summary: {
      en: "Backs up a Supabase database on a schedule with GitHub Actions, and restores it on the day you need it.",
      fa: "با GitHub Actions طبق برنامه از دیتابیس Supabase نسخهٔ پشتیبان می‌گیرد و روزی که لازمش داشتی، برش می‌گرداند.",
    },
    facts: [
      { label: STARS, value: "161" },
      { label: FORKS, value: "130" },
      { label: { en: "forks per star", fa: "فورک به ازای هر ستاره" }, value: "0.81" },
    ],
    links: [
      {
        label: CODE,
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
    label: { en: "Evolving token", fa: "توکن تکاملی" },
    title: { en: "A token that eats its own supply", fa: "توکنی که عرضهٔ خودش را می‌خورد" },
    kind: { en: "erc-721 · unpublished", fa: "erc-721 · منتشرنشده" },
    summary: {
      en: "One token per wallet. Buy a second and it is burnt, and its stats are added to the one you already hold, which comes back rarer. Every sale shrinks the collection. In theory, down to one.",
      fa: "هر کیف پول، یک توکن. دومی را بخری، می‌سوزد و ویژگی‌هایش به همانی اضافه می‌شود که داری، و آن کمیاب‌تر برمی‌گردد. هر فروش کلکسیون را کوچک‌تر می‌کند. در تئوری، تا یکی.",
    },
    facts: [
      { label: { en: "minted", fa: "ضرب‌شده" }, value: "1000" },
      { label: { en: "per wallet", fa: "هر کیف پول" }, value: "1" },
      { label: { en: "floor", fa: "کف" }, value: "1" },
    ],
    links: [
      {
        label: { en: "contract", fa: "قرارداد" },
        value: "Titanbornes/titanbornes-contracts",
        href: "https://github.com/Titanbornes/titanbornes-contracts",
      },
    ],
    figure: "bracket",
    verdict: {
      en: "built for an industry I now despise",
      fa: "ساخته‌شده برای صنعتی که حالا از آن بیزارم",
    },
  },
  {
    id: "villa",
    label: { en: "Villa solver", fa: "حل‌گر ویلا" },
    title: { en: "A villa that refuses to be wrong", fa: "ویلایی که زیر بار غلط بودن نمی‌رود" },
    kind: { en: "unreal engine 5 · unpublished", fa: "آنریل انجین ۵ · منتشرنشده" },
    summary: {
      en: "Wave Function Collapse with two buttons: add a tile, or delete one. Delete a kitchen and its neighbours re-solve until the building is legal again, walls and roof included.",
      fa: "الگوریتم Wave Function Collapse با دو دکمه: یک کاشی اضافه کن، یا یکی را پاک کن. آشپزخانه‌ای را پاک کنی، همسایه‌هایش از نو حل می‌شوند تا ساختمان دوباره درست شود، دیوار و سقفش هم.",
    },
    facts: [
      { label: { en: "buttons", fa: "دکمه" }, value: "2" },
      { label: { en: "invalid buildings", fa: "ساختمان نادرست" }, value: "0" },
      { label: { en: "web builds", fa: "نسخهٔ وب" }, value: "0" },
    ],
    links: [
      {
        label: CODE,
        value: "slowfound/ue5-wfc",
        href: "https://github.com/slowfound/ue5-wfc",
      },
    ],
    figure: "vandal",
    verdict: {
      en: "the solver worked. unreal engine was the price",
      fa: "حل‌گر کار کرد. بهایش آنریل انجین بود",
    },
  },
  {
    id: "factions",
    label: { en: "Faction bot", fa: "ربات جناح‌ها" },
    title: { en: "A server that stole from itself", fa: "سروری که از خودش دزدید" },
    kind: { en: "discord bot · unpublished", fa: "ربات دیسکورد · منتشرنشده" },
    summary: {
      en: "Two factions, 500 whitelist spots each, no changing sides. Some mini-games stole spots from the other faction, which helped the thief and made everyone's tokens cheaper, the thief's included.",
      fa: "دو جناح، هر کدام ۵۰۰ جای وایت‌لیست، بی‌امکان تغییر طرف. بعضی مینی‌گیم‌ها از جناح مقابل جا می‌دزدیدند؛ به سود دزد بود و توکن همه را ارزان‌تر می‌کرد، توکن خود دزد را هم.",
    },
    facts: [
      { label: { en: "factions", fa: "جناح" }, value: "2" },
      { label: { en: "spots", fa: "جا" }, value: "1000" },
      { label: { en: "defections", fa: "تغییر جناح" }, value: "0" },
    ],
    links: [
      {
        label: CODE,
        value: "Titanbornes/titanbornes-bot",
        href: "https://github.com/Titanbornes/titanbornes-bot",
      },
    ],
    figure: "tug",
    verdict: {
      en: "it worked. the factions started making memes about each other",
      fa: "جواب داد. جناح‌ها شروع کردند برای هم میم ساختن",
    },
  },
]

export const contact: { label: Text; value: string; href: string }[] = [
  {
    label: { en: "email", fa: "ایمیل" },
    value: "slowfounded@gmail.com",
    href: "mailto:slowfounded@gmail.com",
  },
  {
    label: { en: "linkedin", fa: "لینکدین" },
    value: "in/slowfound",
    href: "https://www.linkedin.com/in/slowfound",
  },
]

/** resume.json is English; this is the Persian it stands in for. */
const PERSIAN: Record<string, string> = {
  Diasa: "دیاسا",
  "MCI R&D Center": "مرکز تحقیق و توسعهٔ همراه اول",
  "Saman Insurance": "بیمه سامان",
  Bytogene: "بایتوژن",
  Farazin: "فرازین",
  "Product Manager": "مدیر محصول",
  "Software Engineer": "مهندس نرم‌افزار",
  "Technical Product Manager": "مدیر محصول فنی",
  "Software Engineer Intern": "کارآموز مهندسی نرم‌افزار",
}

const persian = (en: string): Text => ({ en, fa: PERSIAN[en] ?? en })

/** A year, or `null` for the present. */
function year(date: string) {
  return date === "Present" ? null : date.slice(-4)
}

export const work = resume.work.map((job) => {
  const start = year(job.start)!
  const end = year(job.end)
  return {
    company: persian(job.company),
    title: persian(job.title),
    href: job.href,
    logo: job.logoUrl,
    start,
    /** Left out when the job began and ended in the same year. */
    end: start === end ? undefined : end,
  }
})
