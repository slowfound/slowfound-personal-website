export type Locale = "en" | "fa"

/** Copy that reads differently per language. A plain string reads the same in both. */
export type Text = string | Record<Locale, string>

export function tr(text: Text, locale: Locale) {
  return typeof text === "string" ? text : text[locale]
}

const PERSIAN_DIGITS = "۰۱۲۳۴۵۶۷۸۹"

/** Figures in the reader's digits: 1.53K reads ۱٫۵۳ هزار in Persian. */
export function num(value: string | number, locale: Locale) {
  const text = String(value)
  if (locale === "en") return text
  return text
    .replace(/(\d)K\b/g, "$1 هزار")
    .replace(/(\d)\.(\d)/g, "$1٫$2")
    .replace(/\d/g, (d) => PERSIAN_DIGITS[Number(d)])
}

export const dir = (locale: Locale) => (locale === "fa" ? "rtl" : "ltr")

/** Copy that belongs to the page itself rather than to anything on it. */
export const ui = {
  sections: { en: "Sections", fa: "بخش‌ها" },
  backTo: { en: "Back to", fa: "بازگشت به" },
  now: { en: "now", fa: "اکنون" },
  verdict: { en: "verdict", fa: "حکم" },
  theme: {
    toDark: { en: "Switch to dark mode", fa: "رفتن به حالت تیره" },
    toLight: { en: "Switch to light mode", fa: "رفتن به حالت روشن" },
  },
  language: { en: "نسخهٔ فارسی", fa: "English version" },
  labels: {
    projects: { en: "built, never shipped", fa: "ساخته شد، هرگز منتشر نشد" },
    github: { en: "open source", fa: "متن‌باز" },
    youtube: { en: "channel", fa: "کانال" },
    contact: { en: "get in touch", fa: "راه ارتباط" },
  },
} satisfies Record<string, Text | Record<string, Text>>

/**
 * The Hairline figures write their read-outs in English. These turn the words
 * into Persian on the way to the page; the figures still read their own text.
 */
const READOUT_WORDS: Record<string, string> = {
  rest: "ساکن",
  supply: "عرضه",
  rooms: "اتاق",
  walls: "دیوار",
}

export function readout(text: string, locale: Locale) {
  if (locale === "en") return text
  return num(
    text.replace(/[a-z]+/g, (word) => READOUT_WORDS[word] ?? word),
    locale
  )
}

/** Lives in the document before React does, so the first paint is already right. */
export const PREFERENCES_SCRIPT = `(function(){
var d=document.documentElement,s={};
try{s.theme=localStorage.getItem("theme");s.locale=localStorage.getItem("locale")}catch(e){}
var theme=s.theme==="dark"||s.theme==="light"?s.theme:matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light";
var locale=s.locale==="fa"||s.locale==="en"?s.locale:/^fa\\b/i.test(navigator.language||"")?"fa":"en";
d.dataset.theme=theme;d.lang=locale;d.dir=locale==="fa"?"rtl":"ltr";
})()`
