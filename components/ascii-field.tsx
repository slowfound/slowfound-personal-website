"use client"

import * as React from "react"

import { cn } from "@/lib/utils"

/** Lightest to heaviest. A cell never jumps between glyphs, it crossfades. */
const RAMP = " .·:-=+*#"
const CELL_WIDTH = 11
const CELL_HEIGHT = 18
const FONT_SIZE = 11

/** Size of one swell of the noise that bends the rings, in px. */
const NOISE_SCALE = 240
const PULSE_SPEED = 440
const PULSE_WIDTH = 80
const PULSE_LIFE = 6

/** One breath, in seconds, and the share of it spent breathing in. */
const BREATH = 6.5
const INHALE = 0.4
/** How much of each glyph's ink the colour wash replaces. */
const TINT = 0.6
const TINT_CHROMA = 0.15

let pulsedAt = -Infinity

/** Send one ring through the field, e.g. when the card turns a page. */
function pulse() {
  pulsedAt = performance.now() / 1000
}

function smoothstep(from: number, to: number, value: number) {
  const x = Math.min(1, Math.max(0, (value - from) / (to - from)))
  return x * x * (3 - 2 * x)
}

/** 0 when empty, 1 when full: a quick rise, then a longer, slower fall. */
function breath(t: number) {
  const phase = (t / BREATH) % 1
  return phase < INHALE
    ? smoothstep(0, INHALE, phase)
    : 1 - smoothstep(INHALE, 1, phase)
}

function hash(x: number, y: number) {
  const h = Math.sin(x * 127.1 + y * 311.7) * 43758.5453
  return h - Math.floor(h)
}

/** Smooth value noise in 0..1. */
function noise(x: number, y: number) {
  const ix = Math.floor(x)
  const iy = Math.floor(y)
  const fx = x - ix
  const fy = y - iy
  const u = fx * fx * (3 - 2 * fx)
  const v = fy * fy * (3 - 2 * fy)
  const top = hash(ix, iy) + (hash(ix + 1, iy) - hash(ix, iy)) * u
  const bottom = hash(ix, iy + 1) + (hash(ix + 1, iy + 1) - hash(ix, iy + 1)) * u
  return top + (bottom - top) * v
}

/**
 * A grid of monospace glyphs shaded by slow rings around the centre. The field
 * breathes: on the in-breath the rings draw inward and brighten, on the
 * out-breath they let go and travel outward. Drifting noise bends the rings
 * and thins them out in places, and a faint colour wash runs from warm at the
 * centre to cool at the edges.
 */
function AsciiField({
  strength = 0.24,
  className,
}: {
  strength?: number
  className?: string
}) {
  const ref = React.useRef<HTMLCanvasElement>(null)

  React.useEffect(() => {
    const canvas = ref.current
    const ctx = canvas?.getContext("2d")
    const atlas = document.createElement("canvas")
    const atlasCtx = atlas.getContext("2d")
    if (!canvas || !ctx || !atlasCtx) return

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)")
    const colorScheme = window.matchMedia("(prefers-color-scheme: dark)")
    const top = RAMP.length - 1
    let cellWidth = 0
    let cellHeight = 0
    let cols = 0
    let rows = 0
    let ratio = 1

    function build() {
      ratio = Math.min(window.devicePixelRatio || 1, 2)
      canvas!.width = Math.round(canvas!.clientWidth * ratio)
      canvas!.height = Math.round(canvas!.clientHeight * ratio)
      cellWidth = Math.ceil(CELL_WIDTH * ratio)
      cellHeight = Math.ceil(CELL_HEIGHT * ratio)
      cols = Math.ceil(canvas!.width / cellWidth)
      rows = Math.ceil(canvas!.height / cellHeight)

      // Glyphs are rasterised once, then stamped with drawImage every frame.
      const style = getComputedStyle(canvas!)
      atlas.width = cellWidth * RAMP.length
      atlas.height = cellHeight
      atlasCtx!.fillStyle = style.color
      atlasCtx!.font = `${FONT_SIZE * ratio}px ${style.fontFamily}`
      atlasCtx!.textAlign = "center"
      atlasCtx!.textBaseline = "middle"
      for (let i = 1; i < RAMP.length; i++) {
        atlasCtx!.fillText(RAMP[i], i * cellWidth + cellWidth / 2, cellHeight / 2)
      }
      if (reducedMotion.matches) draw(0)
    }

    function stamp(glyph: number, alpha: number, c: number, r: number) {
      if (glyph < 1 || alpha < 0.01) return
      ctx!.globalAlpha = alpha
      ctx!.drawImage(
        atlas,
        glyph * cellWidth,
        0,
        cellWidth,
        cellHeight,
        c * cellWidth,
        r * cellHeight,
        cellWidth,
        cellHeight
      )
    }

    function draw(t: number) {
      ctx!.clearRect(0, 0, canvas!.width, canvas!.height)
      const width = canvas!.width / ratio
      const height = canvas!.height / ratio
      const originX = width / 2
      const originY = height / 2
      const since = t - pulsedAt
      const ringRadius = since * PULSE_SPEED
      const ringGain = since < PULSE_LIFE ? Math.exp(-since * 0.7) : 0
      const air = breath(t)
      // Rings drift outward overall, but every in-breath pulls them back in.
      const travel = t * 0.5 - air * 2
      const gain = 0.3 + 0.7 * air
      const reach = 480 - air * 90

      for (let r = 0; r < rows; r++) {
        const y = ((r + 0.5) * cellHeight) / ratio
        for (let c = 0; c < cols; c++) {
          const x = ((c + 0.5) * cellWidth) / ratio
          const distance = Math.hypot(x - originX, y - originY)
          const envelope = smoothstep(120, reach, distance)
          if (envelope < 0.01) continue

          // `bend` pushes each stretch of a ring ahead or behind, `thin` lets
          // it fade in places; both drift, so no two rings share a shape.
          const nx = x / NOISE_SCALE
          const ny = y / NOISE_SCALE
          const bend = noise(nx + t * 0.05, ny - t * 0.035) - 0.5
          const thin = noise(nx * 0.6 - t * 0.03 + 40, ny * 0.6 + t * 0.04 + 40)
          const swell = 0.5 + 0.5 * Math.sin(distance * 0.016 - travel + bend * 5)
          let value = swell * swell * swell * (0.25 + 0.5 * thin) * gain
          if (ringGain > 0) {
            const offset = (distance + bend * 140 - ringRadius) / PULSE_WIDTH
            value += Math.exp(-0.5 * offset * offset) * ringGain
          }

          const level = Math.min(1, value) * envelope * top
          const glyph = Math.floor(level)
          const blend = level - glyph
          stamp(glyph, strength * (1 - blend), c, r)
          stamp(glyph + 1, strength * blend, c, r)
        }
      }

      // Colour only the glyphs already drawn: warm near the card, cooling
      // toward the edges, the whole wash shifting a little with each breath.
      const hue = 40 + air * 45
      const lightness = colorScheme.matches ? 0.8 : 0.55
      const wash = ctx!.createRadialGradient(
        originX * ratio,
        originY * ratio,
        100 * ratio,
        originX * ratio,
        originY * ratio,
        Math.max(canvas!.width, canvas!.height) * 0.6
      )
      wash.addColorStop(0, `oklch(${lightness} ${TINT_CHROMA} ${hue})`)
      wash.addColorStop(0.5, `oklch(${lightness} ${TINT_CHROMA} ${hue - 70})`)
      wash.addColorStop(1, `oklch(${lightness} ${TINT_CHROMA} ${hue - 150})`)
      ctx!.globalAlpha = TINT
      ctx!.globalCompositeOperation = "source-atop"
      ctx!.fillStyle = wash
      ctx!.fillRect(0, 0, canvas!.width, canvas!.height)
      ctx!.globalCompositeOperation = "source-over"
    }

    build()
    document.fonts.ready.then(build)

    let frame = 0
    if (!reducedMotion.matches) {
      frame = requestAnimationFrame(function tick(ms) {
        draw(ms / 1000)
        frame = requestAnimationFrame(tick)
      })
    }

    const resizeObserver = new ResizeObserver(build)
    resizeObserver.observe(canvas)
    // The glyphs are rasterised in the current ink colour.
    colorScheme.addEventListener("change", build)

    return () => {
      cancelAnimationFrame(frame)
      resizeObserver.disconnect()
      colorScheme.removeEventListener("change", build)
    }
  }, [strength])

  return (
    <canvas
      ref={ref}
      aria-hidden
      className={cn("pointer-events-none font-mono", className)}
    />
  )
}

export { AsciiField, pulse }
