/**
 * Bracket: sixteen tokens in sockets on a plinth, each as rare as its lid is
 * dense: rarity is printed on the lid in ordered dither. One token per wallet,
 * so every sale burns a token into its buyer. The pointer's x runs the market
 * through four rounds of sales: pairs slide together, the loser shrinks into
 * the winner, the winner grows by its stats. At the far end one token holds
 * the whole supply and fifteen sockets stand empty. The bright one at rest is
 * the token that ends up holding everything. The slider is how hard height
 * rewards rarity.
 *
 * The pattern: scrub. One spring on the round, every pose a function of it,
 * and the hit is the plinth's own width on screen, which never moves.
 */
const {
  Cam, clamp, facing, fit, flatDot, lerp, mk, place, pointer, poly, prism, proj, put,
  register, ringAt, rings, solid, spring, stepS, disposer,
} = HL;

const N = 4, CELL = 26, EXT = N * CELL, MID = EXT / 2, PB = 4, R0 = 4.4, H0 = 3.2, DOT = 2.3, GMAX = 0.86;
/** The side the camera sees, as an angle round a token: dither is printed on that half only. */
const FACE = Math.PI / 4, SPAN = 1.25;
/** Stats at mint, row by row from the back. */
const STAT = [1, 2, 1, 3, 2, 1, 3, 1, 1, 3, 1, 2, 2, 1, 2, 1];
const TOTAL = STAT.reduce((a, b) => a + b, 0);
/** The token that ends up holding everything. */
const S = [2, 1];

/** Ordered-dither thresholds, 0..1, for an integer lattice point. */
function bayer(a, b) {
  let v = 0;
  for (let bit = 0, s = 1; bit < 3; bit++, s *= 4) {
    const x = (a >> bit) & 1, y = (b >> bit) & 1;
    v += ((x ^ y) * 2 + y) / (s * 4);
  }
  return v * (64 / 63);
}

const smooth = (x) => { const t = clamp((x - 0.15) / 0.7, 0, 1); return t * t * (3 - 2 * t); };

function mount({ stage, svg, read }, value) {
  const bag = disposer();
  let grow = value;
  const radius = (s) => R0 * Math.pow(s, 0.34), height = (s) => H0 * Math.pow(s, grow);

  // Fitted to the plinth and to the whale at the far end with the slider at its top.
  const C = Cam(45, 0.5, 1.95);
  fit(C, [[-6, -6, -PB], [EXT + 6, EXT + 6, -PB], [EXT + 6, -6, -PB], [-6, EXT + 6, -PB], [MID, MID, H0 * Math.pow(TOTAL, GMAX)]], 200, 168);
  const P = proj(C), front = facing(C);

  const g = mk("g", {}, svg);
  const [pr, pi] = rings(-6, -6, EXT + 6, EXT + 6, 10, 2);
  put(solid(g), prism(P, front, pr, pi, -PB, 0));

  const toks = [];
  for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) {
    const cx = (i + 0.5) * CELL, cy = (j + 0.5) * CELL;
    const [socket] = rings(cx - R0 - 1.5, cy - R0 - 1.5, cx + R0 + 1.5, cy + R0 + 1.5, R0 + 1.5, 1);
    mk("path", { d: poly(ringAt(P, socket, 0)), class: "nf dash" }, g);
    toks.push({ i, j, stat: STAT[j * N + i] });
  }
  // Each round merges along one axis, alternating, so the survivor walks to the middle.
  const key = (t, m) => [m >= 1 ? t.i >> (m >= 3 ? 2 : 1) : t.i, m >= 2 ? t.j >> (m >= 4 ? 2 : 1) : t.j].join();
  const centre = (t, m) => [m >= 3 ? MID : m >= 1 ? ((t.i >> 1) * 2 + 1) * CELL : (t.i + 0.5) * CELL,
    m >= 4 ? MID : m >= 2 ? ((t.j >> 1) * 2 + 1) * CELL : (t.j + 0.5) * CELL];
  const far = (t) => Math.hypot(t.i - S[0], t.j - S[1]) + (t.i + t.j * N) * 1e-3;
  for (let m = 0; m <= 4; m++) {
    const groups = new Map();
    for (const t of toks) { const k = key(t, m); if (!groups.has(k)) groups.set(k, []); groups.get(k).push(t); }
    for (const members of groups.values()) {
      const lead = members.reduce((a, b) => (far(b) < far(a) ? b : a));
      const sum = members.reduce((a, b) => a + b.stat, 0);
      for (const t of members) { t["lead" + m] = lead === t; t["sum" + m] = sum; }
    }
  }
  // Each token's lid carries as many dither dots as its largest possible self needs.
  for (const t of toks) {
    let top = 0;
    for (let m = 0; m <= 4; m++) if (t["lead" + m]) top = m;
    const big = t["sum" + top], reach = Math.ceil((radius(big) - 1.6) / DOT);
    t.lid = t.i === S[0] && t.j === S[1] ? "dot" : "dot m";
    t.el = mk("g", {}, g);
    t.body = solid(t.el);
    t.dots = [];
    for (let a = -reach; a <= reach; a++) for (let b = -reach; b <= reach; b++) {
      t.dots.push({ a, b, th: bayer(a & 7, b & 7), el: flatDot(t.el, C, 0.5, t.lid), on: true });
    }
    // and its wall, on the half that faces the camera
    const cols = Math.ceil((SPAN * radius(big)) / DOT), rows = Math.ceil((H0 * Math.pow(big, GMAX)) / DOT);
    for (let a = -cols; a <= cols; a++) for (let b = 0; b < rows; b++) {
      t.dots.push({ a, b, side: true, th: bayer(a & 7, b & 7), el: mk("circle", { r: 0.5, class: t.lid }, t.el), on: true });
    }
    t.drawn = "";
  }
  const whale = toks.find((t) => t.i === S[0] && t.j === S[1]);
  whale.body.sil.classList.add("hi");

  const round = spring(0);
  let order = "";

  function pose(t, r) {
    const m = Math.min(3, Math.floor(r)), f = r >= 4 ? 1 : smooth(r - m), done = r >= 4;
    if (done) return t.lead4 ? { x: MID, y: MID, s: TOTAL, k: 1 } : null;
    if (!t["lead" + m]) return null;
    const [x0, y0] = centre(t, m), [x1, y1] = centre(t, m + 1);
    const wins = t["lead" + (m + 1)];
    return {
      x: lerp(x0, x1, f), y: lerp(y0, y1, f),
      s: wins ? lerp(t["sum" + m], t["sum" + (m + 1)], f) : t["sum" + m],
      k: wins ? 1 : 1 - f,
    };
  }

  function draw(t, q) {
    const sig = q ? [q.x, q.y, q.s, q.k, grow].map((v) => v.toFixed(2)).join() : "-";
    if (sig === t.drawn) return;
    t.drawn = sig;
    if (!q || q.k < 0.02) {
      t.el.setAttribute("display", "none");
      return;
    }
    t.el.removeAttribute("display");
    const R = radius(q.s) * q.k, H = height(q.s) * q.k;
    const [ring, inner] = rings(q.x - R, q.y - R, q.x + R, q.y + R, R, Math.min(0.9, R * 0.3));
    put(t.body, prism(P, front, ring, inner, 0, H));
    // Rarity, as dither: the rarer the token, the more of its lid is inked.
    const ink = 0.12 + 0.8 * (Math.log(q.s) / Math.log(TOTAL));
    for (const d of t.dots) {
      let on, at;
      if (d.side) {
        // the wall fades out towards the top, so the lid stays the densest print
        const th = FACE + (d.a * DOT * q.k) / R, z = (d.b + 0.7) * DOT * q.k;
        on = Math.abs(th - FACE) < SPAN && z < H - 1.4 && d.th < ink * (1 - (0.55 * z) / H);
        at = P(q.x + R * Math.cos(th), q.y + R * Math.sin(th), z);
      } else {
        on = d.th < ink && Math.hypot(d.a, d.b) * DOT * q.k < R - 1.6;
        at = P(q.x + d.a * DOT * q.k, q.y + d.b * DOT * q.k, H);
      }
      if (on !== d.on) { d.on = on; on ? d.el.removeAttribute("display") : d.el.setAttribute("display", "none"); }
      if (on) place(d.el, at);
    }
  }

  function frame() {
    const live = [];
    for (const t of toks) { const q = pose(t, round.x); draw(t, q); if (q) live.push([t, q]); }
    // Back to front by depth; a token being eaten goes behind its buyer.
    live.sort((a, b) => a[1].x + a[1].y - (b[1].x + b[1].y) || a[1].s * a[1].k - b[1].s * b[1].k);
    const now = live.map(([t]) => toks.indexOf(t)).join();
    if (now !== order) { order = now; for (const [t] of live) g.appendChild(t.el); }
  }

  const B = register(stage, (dt) => { const m = stepS(round, dt); frame(); return m; });
  bag.add(B.unregister);

  // The pointer's x across the plinth's corners is the market's progress. The plinth never moves.
  const xl = P(0, EXT, 0)[0], xr = P(EXT, 0, 0)[0];
  function to(r) {
    round.t = r;
    read.textContent = r <= 0 ? "rest" : `supply ${String(toks.filter((t) => t["lead" + Math.round(r)]).length).padStart(2, "0")}`;
    B.wake();
  }
  bag.add(pointer(stage, {
    move: (p) => to(clamp(((p[0] - xl) / (xr - xl)) * 4.6 - 0.3, 0, 4)),
    leave: () => to(0),
  }));
  bag.add(() => svg.replaceChildren());

  return {
    set: (v) => { grow = v; frame(); B.wake(); },
    destroy: bag.dispose,
  };
}

hairline({
  name: "bracket",
  means: "Every sale burns a token into its buyer: across the market, sixteen tokens fold into one.",
  rules: [1, 3, 5, 8],
  range: [0.6, 0.74, 0.86],
  mount,
});
