// Closed-form damped springs. A value never "animates" — it is evaluated.
// Every retarget adds one impulse (a unit step response scaled by the delta),
// and the value is the sum of all live impulses. Retargeting mid-flight is
// therefore always continuous, and settled impulses fold back into the base.

export type SpringConfig = {
  /** Perceptual duration in seconds (period of the undamped oscillator). */
  duration: number
  /** 0 = critically damped, ~0.15 = a tiny overshoot. */
  bounce: number
}

type Impulse = {
  t0: number
  delta: number
  omega: number
  zeta: number
  omegaD: number
  end: number
}

const SETTLE_EPSILON = Math.log(1e4)

function stepResponse(i: Impulse, t: number) {
  const dt = t - i.t0
  if (dt <= 0) return 0
  const decay = Math.exp(-i.zeta * i.omega * dt)
  return (
    1 -
    decay *
      (Math.cos(i.omegaD * dt) +
        ((i.zeta * i.omega) / i.omegaD) * Math.sin(i.omegaD * dt))
  )
}

export class Spring {
  private base: number
  private impulses: Impulse[] = []
  target: number

  constructor(value: number) {
    this.base = value
    this.target = value
  }

  /** Retarget at time `t` (seconds). `t` may be in the future. */
  to(target: number, t: number, config: SpringConfig) {
    const delta = target - this.target
    if (Math.abs(delta) < 1e-6) return
    this.target = target

    const zeta = Math.min(0.999, Math.max(0.05, 1 - config.bounce))
    const omega = (2 * Math.PI) / Math.max(config.duration, 1e-4)
    this.impulses.push({
      t0: t,
      delta,
      omega,
      zeta,
      omegaD: omega * Math.sqrt(1 - zeta * zeta),
      end: t + SETTLE_EPSILON / (zeta * omega),
    })
  }

  get(t: number) {
    let value = this.base
    let write = 0
    for (const impulse of this.impulses) {
      if (t >= impulse.end) {
        this.base += impulse.delta
        value += impulse.delta
        continue
      }
      value += impulse.delta * stepResponse(impulse, t)
      this.impulses[write++] = impulse
    }
    this.impulses.length = write
    return value
  }

  /** True once every impulse has settled and been folded away by `get`. */
  get idle() {
    return this.impulses.length === 0
  }

  jump(value: number) {
    this.base = value
    this.target = value
    this.impulses = []
  }
}

/**
 * The same spring as a CSS transition, for things that live in CSS rather
 * than in a render loop: `transition: transform ${duration}s ${easing}`.
 */
export function cssSpring(config: SpringConfig, samples = 40) {
  const zeta = Math.min(0.999, Math.max(0.05, 1 - config.bounce))
  const omega = (2 * Math.PI) / Math.max(config.duration, 1e-4)
  const impulse: Impulse = {
    t0: 0,
    delta: 1,
    omega,
    zeta,
    omegaD: omega * Math.sqrt(1 - zeta * zeta),
    end: 0,
  }
  // Settled to a thousandth: past that a transition only wastes frames.
  const duration = Math.log(1e3) / (zeta * omega)
  const points = Array.from({ length: samples + 1 }, (_, i) =>
    i === samples ? 1 : stepResponse(impulse, (i / samples) * duration)
  )
  return {
    duration,
    easing: `linear(${points.map((p) => +p.toFixed(4)).join(", ")})`,
  }
}
