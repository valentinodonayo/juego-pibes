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
4. El primer jugador que entra es el anfitrión: desde su celular (o desde la pantalla grande) elige pista, vueltas, bots y larga la carrera.

## Controles

Los autos aceleran solos. En el celular hay tres botones:

- **◀ / ▶**: doblar.
- **Centro**: usar el poder que tengas. Todos largan con un nitro y se consiguen más pasando por las cajas `?`.

Poderes: **Nitro** (más velocidad), **Aceite** (deja una mancha que hace trompear) y **Bocinazo** (empuja a los autos cercanos).

Los autos chocan entre sí, la banquina frena y hay muro al borde.

## Estructura

- `server.js`: servidor HTTP + WebSocket, salas y bucle del juego.
- `lib/game.js`: física de la carrera (corre en el servidor).
- `public/shared/tracks.js`: pistas (compartido entre servidor y navegador).
- `public/shared/cars.js`: diseños de los autos.
- `public/host.*`: pantalla grande. `public/play.*`: control del celular.
- `test/sim.js`: `npm test` valida las pistas y corre carreras de bots.

Para probar sin celulares: `http://localhost:3000/host?demo=8` larga una carrera de 8 bots. En la página del control también funcionan las flechas y la barra espaciadora.
