"use client"

import * as React from "react"

import { cn } from "@/lib/utils"

/** One dither cell, in CSS px. Each cell is a single square dot, lit or not. */
const CELL = 3
/** Share of the cell the dot covers, so neighbours read as pixels, not a fill. */
const DOT = 0.67

/** Size of one swell of the noise that bends the rings, in px. */
const NOISE_SCALE = 240
const PULSE_SPEED = 440
const PULSE_WIDTH = 80
const PULSE_LIFE = 6
/** Rings that can be travelling at once. Each pulse() adds one; none is cut short. */
const MAX_RINGS = 16

/** One breath, in seconds, and the share of it spent breathing in. */
const BREATH = 6.5
const INHALE = 0.4

/** Rows of cells that tear together, and how often the tears are re-rolled per second. */
const BAND = 4
const GLITCH_RATE = 14
/** Share of bands torn at rest, at the top of a breath, and right after a pulse. */
const TEAR_REST = 0.004
const TEAR_BREATH = 0.01
const TEAR_PULSE = 0.3
/** How far a torn band slides, in cells, at most. */
const TEAR_SHIFT = 18
/** How fast the tearing after a pulse dies down, per second. */
const TEAR_DECAY = 5

/** How long a theme switch takes to blend, in seconds; the ink is re-read until it is over. */
const THEME_BLEND = 0.7

let pulses: number[] = []

/** Send one ring through the field, e.g. when the card turns a page. */
function pulse() {
  pulses.push(performance.now() / 1000)
  if (pulses.length > MAX_RINGS) pulses.shift()
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

const float = (value: number) => value.toFixed(4)

const VERTEX = `
attribute vec2 position;
void main() {
  gl_Position = vec4(position, 0.0, 1.0);
}`

// The whole field is shaded here, one pass over a full-screen triangle, so a
// frame costs the main thread a handful of uniform writes and nothing more.
const FRAGMENT = `
precision highp float;

/** Canvas and cell size in device px, and device px per CSS px. */
uniform vec2 size;
uniform float cell;
uniform float ratio;
uniform float time;
uniform float air;
uniform float strength;
/** Share of bands torn right now. */
uniform float tear;
/** Radius and gain of each ring sent by pulse(). */
uniform vec2 rings[${MAX_RINGS}];
uniform vec3 ink;

float hash(vec2 p) {
  return fract(sin(p.x * 127.1 + p.y * 311.7) * 43758.5453);
}

/** Smooth value noise in 0..1. */
float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(
    mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x),
    mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x),
    u.y
  );
}

/** Ordered-dither thresholds, built up from the 2x2 matrix without integer maths. */
float bayer2(vec2 a) {
  a = floor(a);
  return fract(a.x / 2.0 + a.y * a.y * 0.75);
}
float bayer4(vec2 a) { return bayer2(0.5 * a) * 0.25 + bayer2(a); }
float bayer8(vec2 a) { return bayer4(0.5 * a) * 0.25 + bayer2(a); }

/** Density of the field at a cell, 0..1. */
float field(vec2 c) {
  // Evaluated at the centre of the cell, in CSS px.
  vec2 p = (c + 0.5) * cell / ratio;
  float dist = length(p - size / ratio * 0.5);
  float envelope = smoothstep(120.0, 480.0 - air * 90.0, dist);

  // "bend" pushes each stretch of a ring ahead or behind, "thin" lets it fade
  // in places; both drift, so no two rings share a shape.
  vec2 n = p / ${float(NOISE_SCALE)};
  float bend = noise(n + vec2(time * 0.05, -time * 0.035)) - 0.5;
  float thin = noise(n * 0.6 + vec2(40.0 - time * 0.03, 40.0 + time * 0.04));
  // Rings drift outward overall, but every in-breath pulls them back in.
  float travel = time * 0.5 - air * 2.0;
  float swell = 0.5 + 0.5 * sin(dist * 0.016 - travel + bend * 5.0);
  float value = swell * swell * swell * (0.25 + 0.5 * thin) * (0.3 + 0.7 * air);
  float reach = dist + bend * 140.0;
  for (int i = 0; i < ${MAX_RINGS}; i++) {
    float offset = (reach - rings[i].x) / ${float(PULSE_WIDTH)};
    value += exp(-0.5 * offset * offset) * rings[i].y;
  }
  return min(1.0, value) * envelope;
}

/** 1 where the cell's dot is lit. The threshold travels with the cell, so a torn band keeps its pattern. */
float lit(vec2 c) {
  return step(bayer8(c) + 0.5 / 64.0, field(c));
}

void main() {
  vec2 px = vec2(gl_FragCoord.x, size.y - gl_FragCoord.y);
  vec2 c = floor(px / cell);
  vec2 inCell = fract(px / cell);
  float pixel = step(inCell.x, ${float(DOT)}) * step(inCell.y, ${float(DOT)});

  // A torn band is a run of rows that slides sideways for a tick, as if the
  // signal slipped. Ticks are stepped, so tears snap instead of gliding.
  float band = floor(c.y / ${float(BAND)});
  float tick = floor(time * ${float(GLITCH_RATE)});
  float torn = step(1.0 - tear, hash(vec2(band, tick)));
  float shift = floor((hash(vec2(tick, band)) - 0.5) * 2.0 * ${float(TEAR_SHIFT)});
  vec2 source = c - vec2(torn * shift, 0.0);

  float lead = lit(source);
  // Torn bands also split their colour: one channel lags a couple of cells behind.
  float ghost = lead;
  if (torn > 0.5) ghost = lit(source + vec2(sign(shift) * 2.0, 0.0));

  float both = lead * ghost;
  vec3 color = ink * both
    + mix(ink, vec3(1.0, 0.24, 0.3), 0.35) * (lead - both)
    + mix(ink, vec3(0.2, 0.85, 1.0), 0.35) * (ghost - both);
  float alpha = strength * pixel * max(lead, ghost);
  gl_FragColor = vec4(color * alpha, alpha);
}`

/**
 * A field of ordered-dither dots shaded by slow rings around the centre. The
 * field breathes: on the in-breath the rings draw inward and thicken, on the
 * out-breath they let go and travel outward. Every so often a band of rows
 * slips sideways and splits its colour, like a signal losing lock; each
 * pulse() makes that happen a lot more for a moment.
 */
function DitherField({
  strength = 0.07,
  className,
}: {
  strength?: number
  className?: string
}) {
  const ref = React.useRef<HTMLCanvasElement>(null)

  React.useEffect(() => {
    const canvas = ref.current
    const gl = canvas?.getContext("webgl", {
      antialias: false,
      depth: false,
      stencil: false,
    })
    const probe = document.createElement("canvas").getContext("2d")
    if (!canvas || !gl || !probe) return

    const program = gl.createProgram()
    for (const [type, source] of [
      [gl.VERTEX_SHADER, VERTEX],
      [gl.FRAGMENT_SHADER, FRAGMENT],
    ] as const) {
      const shader = gl.createShader(type)!
      gl.shaderSource(shader, source)
      gl.compileShader(shader)
      gl.attachShader(program, shader)
    }
    gl.bindAttribLocation(program, 0, "position")
    gl.linkProgram(program)
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) return
    gl.useProgram(program)

    // One triangle that covers the whole canvas.
    gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer())
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW)
    gl.enableVertexAttribArray(0)
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0)

    const uniform = (name: string) => gl.getUniformLocation(program, name)
    const uniforms = {
      size: uniform("size"),
      cell: uniform("cell"),
      ratio: uniform("ratio"),
      time: uniform("time"),
      air: uniform("air"),
      tear: uniform("tear"),
      rings: uniform("rings"),
      ink: uniform("ink"),
    }
    gl.uniform1f(uniform("strength"), strength)

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)")

    let disposed = false
    const rings = new Float32Array(MAX_RINGS * 2)
    /** Until when the theme is still blending, in seconds. */
    let blendingUntil = -Infinity

    function ink() {
      // The ink colour can be in any CSS colour space; painting it resolves it to sRGB.
      probe!.clearRect(0, 0, 1, 1)
      probe!.fillStyle = getComputedStyle(canvas!).color
      probe!.fillRect(0, 0, 1, 1)
      const [red, green, blue] = probe!.getImageData(0, 0, 1, 1).data
      gl!.uniform3f(uniforms.ink, red / 255, green / 255, blue / 255)
    }

    function build() {
      if (disposed) return
      const ratio = Math.min(window.devicePixelRatio || 1, 2)
      canvas!.width = Math.round(canvas!.clientWidth * ratio)
      canvas!.height = Math.round(canvas!.clientHeight * ratio)

      gl!.viewport(0, 0, canvas!.width, canvas!.height)
      gl!.uniform2f(uniforms.size, canvas!.width, canvas!.height)
      // Whole device pixels per cell, so every dot is the same size.
      gl!.uniform1f(uniforms.cell, Math.round(CELL * ratio))
      gl!.uniform1f(uniforms.ratio, ratio)
      ink()
      if (reducedMotion.matches) draw(0)
    }

    function draw(t: number) {
      // While the theme blends, the dots blend with it.
      if (t < blendingUntil) ink()
      pulses = pulses.filter((at) => t - at < PULSE_LIFE)
      rings.fill(0)
      let jolt = 0
      pulses.forEach((at, i) => {
        const since = t - at
        if (since < 0) return
        rings[i * 2] = since * PULSE_SPEED
        rings[i * 2 + 1] = Math.exp(-since * 0.7)
        jolt += Math.exp(-since * TEAR_DECAY)
      })
      const air = breath(t)
      const tear = reducedMotion.matches
        ? 0
        : TEAR_REST + TEAR_BREATH * air + TEAR_PULSE * Math.min(1, jolt)
      gl!.uniform1f(uniforms.time, t)
      gl!.uniform1f(uniforms.air, air)
      gl!.uniform1f(uniforms.tear, tear)
      gl!.uniform2fv(uniforms.rings, rings)
      gl!.drawArrays(gl!.TRIANGLES, 0, 3)
    }

    let frame = 0
    build()
    if (!reducedMotion.matches) {
      frame = requestAnimationFrame(function tick(ms) {
        draw(ms / 1000)
        frame = requestAnimationFrame(tick)
      })
    }

    const resizeObserver = new ResizeObserver(build)
    resizeObserver.observe(canvas)
    // The dots are drawn in the current ink colour, which blends on a theme switch.
    let settle = 0
    const themeObserver = new MutationObserver(() => {
      blendingUntil = performance.now() / 1000 + THEME_BLEND
      clearTimeout(settle)
      settle = window.setTimeout(build, THEME_BLEND * 1000)
    })
    themeObserver.observe(document.documentElement, { attributeFilter: ["data-theme"] })

    return () => {
      disposed = true
      gl.deleteProgram(program)
      cancelAnimationFrame(frame)
      clearTimeout(settle)
      resizeObserver.disconnect()
      themeObserver.disconnect()
    }
  }, [strength])

  return (
    <canvas
      ref={ref}
      aria-hidden
      className={cn("pointer-events-none", className)}
    />
  )
}

export { DitherField, pulse }
