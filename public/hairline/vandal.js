/**
 * Vandal: a villa of modular rooms on a plinth, solved so every outside face
 * is a wall. Walls are printed in ordered dither, denser on the side away
 * from the light, so the building is shaded by its own print. The pointer
 * picks a column and demolishes it from the foundation up: each room is
 * crushed and the ones above drop into its place. The building re-solves,
 * growing dithered walls on every face the hole exposed, spreading out from
 * it. The read-out counts the rooms lost and the walls built in their place.
 * The slider is the stagger.
 *
 * The pattern: discrete items. Tweens, a stagger by distance, a hit test on
 * each column's rest top, and dither as the wall material, not decoration.
 */
const {
  Cam, clamp, facing, fit, mk, place, pointer, poly, prism, proj, put, register, ringAt, rings,
  solid, tdone, tset, tval, tween, unproj, disposer,
} = HL;

const NX = 4, NY = 3, CELL = 22, SH = 13, IN = 0.8, DOT = 1.85, PB = 4;
/** Storeys per column, row by row from the back. */
const REST = [
  1, 2, 3, 2,
  1, 2, 2, 1,
  1, 1, 2, 1,
];
/** Ink per face: the +y side is in shade, the +x side in light. */
const INK = { x: 0.42, y: 0.78 };

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
  let stag = value, act = -1;
  const EX = NX * CELL, EY = NY * CELL;

  const C = Cam(45, 0.5, 2.2);
  fit(C, [[-6, -6, -PB], [EX + 6, EY + 6, -PB], [EX + 6, -6, -PB], [-6, EY + 6, -PB], [2.5 * CELL, 0.5 * CELL, 3 * SH]], 200, 170);
  const P = proj(C), front = facing(C);

  const g = mk("g", {}, svg);
  const [pr, pi] = rings(-6, -6, EX + 6, EY + 6, 9, 2);
  put(solid(g), prism(P, front, pr, pi, -PB, 0));

  // Columns back to front; each one's lot, then its rooms upwards, each room with its two walls.
  const cols = [];
  for (let s = 0; s <= NX + NY - 2; s++) for (let i = 0; i < NX; i++) {
    const j = s - i;
    if (j < 0 || j >= NY) continue;
    const x0 = i * CELL + IN, y0 = j * CELL + IN, x1 = x0 + CELL - 2 * IN, y1 = y0 + CELL - 2 * IN;
    const [lot] = rings(x0, y0, x1, y1, 1.4, 0.6);
    mk("path", { d: poly(ringAt(P, lot, 0)), class: "nf dash" }, g);
    const rr = rings(x0, y0, x1, y1, 1.4, 0.6), rooms = [];
    for (let k = 0; k < REST[j * NX + i]; k++) {
      const el = mk("g", {}, g), body = solid(el), walls = {};
      for (const side of ["x", "y"]) {
        const span = side === "x" ? y1 - y0 : x1 - x0, dots = [], na = Math.floor(span / DOT), nb = Math.floor(SH / DOT);
        for (let a = 0; a < na; a++) for (let b = 0; b < nb; b++) {
          // a window: the print stops, and the gap is the opening
          if (a >= 3 && a <= na - 4 && b >= 2 && b <= nb - 3) continue;
          dots.push({ a, b, th: bayer(a + k * 3, b + (side === "x" ? 0 : 4)), el: mk("circle", { r: 0.75, class: "dot m" }, el), on: true });
        }
        const off = (span - na * DOT) / 2 + DOT / 2;
        // the window's frame, at the edges of the gap in the print
        const frame = { u0: off + 2.5 * DOT, u1: off + (na - 3.5) * DOT, v0: 1.5 * DOT, v1: (nb - 2.5) * DOT };
        walls[side] = { ink: tween(0), dots, off, frame, line: mk("path", { class: "nf lo" }, el) };
      }
      rooms.push({ el, body, walls, h: tween(SH), drawn: "" });
    }
    cols.push({ i, j, x0, y0, x1, y1, rr, rooms, rest: rooms.length });
  }
  const at = (i, j) => cols.find((c) => c.i === i && c.j === j);
  const tallest = cols.reduce((a, b) => (b.rest > a.rest ? b : a));

  /** Live storeys in a column, with the column `gone` demolished. */
  const height = (c, gone) => (c === gone ? 0 : c.rest);
  /** A face is a wall when nothing stands against it at that storey. */
  function isWall(c, k, side, gone) {
    if (c === gone) return false;
    const nb = side === "x" ? at(c.i + 1, c.j) : at(c.i, c.j + 1);
    return !nb || height(nb, gone) <= k;
  }
  /** Every room's walls, solved. Returns how many walls the knock-out made it build. */
  function solve(gone, now, from) {
    let built = 0;
    for (const c of cols) {
      const delay = from ? Math.hypot(c.i - from.i, c.j - from.j) * stag : 0;
      c.rooms.forEach((room, k) => {
        // A demolished column goes from the bottom, so what stands on a room drops as it is crushed.
        const crushed = c === gone;
        tset(room.h, crushed ? 0 : SH, now, crushed ? k * 110 : delay);
        for (const side of ["x", "y"]) {
          const wall = isWall(c, k, side, gone);
          if (wall && !isWall(c, k, side, null)) built++;
          tset(room.walls[side].ink, wall ? INK[side] : 0, now, delay + (crushed ? 0 : 120));
        }
      });
    }
    return built;
  }

  function draw(c, now) {
    let z = 0, moving = false;
    for (const room of c.rooms) {
      const h = tval(room.h, now), ix = tval(room.walls.x.ink, now), iy = tval(room.walls.y.ink, now);
      if (!tdone(room.h, now) || !tdone(room.walls.x.ink, now) || !tdone(room.walls.y.ink, now)) moving = true;
      const sig = [z, h, ix, iy].map((v) => v.toFixed(2)).join();
      if (sig !== room.drawn) {
        room.drawn = sig;
        if (h < 0.05) room.el.setAttribute("display", "none");
        else {
          room.el.removeAttribute("display");
          put(room.body, prism(P, front, c.rr[0], c.rr[1], z, z + h));
          for (const side of ["x", "y"]) {
            const w = room.walls[side], ink = side === "x" ? ix : iy;
            const f = w.frame, base = side === "x" ? c.y0 : c.x0, k = h / SH;
            const on3 = (u, v) => (side === "x" ? P(c.x1, base + u, z + v * k) : P(base + u, c.y1, z + v * k));
            w.line.setAttribute("d", ink > 0.1 ? poly([on3(f.u0, f.v0), on3(f.u1, f.v0), on3(f.u1, f.v1), on3(f.u0, f.v1)]) : "");
            for (const d of w.dots) {
              const zz = z + (d.b + 0.5) * DOT * (h / SH), u = (side === "x" ? c.y0 : c.x0) + w.off + d.a * DOT;
              const on = d.th < ink && zz < z + h - 1;
              if (on !== d.on) { d.on = on; on ? d.el.removeAttribute("display") : d.el.setAttribute("display", "none"); }
              if (on) place(d.el, side === "x" ? P(c.x1, u, zz) : P(u, c.y1, zz));
            }
          }
        }
      }
      z += h;
    }
    return moving;
  }

  function light(c) {
    for (const x of cols) for (const room of x.rooms) room.body.sil.classList.toggle("hi", x === c);
  }

  const B = register(stage, (_dt, now) => {
    let moving = false;
    for (const c of cols) if (draw(c, now)) moving = true;
    return moving;
  });
  bag.add(B.unregister);
  solve(null, performance.now(), null);
  light(tallest);

  /** The column whose rest top the pointer is over, nearest its middle. */
  function hit(sx, sy) {
    let best = -1, bd = Infinity;
    cols.forEach((c, k) => {
      const [x, y] = unproj(C, sx, sy, c.rest * SH);
      const dx = Math.abs(x - (c.x0 + c.x1) / 2), dy = Math.abs(y - (c.y0 + c.y1) / 2);
      if (dx < CELL / 2 && dy < CELL / 2 && dx + dy < bd) { bd = dx + dy; best = k; }
    });
    return best;
  }

  function choose(a) {
    if (a === act) return;
    const now = performance.now(), from = cols[a >= 0 ? a : act];
    act = a;
    const built = solve(a >= 0 ? cols[a] : null, now, from);
    light(a >= 0 ? cols[a] : tallest);
    read.textContent = a < 0 ? "rest" : `rooms −${cols[a].rest} · walls +${built}`;
    B.wake();
  }

  bag.add(pointer(stage, { move: (p) => choose(hit(p[0], p[1])), leave: () => choose(-1) }));
  bag.add(() => svg.replaceChildren());

  return {
    set: (v) => { stag = clamp(v, 0, 200); },
    destroy: bag.dispose,
  };
}

hairline({
  name: "vandal",
  means: "Demolish a column of rooms and the villa re-solves: it collapses from the bottom, and every face it exposed grows a wall.",
  rules: [1, 2, 5, 6],
  range: [0, 50, 110],
  mount,
});
