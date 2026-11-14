# Juego Pibes

Juego de carreras para jugar entre amigos: la carrera se ve en una pantalla grande y cada jugador maneja desde su celular.

## Cómo jugar

```bash
npm install
npm start
```

1. Abrí `http://localhost:3000/host` en la compu conectada a la tele (pantalla grande).
2. Cada jugador escanea el QR con el celular (tienen que estar en la misma red wifi) o entra a la dirección que aparece y pone el código de sala.
3. En el celular se elige nombre, auto (26 diseños) y color.
4. El primer jugador que entra es el anfitrión: desde su celular (o desde la pantalla grande) elige pista, vueltas, bots y modo (carrera única o torneo) y larga la carrera.

## Controles

Los autos aceleran solos. En el celular hay tres botones:

- **◀ / ▶**: doblar.
- **Centro**: nitro. Se usa cuando está cargado y se recarga solo en unos 9 segundos.

Los autos chocan entre sí, la banquina frena y hay muro al borde.

## Pistas y torneo

Hay 6 pistas con distinto paisaje y ancho; cada una tiene tramos que se ensanchan y se angostan.

En modo torneo se corren de 2 a 8 carreras seguidas en pistas distintas, empezando por la elegida. Cada carrera da puntos por posición (25, 18, 15, 12, 10, 8, 6, 4, 3, 2, 1) y al final gana el que más suma.

## Estructura

- `server.js`: servidor HTTP + WebSocket, salas y bucle del juego.
- `lib/game.js`: física de la carrera (corre en el servidor).
- `public/shared/tracks.js`: pistas (compartido entre servidor y navegador).
- `public/shared/cars.js`: diseños de los autos.
- `public/host.*`: pantalla grande. `public/play.*`: control del celular.
- `test/sim.js`: `npm test` valida las pistas y corre carreras de bots.

Para probar sin celulares: `http://localhost:3000/host?demo=8` larga una carrera de 8 bots (con `&track=3` se elige la pista y con `&races=3` se corre un torneo). En la página del control también funcionan las flechas y la barra espaciadora.
