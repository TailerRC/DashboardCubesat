# README — Corrección del Dashboard: Altitud de Vuelo (BME280)

## Contexto

El firmware (`cubesat_obc.md` + `gateway_terrena.md`) ya está actualizado y
publicando un campo nuevo en el tópico MQTT `cempai/cubesat/telemetry/ambiental`:

```json
{
  "data": {
    "altura_barometrica_m": {
      "v": 12.4,
      "hace_seg": 0.0,
      "calibrando": false
    }
  }
}
```

- `v` → altitud relativa en metros, calculada con la fórmula barométrica sobre
  la presión del BME280 (referencia `P0` fijada con 15 lecturas al arrancar).
- `calibrando` → `true` durante los primeros ~15s tras encender el CubeSat
  (mientras se fija `P0`). En ese lapso `v` vale `0.0`.

El dashboard **todavía no lee este campo**. Hoy el panel "Altitud de Vuelo"
sigue leyendo `altitud_gps` del tópico `ubicacion`, que depende 100% del GPS
(NEO-7M) y se queda en `0 m` sin fix — que es lo que se ve en la captura
original (`GEOPOSICIONAMIENTO ESP32 (ESPERANDO SEÑAL REAL NEO-7M...)`).

**Objetivo de este cambio:** que el panel "Altitud de Vuelo" pase a depender
únicamente del BME280, que funciona siempre (con o sin GPS, dentro de una
caja cerrada, sin línea de vista al cielo, etc.), y deje de mostrar `0 m`
como si el CubeSat estuviera en tierra cuando en realidad es un problema de
antena/fix del GPS.

**El GPS no se elimina del sistema** — sigue siendo la fuente de
latitud/longitud y de "Distancia al Origen". Solo se le quita la
responsabilidad de la altitud.

---

## Requisito previo

Este cambio de dashboard **no sirve de nada si el firmware no está subido
todavía a los dos ESP32** (OBC y Gateway) con los structs `PktAmbiental`
actualizados (29 bytes, campos `altura_m` y `calibrando` incluidos). Sin
eso, el campo `altura_barometrica_m` no va a existir en el JSON que llega
por MQTT, y el panel se va a quedar sin datos.

Orden de aplicación:
1. ✅ `cubesat_obc.md` — ya aplicado.
2. ✅ `gateway_terrena.md` — ya aplicado.
3. ⬜ Dashboard (este documento) — pendiente.

---

## Paso 1 — Agregar `history` al hook `useAmbientalMqtt.js`

El campo `altura_barometrica_m` es nuevo, así que necesita su propio array
de historial para el gráfico del panel — igual que ya lo tienen `co2_ppm`,
`temperatura_c`, etc.

Buscá el patrón `buildInitialHistory()` (o como se llame en tu código) que
ya usan esos campos y replicalo para `altura_barometrica_m`. Por ejemplo,
si hoy tenés algo como:

```javascript
const [sensors, setSensors] = useState({
  co2_ppm: { v: 0, history: buildInitialHistory() },
  temperatura_c: { v: 0, history: buildInitialHistory() },
  // ...
});
```

Agregá:

```javascript
const [sensors, setSensors] = useState({
  co2_ppm: { v: 0, history: buildInitialHistory() },
  temperatura_c: { v: 0, history: buildInitialHistory() },
  altura_barometrica_m: { v: 0, history: buildInitialHistory(), calibrando: true },
  // ...
});
```

Y asegurate de que el handler que actualiza el estado al llegar un mensaje
MQTT (el `onMessage` / `mqttClient.on('message', ...)`) empuje también los
valores nuevos de `altura_barometrica_m` (tanto `v` como `calibrando`) al
historial, con el mismo mecanismo que ya usan los demás campos.

---

## Paso 2 — Componente de la vista "Ubicación" (React)

### 2.1. Agregar el hook de datos ambientales

Este componente hoy probablemente solo usa:

```javascript
const { data } = useUbicacionMqtt();
```

Agregale también:

```javascript
const { sensors } = useAmbientalMqtt();
```

### 2.2. Cambiar la fuente del panel "Altitud de Vuelo"

**Antes:**
```javascript
const altitudVuelo = data.altitud_gps.v;
const historialAltitud = data.altitud_gps.history;
```

**Después:**
```javascript
const altitudVuelo = sensors.altura_barometrica_m.v;
const historialAltitud = sensors.altura_barometrica_m.history;
const calibrandoAltitud = sensors.altura_barometrica_m.calibrando;
```

### 2.3. Renombrar el panel para que sea honesto sobre su fuente

Cambiá el título de `"ALTITUD DE VUELO"` a algo como:

- `"ALTITUD DE VUELO (BME280)"`, o
- `"ALTITUD BAROMÉTRICA"`

Esto evita que alguien piense que ese número sigue viniendo del GPS. El
panel "Datos GPS Reales" (con el campo `Altitud GPS:`) se deja tal cual,
como dato crudo del NEO-7M — solo diagnóstico, ya no la fuente del número
grande principal.

### 2.4. Mostrar el estado de calibración en la UI

Mientras `calibrandoAltitud === true` (los primeros ~15s tras encender el
CubeSat), el panel debe mostrar algo como:

```jsx
{calibrandoAltitud ? "Calibrando..." : `${altitudVuelo.toFixed(1)} m`}
```

en vez de mostrar directamente `0 m`. Esto evita confundir "el sistema
todavía se está preparando" con "el CubeSat está en el suelo" — son dos
estados distintos y hoy son indistinguibles en el dashboard.

### 2.5. Límites y referencias del panel

`MÁX VUELO: 200.0 m` y `LÍMITE: 200 m` siguen funcionando igual — no
requieren cambio de lógica, solo que ahora se calculan sobre la serie de
`altura_barometrica_m` en vez de `altitud_gps`.

---

## Qué NO cambia (ni ahora, ni con este cambio aplicado)

- ❌ El panel **"Distancia al Origen"** — sigue dependiendo 100% del GPS
  (lat/lon) y seguirá en `0 m` mientras el GPS no tenga fix. Esto es un
  problema de hardware GPS, no algo que el BME280 pueda resolver.
- ❌ El panel **"Datos GPS Reales"** (Latitud, Longitud, Satélites, HDOP,
  Fecha/Hora UTC) — sigue mostrando datos crudos del GPS tal cual, útiles
  como diagnóstico de si el GPS mejora en algún momento.
- ❌ El **mapa de trayectoria** — sigue necesitando lat/lon reales del GPS
  para dibujar cualquier posición.

---

## Por qué "solo BME280" y no "GPS con respaldo de BME280"

Se descartó un sistema híbrido (usar GPS cuando hay fix, BME280 cuando no)
porque agrega complejidad innecesaria y un riesgo real: si el GPS da un fix
de mala calidad (HDOP alto, pocos satélites, lectura con error momentáneo),
el sistema podría "confiar" en un dato GPS incorrecto en vez del dato BME,
que es más estable. La decisión más segura es que la altitud de vuelo, en
todo momento, venga únicamente del BME280 — sin lógica condicional que
pueda fallar.

---

## Checklist de verificación tras aplicar el cambio

- [ ] Firmware OBC subido con struct `PktAmbiental` de 29 bytes.
- [ ] Firmware Gateway subido con el mismo struct de 29 bytes.
- [ ] `useAmbientalMqtt.js` guarda `history` para `altura_barometrica_m`.
- [ ] El componente de Ubicación llama a `useAmbientalMqtt()`.
- [ ] El panel "Altitud de Vuelo" lee `sensors.altura_barometrica_m.v` /
      `.history` / `.calibrando` (ya no `data.altitud_gps`).
- [ ] El panel muestra `"Calibrando..."` durante los primeros ~15s tras
      encender el CubeSat, y después el valor numérico normal.
- [ ] El título del panel fue renombrado para reflejar que la fuente es el
      BME280.
- [ ] "Distancia al Origen", "Datos GPS Reales" y el mapa de trayectoria
      siguen funcionando exactamente igual que antes (no se tocaron).

## Estado antes/después

| | Antes | Después |
|---|---|---|
| **Firmware** | Calibra presión con 1 sola lectura, no transmite `altura_m` ni `calibrando` | Calibra con 15 lecturas, transmite `altura_m` y `calibrando` en el tópico `ambiental` |
| **Dashboard — "Altitud de Vuelo"** | Lee `altitud_gps` (tópico `ubicacion`) | Lee `altura_barometrica_m` (tópico `ambiental`) |
| **Sin fix GPS** | Se queda en `0 m`, sin aviso, indistinguible de "CubeSat en el suelo" | Funciona igual, con o sin GPS — solo depende del BME280 |
| **Primeros 15s tras encender** | No aplica (no hay lógica de calibración) | Muestra `"Calibrando..."` en vez de un número, hasta que `P0` quede fijo |
