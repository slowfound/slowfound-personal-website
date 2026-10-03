"use client"

import * as React from "react"

import { cn } from "@/lib/utils"

const BAYER_8 = [
  0, 32, 8, 40, 2, 34, 10, 42, 48, 16, 56, 24, 50, 18, 58, 26, 12, 44, 4, 36,
  14, 46, 6, 38, 60, 28, 52, 20, 62, 30, 54, 22, 3, 35, 11, 43, 1, 33, 9, 41,
  51, 19, 59, 27, 49, 17, 57, 25, 15, 47, 7, 39, 13, 45, 5, 37, 63, 31, 55, 23,
  61, 29, 53, 21,
]

/** Ordered (Bayer) dither of a radial falloff from the top-right corner. */
function Dither({
  cells = 72,
  className,
}: {
  cells?: number
  className?: string
}) {
  const ref = React.useRef<HTMLCanvasElement>(null)

  React.useEffect(() => {
    const canvas = ref.current
    const ctx = canvas?.getContext("2d")
    if (!canvas || !ctx) return

    canvas.width = cells
    canvas.height = cells
    const image = ctx.createImageData(cells, cells)

    for (let y = 0; y < cells; y++) {
      for (let x = 0; x < cells; x++) {
        const distance = Math.hypot(cells - 1 - x, y) / cells
        const intensity = Math.pow(Math.max(0, 1 - distance), 2.2)
        const threshold = (BAYER_8[(y % 8) * 8 + (x % 8)] + 0.5) / 64
        if (intensity <= threshold) continue
        const i = (y * cells + x) * 4
        image.data[i] = 255
        image.data[i + 1] = 255
        image.data[i + 2] = 255
        image.data[i + 3] = 255
      }
    }

    ctx.putImageData(image, 0, 0)
  }, [cells])

  return (
    <canvas
      ref={ref}
      aria-hidden
      className={cn(
        "pointer-events-none [image-rendering:pixelated] mix-blend-difference",
        className
      )}
    />
  )
}

export { Dither }
