// Simulación de la carrera (autoritativa en el servidor).
const R = 24; // radio de choque del auto
const VMAX = 470, VNITRO = 690, VGRASS = 210;
const TURN = 2.9;
const NITRO_TIME = 2.6; // duración del nitro
const NITRO_RECHARGE = 9; // segundos que tarda en recargarse después de usarlo

function wrapAngle(a) {
  while (a > Math.PI) a -= 2 * Math.PI;
  while (a < -Math.PI) a += 2 * Math.PI;
  return a;
}

class Race {
  constructor(track, laps, entries) {
    this.tk = track;
    this.laps = laps;
    this.t = -4;
    this.events = [];
    this.firstFinish = null;
    this.over = false;
    const N = track.N;
    this.cars = entries.map((e, i) => {
      const row = Math.floor(i / 2), col = i % 2;
      const idx = N - 6 - row * 6 - col * 3;
      const off = col ? 50 : -50;
      return {
        pid: e.pid, bot: !!e.bot,
        x: track.x[idx] - track.ty[idx] * off,
        y: track.y[idx] + track.tx[idx] * off,
        a: Math.atan2(track.ty[idx], track.tx[idx]),
        vx: 0, vy: 0, idx, prog: idx - N,
        steer: 0, charge: 1, nitro: 0,
        finished: false, time: null, wrong: 0,
        botOff: (Math.random() - 0.5) * 80, botSkill: 0.84 + Math.random() * 0.12, botWait: 1 + Math.random() * 6,
      };
    });
  }

  car(pid) { return this.cars.find((c) => c.pid === pid); }

  // Piloto automático para el auto de un jugador desconectado
  setAuto(pid, on) {
    const c = this.car(pid);
    if (c) { c.auto = on; c.steer = 0; }
  }

  setSteer(pid, s) {
    const c = this.car(pid);
    if (c) c.steer = s > 0 ? 1 : s < 0 ? -1 : 0;
  }

  // El nitro se usa cuando está cargado del todo y después se recarga solo
  usePower(pid) {
    const c = this.car(pid);
    if (!c || c.charge < 1 || c.finished || this.t < 0) return;
    c.charge = 0;
    c.nitro = NITRO_TIME;
  }

  botThink(c, dt) {
    const tk = this.tk, N = tk.N;
    const speed = Math.hypot(c.vx, c.vy);
    const look = (c.idx + 5 + Math.floor(speed / 70) + N) % N;
    const txp = tk.x[look] - tk.ty[look] * c.botOff, typ = tk.y[look] + tk.tx[look] * c.botOff;
    const diff = wrapAngle(Math.atan2(typ - c.y, txp - c.x) - c.a);
    c.steer = diff > 0.05 ? 1 : diff < -0.05 ? -1 : 0;
    if (c.charge >= 1 && !c.finished) {
      c.botWait -= dt;
      if (c.botWait <= 0) { this.usePower(c.pid); c.botWait = 1 + Math.random() * 6; }
    }
  }

  step(dt) {
    this.t += dt;
    if (this.t < 0 || this.over) return;
    const tk = this.tk, N = tk.N;

    for (const c of this.cars) {
      if (c.bot || c.finished || c.auto) this.botThink(c, dt);
      const speed = Math.hypot(c.vx, c.vy);
      c.a += c.steer * TURN * Math.min(1, speed / 120) * dt;
      c.a = wrapAngle(c.a);
      const fx = Math.cos(c.a), fy = Math.sin(c.a);
      let vf = c.vx * fx + c.vy * fy;
      let vl = -c.vx * fy + c.vy * fx;

      // Punto más cercano de la pista, buscado solo cerca del progreso actual
      let best = c.idx, bd = Infinity;
      for (let k = -8; k <= 25; k++) {
        const i = (c.idx + k + N) % N;
        const dx = c.x - tk.x[i], dy = c.y - tk.y[i], d = dx * dx + dy * dy;
        if (d < bd) { bd = d; best = i; }
      }
      let delta = best - c.idx;
      if (delta > N / 2) delta -= N;
      if (delta < -N / 2) delta += N;
      c.idx = best;
      c.prog += delta;
      const nx = -tk.ty[best], ny = tk.tx[best];
      const lat = (c.x - tk.x[best]) * nx + (c.y - tk.y[best]) * ny;
      const half = tk.half[best], wall = half + tk.runoff - R;
      const onGrass = Math.abs(lat) > half;

      let vmax = VMAX, k = 1.25, grip = 7;
      if (c.bot) vmax *= c.botSkill;
      if (c.nitro > 0) { c.nitro -= dt; vmax = VNITRO; k = 2.6; }
      else if (c.charge < 1 && !c.finished) c.charge = Math.min(1, c.charge + dt / NITRO_RECHARGE);
      if (onGrass) { vmax = Math.min(vmax, c.nitro > 0 ? 330 : VGRASS); k = 2.6; }
      if (c.finished) { vmax = 230; k = 2; }
      vf += (vmax - vf) * Math.min(1, k * dt);
      vl *= Math.exp(-grip * dt);
      c.vx = fx * vf - fy * vl;
      c.vy = fy * vf + fx * vl;
      c.x += c.vx * dt;
      c.y += c.vy * dt;

      // Muro al borde de la banquina
      const lat2 = (c.x - tk.x[best]) * nx + (c.y - tk.y[best]) * ny;
      if (Math.abs(lat2) > wall) {
        const s = Math.sign(lat2);
        c.x -= nx * s * (Math.abs(lat2) - wall);
        c.y -= ny * s * (Math.abs(lat2) - wall);
        const vn = (c.vx * nx + c.vy * ny) * s;
        if (vn > 0) {
          c.vx -= nx * s * vn * 1.3;
          c.vy -= ny * s * vn * 1.3;
          c.vx *= 0.9; c.vy *= 0.9;
          if (vn > 140) this.events.push({ k: 'hit', pid: c.pid, x: Math.round(c.x), y: Math.round(c.y) });
        }
      }

      // Aviso de contramano
      const along = fx * tk.tx[best] + fy * tk.ty[best];
      c.wrong = along < -0.3 ? c.wrong + dt : 0;

      if (!c.finished && c.prog >= this.laps * N) {
        c.finished = true;
        c.time = this.t;
        c.charge = 0;
        c.nitro = 0;
        if (this.firstFinish === null) this.firstFinish = this.t;
        this.events.push({ k: 'fin', pid: c.pid });
      }
    }

    // Choques entre autos
    const cs = this.cars;
    for (let i = 0; i < cs.length; i++) {
      const a = cs[i];
      if (a.finished) continue;
      for (let j = i + 1; j < cs.length; j++) {
        const b = cs[j];
        if (b.finished) continue;
        const dx = b.x - a.x, dy = b.y - a.y, d2 = dx * dx + dy * dy;
        if (d2 >= 4 * R * R) continue;
        const d = Math.sqrt(d2) || 0.01, nx = dx / d, ny = dy / d, ov = 2 * R - d;
        a.x -= nx * ov / 2; a.y -= ny * ov / 2;
        b.x += nx * ov / 2; b.y += ny * ov / 2;
        const rv = (b.vx - a.vx) * nx + (b.vy - a.vy) * ny;
        if (rv < 0) {
          const imp = -(1 + 0.7) * rv / 2;
          a.vx -= nx * imp; a.vy -= ny * imp;
          b.vx += nx * imp; b.vy += ny * imp;
          if (rv < -60) {
            this.events.push({ k: 'hit', pid: a.pid, x: Math.round((a.x + b.x) / 2), y: Math.round((a.y + b.y) / 2) });
            this.events.push({ k: 'hit', pid: b.pid });
          }
        }
      }
    }

    const racing = cs.filter((c) => !c.finished);
    const humans = racing.filter((c) => !c.bot);
    const anyHuman = cs.some((c) => !c.bot);
    if (racing.length === 0 || (anyHuman && humans.length === 0) ||
        (this.firstFinish !== null && this.t > this.firstFinish + 30)) {
      this.over = true;
    }
  }

  // Índices de autos ordenados por posición en carrera
  ranking() {
    const idx = this.cars.map((_, i) => i);
    idx.sort((a, b) => {
      const A = this.cars[a], B = this.cars[b];
      if (A.finished && B.finished) return A.time - B.time;
      if (A.finished !== B.finished) return A.finished ? -1 : 1;
      return B.prog - A.prog;
    });
    return idx;
  }

  lapOf(c) {
    return Math.max(1, Math.min(this.laps, Math.floor(c.prog / this.tk.N) + 1));
  }

  snapshot(events) {
    return {
      t: 's',
      tm: Math.round(this.t * 100) / 100,
      c: this.cars.map((c) => [
        Math.round(c.x), Math.round(c.y), Math.round(c.a * 100) / 100,
        (c.nitro > 0 ? 1 : 0) | (c.finished ? 4 : 0),
      ]),
      r: this.ranking(),
      lp: this.cars.map((c) => this.lapOf(c)),
      ev: events,
    };
  }
}

module.exports = { Race, NITRO_TIME, NITRO_RECHARGE };
