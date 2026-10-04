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
/** Phones and touch devices get a plain background. Mirrors the classes on the canvas. */
const MOBILE = "(max-width: 767.98px), (pointer: coarse)"

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

/** OKLCH to sRGB, each channel 0..1. */
function oklch(lightness: number, chroma: number, hue: number) {
  const a = chroma * Math.cos((hue * Math.PI) / 180)
  const b = chroma * Math.sin((hue * Math.PI) / 180)
  const l = (lightness + 0.3963377774 * a + 0.2158037573 * b) ** 3
  const m = (lightness - 0.1055613458 * a - 0.0638541728 * b) ** 3
  const s = (lightness - 0.0894841775 * a - 1.291485548 * b) ** 3
  return [
    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
  ].map((linear) => {
    const x = Math.min(1, Math.max(0, linear))
    return x <= 0.0031308 ? 12.92 * x : 1.055 * x ** (1 / 2.4) - 0.055
  })
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

uniform sampler2D atlas;
/** Canvas and cell size in device px, and device px per CSS px. */
uniform vec2 size;
uniform vec2 cell;
uniform float ratio;
uniform float time;
uniform float air;
uniform float strength;
/** Radius and gain of the ring sent by pulse(). */
uniform vec2 ring;
uniform vec3 ink;
uniform vec3 wash[3];

const float GLYPHS = ${float(RAMP.length)};

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

void main() {
  vec2 px = vec2(gl_FragCoord.x, size.y - gl_FragCoord.y);
  vec2 inCell = fract(px / cell);
  // Everything below is evaluated at the centre of the cell, in CSS px.
  vec2 p = (floor(px / cell) + 0.5) * cell / ratio;
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
  float offset = (dist + bend * 140.0 - ring.x) / ${float(PULSE_WIDTH)};
  value += exp(-0.5 * offset * offset) * ring.y;

  float level = min(1.0, value) * envelope * (GLYPHS - 1.0);
  float glyph = floor(level);
  float next = min(glyph + 1.0, GLYPHS - 1.0);
  float alpha = strength * mix(
    texture2D(atlas, vec2((glyph + inCell.x) / GLYPHS, inCell.y)).a,
    texture2D(atlas, vec2((next + inCell.x) / GLYPHS, inCell.y)).a,
    level - glyph
  );

  // Colour only the glyphs: warm near the card, cooling toward the edges.
  float inner = 100.0 * ratio;
  float g = clamp(
    (length(px - size * 0.5) - inner) / (max(size.x, size.y) * 0.6 - inner),
    0.0,
    1.0
  );
  vec3 tint = g < 0.5
    ? mix(wash[0], wash[1], g * 2.0)
    : mix(wash[1], wash[2], g * 2.0 - 1.0);
  gl_FragColor = vec4(mix(ink, tint, ${float(TINT)}) * alpha, alpha);
}`

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
    const gl = canvas?.getContext("webgl", {
      antialias: false,
      depth: false,
      stencil: false,
    })
    const atlas = document.createElement("canvas")
    const atlasCtx = atlas.getContext("2d")
    if (!canvas || !gl || !atlasCtx) return

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

    gl.bindTexture(gl.TEXTURE_2D, gl.createTexture())
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)

    const uniform = (name: string) => gl.getUniformLocation(program, name)
    const uniforms = {
      size: uniform("size"),
      cell: uniform("cell"),
      ratio: uniform("ratio"),
      time: uniform("time"),
      air: uniform("air"),
      ring: uniform("ring"),
      ink: uniform("ink"),
      wash: uniform("wash"),
    }
    gl.uniform1f(uniform("strength"), strength)

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)")
    const colorScheme = window.matchMedia("(prefers-color-scheme: dark)")
    const mobile = window.matchMedia(MOBILE)

    let disposed = false

    function build() {
      if (disposed || mobile.matches) return
      const ratio = Math.min(window.devicePixelRatio || 1, 2)
      canvas!.width = Math.round(canvas!.clientWidth * ratio)
      canvas!.height = Math.round(canvas!.clientHeight * ratio)
      const cellWidth = Math.ceil(CELL_WIDTH * ratio)
      const cellHeight = Math.ceil(CELL_HEIGHT * ratio)

      // Glyphs are rasterised once into a texture the shader samples from.
      const style = getComputedStyle(canvas!)
      atlas.width = cellWidth * RAMP.length
      atlas.height = cellHeight
      // The ink colour can be in any CSS colour space; painting it resolves it to sRGB.
      atlasCtx!.fillStyle = style.color
      atlasCtx!.fillRect(0, 0, 1, 1)
      const [red, green, blue] = atlasCtx!.getImageData(0, 0, 1, 1).data
      atlasCtx!.clearRect(0, 0, 1, 1)
      atlasCtx!.font = `${FONT_SIZE * ratio}px ${style.fontFamily}`
      atlasCtx!.textAlign = "center"
      atlasCtx!.textBaseline = "middle"
      for (let i = 1; i < RAMP.length; i++) {
        atlasCtx!.fillText(RAMP[i], i * cellWidth + cellWidth / 2, cellHeight / 2)
      }
      gl!.texImage2D(gl!.TEXTURE_2D, 0, gl!.RGBA, gl!.RGBA, gl!.UNSIGNED_BYTE, atlas)

      gl!.viewport(0, 0, canvas!.width, canvas!.height)
      gl!.uniform2f(uniforms.size, canvas!.width, canvas!.height)
      gl!.uniform2f(uniforms.cell, cellWidth, cellHeight)
      gl!.uniform1f(uniforms.ratio, ratio)
      gl!.uniform3f(uniforms.ink, red / 255, green / 255, blue / 255)
      if (reducedMotion.matches) draw(0)
    }

    function draw(t: number) {
      const since = t - pulsedAt
      const air = breath(t)
      // The whole wash shifts a little with each breath.
      const hue = 40 + air * 45
      const lightness = colorScheme.matches ? 0.8 : 0.55
      gl!.uniform1f(uniforms.time, t)
      gl!.uniform1f(uniforms.air, air)
      gl!.uniform2f(
        uniforms.ring,
        since * PULSE_SPEED,
        since < PULSE_LIFE ? Math.exp(-since * 0.7) : 0
      )
      gl!.uniform3fv(
        uniforms.wash,
        [0, 70, 150].flatMap((shift) => oklch(lightness, TINT_CHROMA, hue - shift))
      )
      gl!.drawArrays(gl!.TRIANGLES, 0, 3)
    }

    // On mobile the canvas is hidden in CSS and nothing is built or drawn.
    let frame = 0
    function sync() {
      cancelAnimationFrame(frame)
      if (mobile.matches) return
      build()
      if (reducedMotion.matches) return
      frame = requestAnimationFrame(function tick(ms) {
        draw(ms / 1000)
        frame = requestAnimationFrame(tick)
      })
    }

    sync()
    document.fonts.ready.then(build)

    const resizeObserver = new ResizeObserver(build)
    resizeObserver.observe(canvas)
    // The glyphs are tinted with the current ink colour.
    colorScheme.addEventListener("change", build)
    mobile.addEventListener("change", sync)

    return () => {
      disposed = true
      gl.deleteProgram(program)
      cancelAnimationFrame(frame)
      resizeObserver.disconnect()
      colorScheme.removeEventListener("change", build)
      mobile.removeEventListener("change", sync)
    }
  }, [strength])

  return (
    <canvas
      ref={ref}
      aria-hidden
      className={cn(
        "pointer-events-none font-mono max-md:hidden pointer-coarse:hidden",
        className
      )}
    />
  )
}

export { AsciiField, pulse }
