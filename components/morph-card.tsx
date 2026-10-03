"use client"

import * as React from "react"

import { Dither } from "@/components/dither"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { education, github, work, youtube } from "@/lib/profile"
import { Spring, type SpringConfig } from "@/lib/spring"
import { cn } from "@/lib/utils"

type LayerId = "github" | "youtube" | "career" | "work" | "edu"
type Tab = "work" | "edu"

type Scene = {
  /** Content layers, stacked top to bottom. Shared layers persist across scenes. */
  layers: LayerId[]
  width: number
  /** Card lightness (oklch L) per theme. */
  tone: { light: number; dark: number }
  /** How long the scene is held, in seconds. */
  hold: number
  /** Where the accent element lives in this scene. */
  anchor: string
  tab?: Tab
}

const SCENES: Scene[] = [
  {
    layers: ["github"],
    width: 360,
    tone: { light: 0.19, dark: 0.29 },
    hold: 3.4,
    anchor: "github",
  },
  {
    layers: ["youtube"],
    width: 344,
    tone: { light: 0.925, dark: 0.235 },
    hold: 3.2,
    anchor: "youtube",
  },
  {
    layers: ["career", "work"],
    width: 404,
    tone: { light: 1, dark: 0.205 },
    hold: 4.6,
    anchor: "work",
    tab: "work",
  },
  {
    layers: ["career", "edu"],
    width: 404,
    tone: { light: 1, dark: 0.205 },
    hold: 2.8,
    anchor: "edu",
    tab: "edu",
  },
]

const LAYER_IDS: LayerId[] = ["github", "youtube", "career", "work", "edu"]

const MORPH: SpringConfig = { duration: 0.72, bounce: 0.16 }
const EDGE_LEAD: SpringConfig = { duration: 0.5, bounce: 0.16 }
const EDGE_TRAIL: SpringConfig = { duration: 0.86, bounce: 0.1 }
const ENTER: SpringConfig = { duration: 0.55, bounce: 0 }
const EXIT: SpringConfig = { duration: 0.22, bounce: 0 }
const SNAP: SpringConfig = { duration: 0.0001, bounce: 0 }

/** Content exits first; the container morphs once it is (nearly) gone. */
const EXIT_LEAD = 0.18
/** New content enters after the container has started morphing. */
const ENTER_DELAY = 0.14
const BLUR = 6
const SHIFT = 5
const SEED = 56
/** One corner radius for every scene. */
const RADIUS = 20
const GUTTER = 32

/** `roundness` is the corner radius as a fraction of half the shorter side. */
type Box = { l: number; t: number; r: number; b: number; roundness: number }
type Geometry = { width: number; height: number; tops: Record<string, number>; accent: Box }

function MorphCard() {
  const cardRef = React.useRef<HTMLDivElement>(null)
  const accentRef = React.useRef<HTMLDivElement>(null)
  const pausedRef = React.useRef(false)

  React.useLayoutEffect(() => {
    const card = cardRef.current
    const accent = accentRef.current
    if (!card || !accent) return

    const layerEls = {} as Record<LayerId, HTMLElement>
    for (const el of card.querySelectorAll<HTMLElement>("[data-layer]")) {
      layerEls[el.dataset.layer as LayerId] = el
    }
    const tabEls = [...card.querySelectorAll<HTMLElement>("[data-tab]")]
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)")
    const isDark = () => document.documentElement.classList.contains("dark")
    const now = () => performance.now() / 1000
    const motion = (config: SpringConfig) => (reducedMotion.matches ? SNAP : config)

    function measure(): Geometry[] {
      const available = document.documentElement.clientWidth - GUTTER
      return SCENES.map((scene) => {
        const width = Math.min(scene.width, available)
        const tops: Record<string, number> = {}
        let height = 0
        for (const id of scene.layers) {
          const el = layerEls[id]
          el.style.width = `${width}px`
          el.style.top = `${height}px`
          tops[id] = height
          height += el.offsetHeight
        }

        const anchor = card!.querySelector<HTMLElement>(`[data-anchor="${scene.anchor}"]`)!
        const layer = anchor.closest<HTMLElement>("[data-layer]")!
        const a = anchor.getBoundingClientRect()
        const p = layer.getBoundingClientRect()
        const top = tops[layer.dataset.layer!] + (a.top - p.top)
        const left = a.left - p.left
        return {
          width,
          height,
          tops,
          accent: {
            l: left,
            t: top,
            r: left + a.width,
            b: top + a.height,
            roundness: Math.min(
              1,
              (parseFloat(getComputedStyle(anchor).borderTopLeftRadius) || 0) /
                (Math.min(a.width, a.height) / 2 || 1)
            ),
          },
        }
      })
    }

    let geometry = measure()
    let index = 0
    let current: Scene | null = null

    const width = new Spring(SEED)
    const height = new Spring(SEED)
    const radius = new Spring(SEED / 2)
    const lightness = new Spring(isDark() ? SCENES[0].tone.dark : SCENES[0].tone.light)
    const edges = {
      l: new Spring(SEED / 2 - 3),
      r: new Spring(SEED / 2 + 3),
      t: new Spring(SEED / 2 - 3),
      b: new Spring(SEED / 2 + 3),
    }
    const accentRoundness = new Spring(1)
    const layers = Object.fromEntries(
      LAYER_IDS.map((id) => [id, { progress: new Spring(0), direction: 1 }])
    ) as Record<LayerId, { progress: Spring; direction: number }>
    let pendingTab: { at: number; tab: Tab } | null = null

    function moveAccent(box: Box, t: number) {
      // Each edge rides its own spring: the edge facing the direction of travel
      // leads, the other trails, so the indicator stretches and catches up.
      const right = box.l + box.r > edges.l.target + edges.r.target
      const down = box.t + box.b > edges.t.target + edges.b.target
      edges.l.to(box.l, t, motion(right ? EDGE_TRAIL : EDGE_LEAD))
      edges.r.to(box.r, t, motion(right ? EDGE_LEAD : EDGE_TRAIL))
      edges.t.to(box.t, t, motion(down ? EDGE_TRAIL : EDGE_LEAD))
      edges.b.to(box.b, t, motion(down ? EDGE_LEAD : EDGE_TRAIL))
      accentRoundness.to(box.roundness, t, motion(MORPH))
    }

    function morphTo(scene: Scene, g: Geometry, t: number) {
      width.to(g.width, t, motion(MORPH))
      height.to(g.height, t, motion(MORPH))
      radius.to(RADIUS, t, motion(MORPH))
      lightness.to(isDark() ? scene.tone.dark : scene.tone.light, t, motion(MORPH))
      moveAccent(g.accent, t)
    }

    function show(next: number, t: number) {
      const scene = SCENES[next]
      const previous = current?.layers ?? []
      const morphAt = current ? t + EXIT_LEAD : t

      for (const id of previous) {
        if (scene.layers.includes(id)) continue
        layers[id].direction = -1
        layers[id].progress.to(0, t, EXIT)
      }
      for (const id of scene.layers) {
        if (previous.includes(id)) continue
        layers[id].direction = 1
        layers[id].progress.to(1, morphAt + ENTER_DELAY, ENTER)
      }

      morphTo(scene, geometry[next], morphAt)
      if (scene.tab) pendingTab = { at: morphAt, tab: scene.tab }
      current = scene
    }

    function render(t: number) {
      card!.style.width = `${width.get(t)}px`
      card!.style.height = `${height.get(t)}px`
      card!.style.borderRadius = `${Math.max(0, radius.get(t))}px`
      card!.style.backgroundColor = `oklch(${lightness.get(t)} 0 0)`

      const l = edges.l.get(t)
      const top = edges.t.get(t)
      accent!.style.transform = `translate(${l}px, ${top}px)`
      const accentWidth = Math.max(0, edges.r.get(t) - l)
      const accentHeight = Math.max(0, edges.b.get(t) - top)
      // Radius follows the live size, so the shape stays proportionally rounded
      // while its edges stretch, instead of flattening into a hard rectangle.
      const roundness = Math.min(1, Math.max(0, accentRoundness.get(t)))
      accent!.style.width = `${accentWidth}px`
      accent!.style.height = `${accentHeight}px`
      accent!.style.borderRadius = `${(roundness * Math.min(accentWidth, accentHeight)) / 2}px`

      for (const id of LAYER_IDS) {
        const el = layerEls[id]
        const { progress, direction } = layers[id]
        const p = Math.min(1, Math.max(0, progress.get(t)))
        const rest = 1 - p
        const visible = p > 0.001 || progress.target > 0
        el.style.opacity = `${p}`
        el.style.visibility = visible ? "visible" : "hidden"
        el.inert = progress.target === 0
        if (reducedMotion.matches) continue
        el.style.filter = rest > 0.002 ? `blur(${rest * BLUR}px)` : ""
        el.style.transform = `translateY(${rest * SHIFT * direction}px)`
      }

      if (pendingTab && t >= pendingTab.at) {
        for (const el of tabEls) {
          el.dataset.active = String(el.dataset.tab === pendingTab.tab)
        }
        pendingTab = null
      }
    }

    // Start as a small seed, then grow into the first scene.
    const start = now()
    show(0, start + 0.12)
    render(start)

    // The hold clock only advances while the card is not hovered/focused,
    // and never jumps forward after the tab was in the background.
    let last = start
    let held = 0
    let frame = requestAnimationFrame(function tick(ms) {
      const t = ms / 1000
      if (!pausedRef.current) held += Math.min(t - last, 0.1)
      last = t
      if (held >= SCENES[index].hold) {
        held = 0
        index = (index + 1) % SCENES.length
        show(index, t)
      }
      render(t)
      frame = requestAnimationFrame(tick)
    })

    let queued = 0
    function remeasure() {
      cancelAnimationFrame(queued)
      queued = requestAnimationFrame(() => {
        geometry = measure()
        if (current) morphTo(current, geometry[index], now())
      })
    }

    const resizeObserver = new ResizeObserver(remeasure)
    for (const el of Object.values(layerEls)) resizeObserver.observe(el)
    window.addEventListener("resize", remeasure)

    const themeObserver = new MutationObserver(() => {
      if (current) lightness.to(isDark() ? current.tone.dark : current.tone.light, now(), motion(MORPH))
    })
    themeObserver.observe(document.documentElement, { attributeFilter: ["class"] })

    return () => {
      cancelAnimationFrame(frame)
      cancelAnimationFrame(queued)
      resizeObserver.disconnect()
      themeObserver.disconnect()
      window.removeEventListener("resize", remeasure)
    }
  }, [])

  const pause = (paused: boolean) => () => {
    pausedRef.current = paused
  }

  return (
    <Card
      ref={cardRef}
      onPointerEnter={pause(true)}
      onPointerLeave={pause(false)}
      onFocus={pause(true)}
      onBlur={pause(false)}
      className="relative block shrink-0 gap-0 p-0 [--card-spacing:--spacing(6)]"
      style={{ width: SEED, height: SEED, borderRadius: SEED / 2 }}
    >
      <Dither className="absolute top-0 right-0 size-28 opacity-[0.07]" />
      <div
        ref={accentRef}
        aria-hidden
        className="absolute top-0 left-0 bg-[oklch(0.64_0.21_29)]"
      />

      <Layer id="github" className="dark text-card-foreground">
        <CardHeader>
          <Label anchor="github" anchorClassName="size-1.5 rounded-full">
            GitHub
          </Label>
          <CardTitle className="text-lg">
            <Link href={github.href}>{github.handle}</Link>
          </CardTitle>
          <CardDescription>{github.bio}</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-5">
          <Stats items={github.stats} />
          <ul className="flex flex-col gap-2">
            {github.repos.map((repo) => (
              <li key={repo.name} className="flex items-baseline justify-between gap-4">
                <Link href={repo.href} className="truncate">
                  {repo.name}
                </Link>
                <span className="font-mono text-xs text-muted-foreground tabular-nums">
                  ★ {repo.stars}
                </span>
              </li>
            ))}
          </ul>
        </CardContent>
      </Layer>

      <Layer id="youtube">
        <CardHeader>
          <Label
            anchor="youtube"
            anchorClassName="flex h-3.5 w-5 items-center justify-center rounded-[5px]"
            glyph={
              <svg viewBox="0 0 6 7" className="ml-px h-1.5 fill-white">
                <path d="M0 0.5v6l6-3z" />
              </svg>
            }
          >
            YouTube
          </Label>
          <CardTitle className="text-lg">
            <Link href={youtube.href}>{youtube.handle}</Link>
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-5">
          <Stats items={youtube.stats} />
          <ul className="flex flex-col gap-2">
            {youtube.featured.map((video) => (
              <li key={video.title} className="flex items-baseline justify-between gap-4">
                <Link href={video.href} className="truncate">
                  {video.title}
                </Link>
                <span className="shrink-0 text-xs text-muted-foreground">{video.meta}</span>
              </li>
            ))}
          </ul>
        </CardContent>
      </Layer>

      <Layer id="career" className="pb-0">
        <CardHeader className="gap-0">
          <div className="flex gap-5 text-sm" aria-hidden>
            <TabLabel tab="work" active>
              Work
            </TabLabel>
            <TabLabel tab="edu">Education</TabLabel>
          </div>
          <Separator />
        </CardHeader>
      </Layer>

      <Layer id="work" className="pt-5">
        <CardContent>
          <h2 className="sr-only">Work</h2>
          <Timeline
            items={work.map((job) => ({
              key: job.company,
              title: job.company,
              subtitle: job.title,
              href: job.href,
              period: job.period,
            }))}
          />
        </CardContent>
      </Layer>

      <Layer id="edu" className="pt-5">
        <CardContent>
          <h2 className="sr-only">Education</h2>
          <Timeline
            items={education.map((school) => ({
              key: school.school,
              title: school.school,
              subtitle: school.degree,
              href: school.href,
              period: school.period,
            }))}
          />
        </CardContent>
      </Layer>
    </Card>
  )
}

function Layer({
  id,
  className,
  children,
}: {
  id: LayerId
  className?: string
  children: React.ReactNode
}) {
  return (
    <section
      data-layer={id}
      className={cn(
        "absolute top-0 left-0 flex flex-col gap-5 py-(--card-spacing) will-change-[opacity,filter,transform]",
        className
      )}
      style={{ opacity: 0, visibility: "hidden" }}
    >
      {children}
    </section>
  )
}

function Label({
  anchor,
  anchorClassName,
  glyph,
  children,
}: {
  anchor: string
  anchorClassName: string
  glyph?: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <div className="mb-2 flex h-3.5 items-center gap-2 text-xs text-muted-foreground">
      <span data-anchor={anchor} className={anchorClassName}>
        {glyph}
      </span>
      {children}
    </div>
  )
}

function TabLabel({
  tab,
  active,
  children,
}: {
  tab: Tab
  active?: boolean
  children: React.ReactNode
}) {
  return (
    <span
      data-tab={tab}
      data-active={active ? "true" : "false"}
      className="relative pb-3 font-medium text-muted-foreground transition-colors duration-300 data-[active=true]:text-foreground"
    >
      {children}
      <span data-anchor={tab} className="absolute inset-x-0 bottom-0 h-0.5 rounded-full" />
    </span>
  )
}

function Stats({ items }: { items: { label: string; value: string }[] }) {
  return (
    <dl className="flex gap-6">
      {items.map((item) => (
        <div key={item.label} className="flex flex-col-reverse gap-0.5">
          <dt className="text-xs text-muted-foreground">{item.label}</dt>
          <dd className="text-base font-medium tabular-nums">{item.value}</dd>
        </div>
      ))}
    </dl>
  )
}

function Timeline({
  items,
}: {
  items: { key: string; title: string; subtitle: string; href: string; period: string }[]
}) {
  return (
    <ul className="flex flex-col gap-3.5">
      {items.map((item) => (
        <li key={item.key} className="flex items-baseline justify-between gap-4">
          <div className="flex min-w-0 flex-col gap-0.5">
            <Link href={item.href} className="font-medium">
              {item.title}
            </Link>
            <span className="text-muted-foreground">{item.subtitle}</span>
          </div>
          <span className="shrink-0 font-mono text-xs text-muted-foreground tabular-nums">
            {item.period}
          </span>
        </li>
      ))}
    </ul>
  )
}

function Link({
  href,
  className,
  children,
}: {
  href: string
  className?: string
  children: React.ReactNode
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className={cn(
        "decoration-foreground/30 underline-offset-4 [@media(hover:hover)]:hover:underline",
        className
      )}
    >
      {children}
    </a>
  )
}

export { MorphCard }
