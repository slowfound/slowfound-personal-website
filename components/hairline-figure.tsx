"use client"

import * as React from "react"

import { type Locale, readout as translate } from "@/lib/i18n"
import { cn } from "@/lib/utils"

type Read = { textContent: string | null }
type Handle = { set: (value: number) => void; destroy: () => void }
type Figure = {
  name: string
  means: string
  range: [number, number, number]
  mount: (host: { stage: HTMLElement; svg: SVGSVGElement; read: Read }, value: number) => Handle
}
type Kernel = {
  inject: (root: Document) => void
  mk: (tag: string, attrs: Record<string, string>, parent: Element) => SVGSVGElement
}

declare global {
  interface Window {
    HL?: Kernel
    hairline?: (figure: Figure) => void
  }
}

function script(src: string, module: boolean) {
  return new Promise<void>((resolve, reject) => {
    const el = document.createElement("script")
    el.src = src
    if (module) el.type = "module"
    el.onload = () => resolve()
    el.onerror = () => reject(new Error(`hairline: could not load ${src}`))
    document.head.appendChild(el)
  })
}

// The kernel and each figure are plain scripts, served from public/hairline
// exactly as the skill wrote them. A figure announces itself by calling
// window.hairline once, so they load one at a time.
let queue: Promise<unknown> = Promise.resolve()
const figures = new Map<string, Promise<Figure>>()

function load(name: string) {
  const known = figures.get(name)
  if (known) return known
  const figure = queue
    .then(() => (window.HL ? undefined : script("/hairline/kernel.js", false)))
    .then(
      () =>
        new Promise<Figure>((resolve, reject) => {
          window.hairline = resolve
          script(`/hairline/${name}.js`, true).catch(reject)
        })
    )
  queue = figure.catch(() => undefined)
  figures.set(name, figure)
  return figure
}

/** What each figure shows, for screen readers, in Persian. The English comes from the figure. */
const MEANS_FA: Record<string, string> = {
  bracket: "هر فروش یک توکن را در توکن خریدار می‌سوزاند: در کل بازار، شانزده توکن در یکی جمع می‌شوند.",
  vandal: "ستونی از اتاق‌ها را خراب کن تا ویلا از نو حل شود: از پایین فرو می‌ریزد و هر رویه‌ای که باز مانده دیوار می‌گیرد.",
  tug: "دو جناح هزار جای وایت‌لیست را تقسیم کرده‌اند. دیوار را بکش تا چندتایی بدزدی، و ببین هر جای سمت خودت چطور ارزش از دست می‌دهد.",
}

/** The figure's palette, taken from the card it sits on. */
const PALETTE = {
  "--hairline-plate": "var(--card)",
  "--hairline-hi": "var(--clay)",
  "--hairline-edge": "color-mix(in oklab, var(--foreground) 45%, var(--card))",
  "--hairline-mid": "color-mix(in oklab, var(--foreground) 26%, var(--card))",
  "--hairline-lo": "color-mix(in oklab, var(--foreground) 12%, var(--card))",
} as React.CSSProperties

/**
 * One Hairline figure, with its read-out in the corner. Only `band`, the rows
 * of the 400 × 320 stage the drawing occupies, is shown.
 */
function HairlineFigure({
  name,
  locale,
  band = [55, 275],
  readout,
  className,
}: {
  name: string
  locale: Locale
  band?: [number, number]
  /** Where the read-out goes, when not in the figure's corner. */
  readout?: React.RefObject<HTMLElement | null>
  className?: string
}) {
  const stageRef = React.useRef<HTMLDivElement>(null)
  const ownRef = React.useRef<HTMLSpanElement>(null)
  const readRef = readout ?? ownRef
  // The figure reads back what it wrote, so it keeps its English; only the page is translated.
  const raw = React.useRef("")
  const localeRef = React.useRef(locale)
  const meansRef = React.useRef("")

  React.useEffect(() => {
    localeRef.current = locale
    if (readRef.current && raw.current) readRef.current.textContent = translate(raw.current, locale)
    if (meansRef.current)
      stageRef.current?.setAttribute(
        "aria-label",
        locale === "fa" ? (MEANS_FA[name] ?? meansRef.current) : meansRef.current
      )
  }, [locale, name, readRef])

  React.useEffect(() => {
    const stage = stageRef.current
    const out = readRef.current
    if (!stage || !out) return
    let handle: Handle | undefined
    let cancelled = false

    load(name).then((figure) => {
      const HL = window.HL
      if (cancelled || !HL) return
      HL.inject(document)
      stage.setAttribute("data-hairline", figure.name)
      meansRef.current = figure.means
      stage.setAttribute(
        "aria-label",
        localeRef.current === "fa" ? (MEANS_FA[name] ?? figure.means) : figure.means
      )
      const svg = HL.mk("svg", { viewBox: "0 0 400 320", "aria-hidden": "true" }, stage)
      const read: Read = {
        get textContent() {
          return raw.current
        },
        set textContent(value) {
          raw.current = value ?? ""
          out.textContent = translate(raw.current, localeRef.current)
        },
      }
      handle = figure.mount({ stage, svg, read }, figure.range[1])
      if (!raw.current) read.textContent = "rest"
    })

    return () => {
      cancelled = true
      handle?.destroy()
      stage.replaceChildren()
    }
  }, [name, readRef])

  return (
    <div
      className={cn("relative overflow-hidden", className)}
      style={{ aspectRatio: `400 / ${band[1] - band[0]}` }}
    >
      <div
        ref={stageRef}
        role="img"
        // Inline, because the kernel's own styles are unlayered and outrank utilities.
        style={{
          ...PALETTE,
          position: "absolute",
          left: 0,
          right: 0,
          top: `${(-band[0] / (band[1] - band[0])) * 100}%`,
        }}
      />
      {!readout && (
        <span
          ref={ownRef}
          aria-live="polite"
          className="absolute top-0 right-0 font-mono text-[0.6875rem] text-muted-foreground tabular-nums"
        />
      )}
    </div>
  )
}

export { HairlineFigure }
