// Prueba sin navegador: valida la geometría de las pistas y corre una carrera de bots en cada una.
const assert = require('assert');
const Tracks = require('../public/shared/tracks.js');
const { Race } = require('../lib/game.js');

for (let ti = 0; ti < Tracks.DEFS.length; ti++) {
  const tk = Tracks.build(ti);
  const N = tk.N;
  // Radio mínimo de curva
  let minR = Infinity;
  for (let i = 0; i < N; i++) {
    const j = (i + 6) % N;
    const da = Math.abs(Math.atan2(tk.tx[i] * tk.ty[j] - tk.ty[i] * tk.tx[j], tk.tx[i] * tk.tx[j] + tk.ty[i] * tk.ty[j]));
    if (da > 1e-6) minR = Math.min(minR, (6 * Tracks.STEP) / da);
  }
  // Distancia mínima entre tramos no contiguos (los cruces dan 0)
  let minD = Infinity;
  for (let i = 0; i < N; i++) for (let j = i + 40; j < N; j++) {
    if (N - j + i < 40) continue;
    const d = Math.hypot(tk.x[i] - tk.x[j], tk.y[i] - tk.y[j]);
    if (d < minD) minD = d;
  }
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  for (let i = 0; i < N; i++) {
    minX = Math.min(minX, tk.x[i]); maxX = Math.max(maxX, tk.x[i]);
    minY = Math.min(minY, tk.y[i]); maxY = Math.max(maxY, tk.y[i]);
  }
  const margin = tk.width / 2 + tk.runoff;
  assert(minX > margin && minY > margin && maxX < Tracks.WORLD.w - margin && maxY < Tracks.WORLD.h - margin,
    `${tk.name}: se sale del mundo (${minX | 0},${minY | 0})-(${maxX | 0},${maxY | 0})`);
  assert(minR > 125, `${tk.name}: curva demasiado cerrada (${minR | 0})`);

  const laps = 2;
  const race = new Race(tk, laps, Array.from({ length: 8 }, (_, i) => ({ pid: 'b' + i, bot: true })));
  let steps = 0;
  while (!race.over && steps < 60 * 400) { race.step(1 / 60); steps++; }
  const times = race.cars.map((c) => c.time).filter((t) => t !== null).sort((a, b) => a - b);
  console.log(`${tk.name}: largo ${tk.length | 0}px, radio mín ${minR | 0}, separación mín ${minD | 0}, ` +
    `llegaron ${times.length}/8, mejor ${times[0] && times[0].toFixed(1)}s (${laps} vueltas)`);
  assert(times.length >= 7, `${tk.name}: los bots no terminan la carrera`);
  JSON.stringify(race.snapshot([]));
}
console.log('OK');
