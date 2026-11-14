// Definición de pistas. Se usa tanto en el servidor (física) como en el navegador (dibujo).
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.Tracks = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  const WORLD = { w: 4000, h: 2300 };
  const RUNOFF = 60; // banquina a cada lado antes del muro
  const STEP = 20; // distancia entre muestras de la línea central

  // Puntos de control en unidades de 100 px. El primero es la largada y
  // los anteriores deben formar una recta para la grilla.
  // Cada pista tiene su ancho base (w), un paisaje (theme) y tramos que se
  // ensanchan y angostan: amp es cuánto varía el ancho y waves cuántas veces por vuelta.
  const DEFS = [
    {
      id: 'pibes', name: 'Circuito Los Pibes', theme: 'pasto', w: 190, amp: 0.14, waves: 3,
      pts: [
        [20, 20], [32, 20], [36.5, 17], [34, 13.5], [28, 13], [25, 10], [28, 7], [34, 7.8], [37, 5.2],
        [34, 2.5], [27, 3], [22, 5.5], [19, 10], [15.5, 12], [13, 9], [15, 5], [12, 2.5], [6, 3],
        [3, 6.5], [5.5, 9.5], [7.5, 13], [4, 16.3], [4.5, 19.5], [8, 20.5], [14, 20],
      ],
    },
    {
      id: 'fideo', name: 'El Fideo', theme: 'desierto', w: 170, amp: 0.1, waves: 5,
      pts: [
        [24, 20.5], [33, 20.5], [37, 17.5], [34, 14.5], [26, 15], [18, 14.5], [11, 15.5], [7.5, 13],
        [10, 10], [16, 9.5], [23, 10], [31, 9.5], [36.5, 7], [35, 3], [29, 2.5], [25, 5], [21, 3],
        [16, 2.5], [12, 5], [7, 2.5], [3, 5], [3, 11], [2.5, 17], [5.5, 20.5], [14, 20.5],
      ],
    },
    {
      id: 'ocho', name: 'El Ocho Loco', theme: 'noche', w: 200, amp: 0.12, waves: 2,
      pts: [
        [12, 20.3], [15.5, 17.5], [17.6, 14.4], [20, 11.5], [22.6, 8.4], [26, 4.5], [31, 2.5],
        [36, 4.5], [37.5, 8.5], [35, 12.7], [36.8, 17], [34, 20], [29, 20.5], [25, 17.5],
        [22.4, 14.4], [20, 11.5], [17.6, 8.6], [14.5, 4.5], [10, 2.5], [5, 3.5], [2.5, 7],
        [5, 11], [3, 15], [3.5, 18.5], [7, 20.5],
      ],
    },
    {
      id: 'herradura', name: 'La Herradura', theme: 'playa', w: 230, amp: 0.2, waves: 4,
      pts: [
        [26, 20.3], [33, 19], [36.8, 14], [36.5, 7], [32, 3], [26, 3.2], [23, 6],
        [25, 9.5], [29, 10.5], [30.5, 13.2], [27, 15.3], [20, 15], [13, 15.3], [9.5, 13.2],
        [11, 10.5], [15, 9.5], [17, 6], [14, 3.2], [8, 3], [3.5, 7], [3.2, 14], [7, 19], [14, 20.3],
      ],
    },
    {
      id: 'serpiente', name: 'La Serpiente', theme: 'nieve', w: 160, amp: 0.08, waves: 6,
      pts: [
        [20, 20.3], [31, 20.3], [36, 17.5], [35.8, 12], [33.5, 6.5], [30, 3.3], [27, 6.5],
        [27, 11.5], [24, 14.8], [21, 11.5], [21, 6.5], [18, 3.3], [15, 6.5], [15, 11.5], [12, 14.8],
        [9, 11.5], [9.4, 6.8], [6.2, 3.2], [3, 7], [3.1, 13], [3.5, 18], [8, 20.3],
      ],
    },
    {
      id: 'autodromo', name: 'Autódromo Trucho', theme: 'ciudad', w: 210, amp: 0.18, waves: 3,
      pts: [
        [24, 20.3], [33, 20], [36.8, 16.5], [35, 12.5], [31, 11.5], [29, 8.5], [31.5, 5.5],
        [30, 3], [24, 3], [20.5, 5.8], [21, 9.5], [25, 12], [24.5, 15.2], [20, 16], [15, 14.2],
        [14.2, 10], [14.8, 6], [12.5, 3], [8, 3], [4, 5.5], [3.2, 10], [3.5, 15], [5, 19], [8, 20.2], [12, 20.3],
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
    // Ancho variable: medio ancho del asfalto en cada muestra (en la largada vale el ancho base)
    const half = new Float32Array(N);
    let minHalf = Infinity, maxHalf = 0;
    for (let i = 0; i < N; i++) {
      half[i] = (def.w / 2) * (1 + def.amp * Math.sin((2 * Math.PI * def.waves * i) / N));
      minHalf = Math.min(minHalf, half[i]);
      maxHalf = Math.max(maxHalf, half[i]);
    }
    return { index, id: def.id, name: def.name, theme: def.theme, N, x, y, tx, ty, half, minHalf, maxHalf, length, runoff: RUNOFF };
  }

  return { WORLD, RUNOFF, STEP, DEFS, build, names: DEFS.map((d) => d.name) };
});
