"use client"

import * as React from "react"
import Image from "next/image"
import {
  ArrowUpRight,
  BriefcaseBusiness,
  GitBranch,
  type LucideIcon,
  Mail,
  Play,
} from "lucide-react"

import { pulse } from "@/components/ascii-field"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { contact, github, work, youtube } from "@/lib/profile"
import { Spring, type SpringConfig } from "@/lib/spring"
import { cn } from "@/lib/utils"

type LayerId = "github" | "youtube" | "work" | "contact"
type Axis = "x" | "y"

type Scene = {
  id: LayerId
  /** Shown on the folder tab. */
  label: string
  icon: LucideIcon
  /** In px, before `DESKTOP_SCALE`. */
  width: number
}

const SCENES: Scene[] = [
  { id: "github", label: "GitHub", icon: GitBranch, width: 423 },
  { id: "youtube", label: "YouTube", icon: Play, width: 419 },
  { id: "work", label: "Work", icon: BriefcaseBusiness, width: 465 },
  { id: "contact", label: "Contact", icon: Mail, width: 419 },
]

const MORPH: SpringConfig = { duration: 0.72, bounce: 0.16 }
const EDGE_LEAD: SpringConfig = { duration: 0.5, bounce: 0.16 }
const EDGE_TRAIL: SpringConfig = { duration: 0.86, bounce: 0.1 }
const ENTER: SpringConfig = { duration: 0.55, bounce: 0 }
const EXIT: SpringConfig = { duration: 0.22, bounce: 0 }
const SNAP: SpringConfig = { duration: 0.0001, bounce: 0 }
const NUDGE_OUT: SpringConfig = { duration: 0.18, bounce: 0 }
const NUDGE_BACK: SpringConfig = { duration: 0.5, bounce: 0.2 }

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
/** On desktop the card body is wider to leave room for content; type stays the same size. */
const DESKTOP_SCALE = 1.15
/** How far a resting tab sinks behind the card, and how far the card gives at either end. */
const TAB_REST = 5
/** Where a row of tabs starts: past the card's corner, with room for the first tab's flare. */
const TAB_INSET = RADIUS + 10
const TAB_GAP = 2
const TAB_HEIGHT = 32
const TAB_RADIUS = 10
/** Radius of the concave sweep that pours a selected tab into the card's edge. */
const TAB_FLARE = 10
const NUDGE = 7

/** A wheel gesture ends once the wheel has been quiet for this long (ms). */
const WHEEL_IDLE = 160
const SWIPE_DISTANCE = 36
const SWIPE_MIN = 14
/** px/ms. A quick flick counts even when it is short. */
const SWIPE_VELOCITY = 0.11

const KEYS: Record<string, [direction: number, axis: Axis]> = {
  ArrowRight: [1, "x"],
  ArrowLeft: [-1, "x"],
  ArrowDown: [1, "y"],
  ArrowUp: [-1, "y"],
}

/** Blends from the resting tab colour to the card's as `--active` goes 0 → 1. */
const TAB_COLOR = {
  "--tab":
    "color-mix(in oklab, var(--card) calc(var(--active, 0) * 100%), var(--tab-rest))",
  "--tab-edge":
    "color-mix(in oklab, var(--card-edge) calc(var(--active, 0) * 100%), transparent)",
} as React.CSSProperties

/**
 * A top tab's silhouette as one open path: flare, side, corner, top, corner,
 * side, flare. Drawn in one stroke so the hairline keeps a single weight
 * through every curve. The card's top edge is y = 0 and `top` is the tab's
 * upper edge, so a sinking tab shortens while its foot stays on the card.
 * Everything is inset half a pixel: a 1px stroke then fills whole pixels and
 * its ends land exactly on the card's own hairline.
 */
function tabOutline(width: number, flare: number, top: number) {
  const s = 0.5
  const r = TAB_RADIUS - s
  return [
    `M${s - flare} ${s}`,
    `A${flare} ${flare} 0 0 0 ${s} ${s - flare}`,
    `V${top + TAB_RADIUS}`,
    `A${r} ${r} 0 0 1 ${TAB_RADIUS} ${top + s}`,
    `H${width - TAB_RADIUS}`,
    `A${r} ${r} 0 0 1 ${width - s} ${top + TAB_RADIUS}`,
    `V${s - flare}`,
    `A${flare} ${flare} 0 0 0 ${width - s + flare} ${s}`,
  ].join("")
}

/** `roundness` is the corner radius as a fraction of half the shorter side. */
type Box = { l: number; t: number; r: number; b: number; roundness: number }
type Geometry = { width: number; height: number; accent: Box }

function MorphCard() {
  const rootRef = React.useRef<HTMLDivElement>(null)
  const cardRef = React.useRef<HTMLDivElement>(null)
  const shapeRef = React.useRef<SVGSVGElement>(null)
  const accentRef = React.useRef<HTMLDivElement>(null)
  const goRef = React.useRef<(index: number) => void>(null)

  React.useLayoutEffect(() => {
    const root = rootRef.current
    const card = cardRef.current
    const accent = accentRef.current
    const shape = shapeRef.current
    if (!root || !card || !accent || !shape) return

    const layerEls = SCENES.map(
      (scene) => card.querySelector<HTMLElement>(`[data-layer="${scene.id}"]`)!
    )
    const tabEls = [...root.querySelectorAll<HTMLElement>("[role=tab]")]
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)")
    const desktop = window.matchMedia("(min-width: 1024px)")
    const now = () => performance.now() / 1000
    const motion = (config: SpringConfig) => (reducedMotion.matches ? SNAP : config)
    const clamp = (value: number) => Math.min(1, Math.max(0, value))

    function measure(): Geometry[] {
      const scale = desktop.matches ? DESKTOP_SCALE : 1
      const available = document.documentElement.clientWidth - GUTTER
      return SCENES.map((scene, i) => {
        const width = Math.min(scene.width * scale, available)
        const layer = layerEls[i]
        layer.style.width = `${width}px`

        const anchor = layer.querySelector<HTMLElement>("[data-anchor]")!
        const a = anchor.getBoundingClientRect()
        const p = layer.getBoundingClientRect()
        const top = a.top - p.top
        const left = a.left - p.left
        return {
          width,
          height: layer.offsetHeight,
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

    // Tabs fill the top edge first. Whatever does not fit on the narrowest
    // scene hangs from the bottom edge instead, as the same folder tab flipped.
    const tabSides = SCENES.map(() => 1)
    const tabWidths = SCENES.map(() => 0)
    const tabLefts = SCENES.map(() => 0)
    const tabBacks = [...shape.querySelectorAll<SVGPathElement>("[data-tab-back]")]
    const tabFronts = [...shape.querySelectorAll<SVGGElement>("[data-tab-front]")]
    const [cardFill, cardEdge] = shape.querySelectorAll("rect")
    function placeTabs(scenes: Geometry[]) {
      const end = Math.min(...scenes.map((g) => g.width)) - TAB_INSET
      let left = TAB_INSET
      let side = 1
      tabEls.forEach((tab, i) => {
        const tabWidth = tab.offsetWidth
        if (side === 1 && left > TAB_INSET && left + tabWidth > end) {
          side = -1
          left = TAB_INSET
        }
        tabSides[i] = side
        tabWidths[i] = tabWidth
        tabLefts[i] = left
        tab.dataset.edge = side === 1 ? "top" : "bottom"
        tab.style.left = `${left}px`
        left += tabWidth + TAB_GAP
      })
    }

    let geometry = measure()
    placeTabs(geometry)
    let index = 0

    const width = new Spring(SEED)
    const height = new Spring(SEED)
    const radius = new Spring(SEED / 2)
    const edges = {
      l: new Spring(SEED / 2 - 3),
      r: new Spring(SEED / 2 + 3),
      t: new Spring(SEED / 2 - 3),
      b: new Spring(SEED / 2 + 3),
    }
    const accentRoundness = new Spring(1)
    const layers = SCENES.map(() => ({ progress: new Spring(0), direction: 1 }))
    const tabs = SCENES.map(() => ({ active: new Spring(0), enter: new Spring(0) }))
    const nudges = { x: new Spring(0), y: new Spring(0) }

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

    function morphTo(g: Geometry, t: number) {
      width.to(g.width, t, motion(MORPH))
      height.to(g.height, t, motion(MORPH))
      radius.to(RADIUS, t, motion(MORPH))
      moveAccent(g.accent, t)
    }

    /** `direction` is 1 when moving to a later scene, -1 to an earlier one. */
    function show(next: number, t: number, direction: number, first = false) {
      const morphAt = first ? t : t + EXIT_LEAD

      SCENES.forEach((_, i) => {
        const selected = i === next
        if (selected) {
          layers[i].direction = direction
          layers[i].progress.to(1, morphAt + ENTER_DELAY, ENTER)
        } else {
          // Old content leaves the way the new content is heading.
          if (layers[i].progress.target > 0) layers[i].direction = -direction
          layers[i].progress.to(0, t, EXIT)
        }
        tabs[i].active.to(selected ? 1 : 0, morphAt, motion(MORPH))
        tabEls[i].setAttribute("aria-selected", String(selected))
        tabEls[i].tabIndex = selected ? 0 : -1
      })

      morphTo(geometry[next], morphAt)
      index = next
    }

    function go(next: number) {
      if (next === index || !SCENES[next]) return
      show(next, now(), Math.sign(next - index))
      pulse()
    }
    goRef.current = go

    /** At either end there is nowhere to go, so the card gives a little and settles. */
    function nudge(direction: number, axis: Axis) {
      if (reducedMotion.matches) return
      const t = now()
      nudges[axis].to(-direction * NUDGE, t, NUDGE_OUT)
      nudges[axis].to(0, t + 0.1, NUDGE_BACK)
    }

    function step(direction: number, axis: Axis) {
      if (SCENES[index + direction]) go(index + direction)
      else nudge(direction, axis)
    }

    function render(t: number) {
      const cardWidth = Math.max(0, width.get(t))
      const cardHeight = Math.max(0, height.get(t))
      const cardRadius = Math.max(0, radius.get(t))
      card!.style.width = `${cardWidth}px`
      card!.style.height = `${cardHeight}px`
      card!.style.borderRadius = `${cardRadius}px`
      cardFill.setAttribute("width", `${cardWidth}`)
      cardFill.setAttribute("height", `${cardHeight}`)
      cardFill.setAttribute("rx", `${cardRadius}`)
      cardEdge.setAttribute("width", `${Math.max(0, cardWidth - 1)}`)
      cardEdge.setAttribute("height", `${Math.max(0, cardHeight - 1)}`)
      cardEdge.setAttribute("rx", `${Math.max(0, cardRadius - 0.5)}`)
      root!.style.transform = `translate(${nudges.x.get(t)}px, ${nudges.y.get(t)}px)`

      const left = edges.l.get(t)
      const top = edges.t.get(t)
      accent!.style.transform = `translate(${left}px, ${top}px)`
      const accentWidth = Math.max(0, edges.r.get(t) - left)
      const accentHeight = Math.max(0, edges.b.get(t) - top)
      // Radius follows the live size, so the shape stays proportionally rounded
      // while its edges stretch, instead of flattening into a hard rectangle.
      const roundness = clamp(accentRoundness.get(t))
      accent!.style.width = `${accentWidth}px`
      accent!.style.height = `${accentHeight}px`
      accent!.style.borderRadius = `${(roundness * Math.min(accentWidth, accentHeight)) / 2}px`

      SCENES.forEach((_, i) => {
        const el = layerEls[i]
        const { progress, direction } = layers[i]
        const p = clamp(progress.get(t))
        const rest = 1 - p
        el.style.opacity = `${p}`
        el.style.visibility = p > 0.001 || progress.target > 0 ? "visible" : "hidden"
        el.inert = progress.target === 0
        if (!reducedMotion.matches) {
          el.style.filter = rest > 0.002 ? `blur(${rest * BLUR}px)` : ""
          el.style.transform = `translateY(${rest * SHIFT * direction}px)`
        }

        // A resting tab sits low behind the card; the selected one rises and
        // takes the card's colour, so tab and card read as one sheet of paper.
        const tab = tabEls[i]
        const active = clamp(tabs[i].active.get(t))
        const entered = clamp(tabs[i].enter.get(t))
        tab.style.opacity = `${entered}`
        const sunk = (1 - active) * TAB_REST + (1 - entered) * 8
        tab.style.transform = `translateY(${tabSides[i] * sunk}px)`

        // The flare grows out of the tab as it rises, so a resting tab is a
        // plain rounded shape and the selected one pours into the card.
        const outline = tabOutline(tabWidths[i], active * TAB_FLARE, 1 - TAB_HEIGHT + sunk)
        const foot = `H${0.5 - active * TAB_FLARE}Z`
        // Bottom tabs are the same shape, flipped onto the card's lower edge.
        const place =
          tabSides[i] === 1
            ? `translate(${tabLefts[i]})`
            : `translate(${tabLefts[i]} ${cardHeight}) scale(1 -1)`

        // Behind the card, the tab's body runs on underneath it.
        const back = tabBacks[i]
        back.setAttribute("d", `${outline}V8${foot}`)
        back.setAttribute("transform", place)
        back.style.setProperty("--active", `${active}`)
        back.style.opacity = `${entered}`

        // In front, the selected tab takes out the card's hairline across its
        // mouth and reaches over its neighbours.
        const front = tabFronts[i]
        const [cover, edge] = front.children
        cover.setAttribute("d", `${outline}V2${foot}`)
        cover.setAttribute("opacity", `${active}`)
        edge.setAttribute("d", outline)
        front.setAttribute("transform", place)
        front.style.setProperty("--active", `${active}`)
        front.style.opacity = `${entered}`
      })
    }

    // Start as a small seed, then grow into the first scene.
    const start = now()
    show(0, start + 0.12, 1, true)
    tabs.forEach((tab, i) => tab.enter.to(1, start + 0.5 + i * 0.06, motion(ENTER)))
    render(start)

    let frame = requestAnimationFrame(function tick(ms) {
      render(ms / 1000)
      frame = requestAnimationFrame(tick)
    })

    // One wheel gesture is one step, however long it runs: the first event
    // moves, and everything after it (inertia included) is swallowed until the
    // wheel falls quiet.
    let wheelLocked = false
    let wheelIdle = 0
    function onWheel(event: WheelEvent) {
      if (event.ctrlKey) return
      event.preventDefault()
      const horizontal = Math.abs(event.deltaX) > Math.abs(event.deltaY)
      const delta = horizontal ? event.deltaX : event.deltaY
      window.clearTimeout(wheelIdle)
      wheelIdle = window.setTimeout(() => {
        wheelLocked = false
      }, WHEEL_IDLE)
      if (wheelLocked || delta === 0) return
      wheelLocked = true
      step(delta > 0 ? 1 : -1, horizontal ? "x" : "y")
    }

    let touch: { id: number; x: number; y: number; at: number } | null = null
    function onTouchStart(event: TouchEvent) {
      // A second finger cancels the swipe instead of hijacking it.
      const first = event.touches.length === 1 ? event.touches[0] : null
      touch = first && {
        id: first.identifier,
        x: first.clientX,
        y: first.clientY,
        at: event.timeStamp,
      }
    }
    function onTouchEnd(event: TouchEvent) {
      const origin = touch
      const end = [...event.changedTouches].find((t) => t.identifier === origin?.id)
      if (!origin || !end) return
      touch = null
      const dx = end.clientX - origin.x
      const dy = end.clientY - origin.y
      const horizontal = Math.abs(dx) > Math.abs(dy)
      const travel = horizontal ? dx : dy
      const distance = Math.abs(travel)
      const velocity = distance / Math.max(1, event.timeStamp - origin.at)
      if (distance < SWIPE_MIN) return
      if (distance < SWIPE_DISTANCE && velocity < SWIPE_VELOCITY) return
      // Swiping left or up pulls the next scene in.
      step(travel < 0 ? 1 : -1, horizontal ? "x" : "y")
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.defaultPrevented || event.metaKey || event.ctrlKey || event.altKey) return
      const key = KEYS[event.key]
      if (!key) return
      event.preventDefault()
      const tabFocused = tabEls.includes(document.activeElement as HTMLElement)
      step(...key)
      if (tabFocused) tabEls[index].focus()
    }

    window.addEventListener("wheel", onWheel, { passive: false })
    window.addEventListener("touchstart", onTouchStart, { passive: true })
    window.addEventListener("touchend", onTouchEnd)
    window.addEventListener("keydown", onKeyDown)

    let queued = 0
    function remeasure() {
      cancelAnimationFrame(queued)
      queued = requestAnimationFrame(() => {
        geometry = measure()
        placeTabs(geometry)
        morphTo(geometry[index], now())
      })
    }

    const resizeObserver = new ResizeObserver(remeasure)
    for (const el of [...layerEls, ...tabEls]) resizeObserver.observe(el)
    window.addEventListener("resize", remeasure)

    return () => {
      cancelAnimationFrame(frame)
      cancelAnimationFrame(queued)
      window.clearTimeout(wheelIdle)
      resizeObserver.disconnect()
      window.removeEventListener("wheel", onWheel)
      window.removeEventListener("touchstart", onTouchStart)
      window.removeEventListener("touchend", onTouchEnd)
      window.removeEventListener("keydown", onKeyDown)
      window.removeEventListener("resize", remeasure)
    }
  }, [])

  return (
    <div ref={rootRef} className="relative shrink-0 will-change-transform">
      {/* The card and its tabs are drawn in one coordinate space, so their
          hairlines meet exactly at any pixel density. Order is depth: resting
          tabs, the card, then what the selected tab lays over both. */}
      <svg
        ref={shapeRef}
        aria-hidden
        className="pointer-events-none absolute top-0 left-0 size-px overflow-visible"
      >
        {SCENES.map((scene) => (
          <path key={scene.id} data-tab-back className="fill-(--tab)" style={TAB_COLOR} />
        ))}
        <rect className="fill-card" />
        <rect x={0.5} y={0.5} className="fill-none stroke-(--card-edge)" />
        {SCENES.map((scene) => (
          <g key={scene.id} data-tab-front style={TAB_COLOR}>
            <path className="fill-(--tab)" />
            <path className="fill-none stroke-(--tab-edge)" />
          </g>
        ))}
      </svg>

      <div role="tablist" aria-label="Sections" className="absolute inset-0">
        {SCENES.map((scene, i) => (
          <button
            key={scene.id}
            type="button"
            role="tab"
            id={`tab-${scene.id}`}
            aria-controls={`panel-${scene.id}`}
            aria-selected={i === 0}
            tabIndex={i === 0 ? 0 : -1}
            onClick={() => goRef.current?.(i)}
            className="group/tab absolute bottom-[calc(100%-1px)] left-[1.875rem] flex h-8 cursor-pointer items-center rounded-t-[10px] whitespace-nowrap data-[edge=bottom]:top-[calc(100%-1px)] data-[edge=bottom]:bottom-auto data-[edge=bottom]:rounded-t-none data-[edge=bottom]:rounded-b-[10px] data-[edge=bottom]:before:top-0 data-[edge=bottom]:before:-bottom-3 px-3.5 text-[0.8125rem] font-medium max-sm:px-2.5 max-[359px]:px-1.5 max-[359px]:text-xs text-card-foreground outline-none select-none [-webkit-tap-highlight-color:transparent] will-change-transform before:absolute before:inset-x-0 before:-top-3 before:bottom-0 focus-visible:ring-2 focus-visible:ring-clay/70"
            style={{ opacity: 0 }}
          >
            <span className="flex items-center gap-1.5 opacity-55 transition-[opacity,transform] duration-150 ease-out group-active/tab:scale-[0.97] group-aria-selected/tab:opacity-100 [@media(hover:hover)]:group-hover/tab:opacity-100">
              <scene.icon aria-hidden className="size-3.5 max-lg:hidden" strokeWidth={1.75} />
              {scene.label}
            </span>
          </button>
        ))}
      </div>

      <Card
        ref={cardRef}
        className="relative block gap-0 bg-transparent p-0 ring-0! [--card-spacing:--spacing(6)]"
        style={{ width: SEED, height: SEED, borderRadius: SEED / 2 }}
      >
        <div ref={accentRef} aria-hidden className="absolute top-0 left-0 bg-clay" />

        <Layer id="github">
          <CardHeader>
            <Label anchorClassName="size-1.5 rounded-full">open source</Label>
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
                  <Link href={repo.href}>
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
              anchorClassName="flex h-3.5 w-5 items-center justify-center rounded-[5px]"
              glyph={
                <svg viewBox="0 0 6 7" className="ml-px h-1.5 fill-white">
                  <path d="M0 0.5v6l6-3z" />
                </svg>
              }
            >
              channel
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
                  <Link href={video.href}>
                    {video.title}
                  </Link>
                  <span className="shrink-0 text-xs text-muted-foreground">{video.meta}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Layer>

        <Layer id="work">
          <CardHeader>
            <Label anchorClassName="h-0.5 w-4 rounded-full">
              {work.at(-1)?.period.slice(0, 4)} — now
            </Label>
          </CardHeader>
          <CardContent>
            <Timeline
              items={work.map((job) => ({
                key: job.company,
                title: job.company,
                subtitle: job.title,
                href: job.href,
                logo: job.logo,
                period: job.period,
              }))}
            />
          </CardContent>
        </Layer>

        <Layer id="contact">
          <CardHeader>
            <Label anchorClassName="size-1.5 rounded-[2px]">get in touch</Label>
          </CardHeader>
          <CardContent>
            <ul className="flex flex-col gap-2">
              {contact.map((item) => (
                <li key={item.label} className="flex items-baseline justify-between gap-4">
                  <span className="shrink-0 font-mono text-xs text-muted-foreground">
                    {item.label}
                  </span>
                  <Link href={item.href}>{item.value}</Link>
                </li>
              ))}
            </ul>
          </CardContent>
        </Layer>
      </Card>

    </div>
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
      role="tabpanel"
      id={`panel-${id}`}
      aria-labelledby={`tab-${id}`}
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
  anchorClassName,
  glyph,
  children,
}: {
  anchorClassName: string
  glyph?: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <div className="mb-2 flex h-3.5 items-center gap-2 font-mono text-[0.6875rem] text-muted-foreground">
      <span data-anchor className={anchorClassName}>
        {glyph}
      </span>
      {children}
    </div>
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
  items: {
    key: string
    title: string
    subtitle: string
    href: string
    logo: string
    period: string
  }[]
}) {
  return (
    <ul className="flex flex-col gap-3.5">
      {items.map((item) => (
        <li key={item.key} className="group/item flex items-center gap-3">
          <Image
            src={item.logo}
            alt=""
            width={36}
            height={36}
            className="size-9 shrink-0 rounded-lg bg-white object-cover grayscale transition-[filter] duration-200 ease-out group-focus-within/item:grayscale-0 [@media(hover:hover)]:group-hover/item:grayscale-0"
          />
          <div className="flex min-w-0 flex-1 items-baseline justify-between gap-4">
            <div className="flex min-w-0 flex-col gap-0.5">
              <Link href={item.href} className="self-start font-medium">
                {item.title}
              </Link>
              <span className="text-muted-foreground">{item.subtitle}</span>
            </div>
            <span className="shrink-0 font-mono text-xs text-muted-foreground tabular-nums">
              {item.period}
            </span>
          </div>
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
  // Always underlined and marked with an arrow, so it reads as a link without
  // hover, which touch screens do not have.
  return (
    <a
      href={href}
      {...(href.startsWith("http") && { target: "_blank", rel: "noreferrer" })}
      className={cn(
        "group/link inline-flex max-w-full min-w-0 items-baseline gap-1 rounded-sm outline-none transition-opacity duration-150 focus-visible:ring-2 focus-visible:ring-clay/70 active:opacity-60",
        className
      )}
    >
      <span className="truncate underline decoration-foreground/25 underline-offset-4 transition-colors duration-150 [@media(hover:hover)]:group-hover/link:decoration-clay">
        {children}
      </span>
      <ArrowUpRight
        aria-hidden
        className="size-[0.85em] shrink-0 self-center text-muted-foreground transition-[color,translate] duration-150 ease-out [@media(hover:hover)]:group-hover/link:translate-x-px [@media(hover:hover)]:group-hover/link:-translate-y-px [@media(hover:hover)]:group-hover/link:text-clay"
        strokeWidth={2}
      />
    </a>
  )
}

export { MorphCard }
