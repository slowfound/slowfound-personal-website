/**
 * Tug: a long tray of whitelist spots split between two factions by a
 * sliding wall, a faction hall at either end. Every spot is a dot on the
 * floor, and what a spot is worth is printed in ordered dither: the fewer
 * spots a side holds, the more of its dots are inked. The pointer drags the
 * wall: steal spots and your side grows, and every spot on it, yours
 * included, fades. The read-out is the split. The slider is how far the wall
 * can be pushed.
 *
 * The pattern: a continuous field. One spring on the wall, a hit on the floor
 * plane (which never moves), and dither as the value of a spot.
 */
const {
  Cam, clamp, facing, fit, flatDot, mk, place, pointer, prism, proj, put, register, rings,
  solid, spring, stepS, unproj, disposer,
} = HL;

const W = 132, D = 46, COLS = 24, ROWS = 8, WALL = 20, HALL = 26, PB = 4;
/** Where the wall stands at rest: someone has already stolen a little. */
const REST = 0.537;

function bayer(a, b) {
  let v = 0;
  for (let bit = 0, s = 1; bit < 3; bit++, s *= 4) {
    const x = (a >> bit) & 1, y = (b >> bit) & 1;
    v += ((x ^ y) * 2 + y) / (s * 4);
  }
  return v * (64 / 63);
}

function mount({ stage, svg, read }, value) {
  const bag = disposer();
  let reach = value;

  const C = Cam(45, 0.5, 1.72);
  fit(C, [[-20, -6, -PB], [W + 20, D + 6, -PB], [W + 20, -6, -PB], [-20, D + 6, -PB], [-12, 4, HALL], [W + 12, 4, HALL]], 200, 168);
  const P = proj(C), front = facing(C);

  const g = mk("g", {}, svg);
  const [pr, pi] = rings(-20, -6, W + 20, D + 6, 9, 2);
  put(solid(g), prism(P, front, pr, pi, -PB, 0));
  // The left hall stands at the back, painted first; the right one goes after the wall.
  function hall(x0) {
    const s = solid(g);
    const [r, i] = rings(x0, 2, x0 + 14, D - 2, 4, 1.2);
    put(s, prism(P, front, r, i, 0, HALL));
    // a door, on the face towards the viewer
    const dx = x0 + 7, fy = D - 2;
    mk("path", { class: "nf lo", d: "M" + [P(dx - 3.5, fy, 0), P(dx - 3.5, fy, 11), P(dx + 3.5, fy, 11), P(dx + 3.5, fy, 0)].map((p) => p.join(" ")).join("L") }, g);
    return s;
  }
  hall(-18);

  // Every spot, a dot on the floor, with its own dither threshold.
  const spots = [];
  for (let c = 0; c < COLS; c++) for (let r = 0; r < ROWS; r++) {
    const x = (c + 0.5) * (W / COLS), y = 5 + (r + 0.5) * ((D - 10) / ROWS);
    const el = flatDot(g, C, 0.75, "dot off");
    place(el, P(x, y, 0));
    spots.push({ x, el, th: bayer(c, r), cls: "dot off" });
  }

  const wall = solid(g);
  const knob = solid(g);
  hall(W + 4);
  wall.sil.classList.add("hi");
  knob.sil.classList.add("hi");

  const at = spring(REST * W);
  let drawn = NaN;

  function draw() {
    const x = at.x;
    if (x === drawn) return;
    drawn = x;
    const [r, i] = rings(x - 1.4, -3, x + 1.4, D + 3, 1.2, 0.5);
    put(wall, prism(P, front, r, i, 0, WALL));
    const [kr, ki] = rings(x - 3, D / 2 - 6, x + 3, D / 2 + 6, 2.5, 0.8);
    put(knob, prism(P, front, kr, ki, WALL, WALL + 3));
    // A spot is worth more the fewer of them its side holds: 500 a side inks half the dots.
    const left = x / W, worth = (share) => clamp(0.25 / Math.max(share, 0.02), 0, 1);
    const wl = worth(left), wr = worth(1 - left);
    for (const s of spots) {
      const cls = s.th < (s.x < x ? wl : wr) ? "dot m" : "dot off";
      if (cls !== s.cls) { s.cls = cls; s.el.setAttribute("class", cls); }
    }
  }

  const B = register(stage, (dt) => { const m = stepS(at, dt); draw(); return m; });
  bag.add(B.unregister);

  function to(x, over) {
    const lo = W * (1 - reach), hi = W * reach;
    at.t = clamp(x, lo, hi);
    const l = Math.round((at.t / W) * 1000);
    read.textContent = over ? `${l} · ${1000 - l}` : "rest";
    B.wake();
  }

  bag.add(pointer(stage, {
    move: (p) => to(unproj(C, p[0], p[1], 0)[0], true),
    leave: () => to(REST * W, false),
  }));
  bag.add(() => svg.replaceChildren());

  return {
    set: (v) => { reach = v; to(at.t, read.textContent !== "rest"); },
    destroy: bag.dispose,
  };
}

hairline({
  name: "tug",
  means: "Two factions split a thousand whitelist spots. Drag the wall to steal some, and watch every spot on your side lose value.",
  rules: [1, 3, 4, 5],
  range: [0.65, 0.8, 0.94],
  mount,
});
