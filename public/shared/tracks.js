// Definición de pistas. Se usa tanto en el servidor (física) como en el navegador (dibujo).
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.Tracks = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  const WORLD = { w: 4000, h: 2300 };
  const TRACK_W = 190; // ancho del asfalto
  const RUNOFF = 60; // banquina a cada lado antes del muro
  const STEP = 20; // distancia entre muestras de la línea central

  // Puntos de control en unidades de 100 px. El primero es la largada y
  // los anteriores deben formar una recta para la grilla.
  const DEFS = [
    {
      id: 'pibes',
      name: 'Circuito Los Pibes',
      pts: [
        [20, 20], [32, 20], [36.5, 17], [34, 13.5], [28, 13], [25, 10], [28, 7], [34, 7.8], [37, 5.2],
        [34, 2.5], [27, 3], [22, 5.5], [19, 10], [15.5, 12], [13, 9], [15, 5], [12, 2.5], [6, 3],
        [3, 6.5], [5.5, 9.5], [7.5, 13], [4, 16.3], [4.5, 19.5], [8, 20.5], [14, 20],
      ],
    },
    {
      id: 'fideo',
      name: 'El Fideo',
      pts: [
        [24, 20.5], [33, 20.5], [37, 17.5], [34, 14.5], [26, 15], [18, 14.5], [11, 15.5], [7.5, 13],
        [10, 10], [16, 9.5], [23, 10], [31, 9.5], [36.5, 7], [35, 3], [29, 2.5], [25, 5], [21, 3],
        [16, 2.5], [12, 5], [7, 2.5], [3, 5], [3, 11], [2.5, 17], [5.5, 20.5], [14, 20.5],
      ],
    },
    {
      id: 'ocho',
      name: 'El Ocho Loco',
      pts: [
        [12, 20.3], [15.5, 17.5], [17.6, 14.4], [20, 11.5], [22.6, 8.4], [26, 4.5], [31, 2.5],
        [36, 4.5], [37.5, 8.5], [35, 12.7], [36.8, 17], [34, 20], [29, 20.5], [25, 17.5],
        [22.4, 14.4], [20, 11.5], [17.6, 8.6], [14.5, 4.5], [10, 2.5], [5, 3.5], [2.5, 7],
        [5, 11], [3, 15], [3.5, 18.5], [7, 20.5],
      ],
    },
  ];

  function catmull(p0, p1, p2, p3, t) {
    const t2 = t * t, t3 = t2 * t;
    return 0.5 * (2 * p1 + (-p0 + p2) * t + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t2 + (-p0 + 3 * p1 - 3 * p2 + p3) * t3);
  }

  function build(index) {
    const def = DEFS[index];
    const P = def.pts.map((p) => [p[0] * 100, p[1] * 100]);
    const n = P.length;
    const dense = [];
    for (let i = 0; i < n; i++) {
      const p0 = P[(i + n - 1) % n], p1 = P[i], p2 = P[(i + 1) % n], p3 = P[(i + 2) % n];
      for (let k = 0; k < 40; k++) {
        const t = k / 40;
        dense.push([catmull(p0[0], p1[0], p2[0], p3[0], t), catmull(p0[1], p1[1], p2[1], p3[1], t)]);
      }
    }
    // Remuestreo a distancia constante
    const cum = [0];
    for (let i = 0; i < dense.length; i++) {
      const a = dense[i], b = dense[(i + 1) % dense.length];
      cum.push(cum[i] + Math.hypot(b[0] - a[0], b[1] - a[1]));
    }
    const length = cum[dense.length];
    const N = Math.round(length / STEP);
    const x = new Float32Array(N), y = new Float32Array(N), tx = new Float32Array(N), ty = new Float32Array(N);
    let j = 0;
    for (let i = 0; i < N; i++) {
      const d = (i * length) / N;
      while (cum[j + 1] < d) j++;
      const a = dense[j], b = dense[(j + 1) % dense.length];
      const f = (d - cum[j]) / (cum[j + 1] - cum[j] || 1);
      x[i] = a[0] + (b[0] - a[0]) * f;
      y[i] = a[1] + (b[1] - a[1]) * f;
    }
    for (let i = 0; i < N; i++) {
      const a = (i + N - 1) % N, b = (i + 1) % N;
      const dx = x[b] - x[a], dy = y[b] - y[a], l = Math.hypot(dx, dy) || 1;
      tx[i] = dx / l;
      ty[i] = dy / l;
    }
    // Cajas de poderes: filas de 3 repartidas por la pista
    const items = [];
    for (const f of [0.1, 0.22, 0.34, 0.46, 0.58, 0.7, 0.82, 0.93]) {
      const i = Math.floor(f * N);
      for (const off of [-60, 0, 60]) {
        items.push({ i, x: x[i] - ty[i] * off, y: y[i] + tx[i] * off });
      }
    }
    return { index, id: def.id, name: def.name, N, x, y, tx, ty, length, width: TRACK_W, runoff: RUNOFF, items };
  }

  return { WORLD, TRACK_W, RUNOFF, STEP, DEFS, build, names: DEFS.map((d) => d.name) };
});
