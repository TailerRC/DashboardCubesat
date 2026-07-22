# CORRECCIÓN — GRÁFICOS DE LÍNEA "ALTITUD GPS" Y "DISTANCIA AL ORIGEN"
### Sección Ubicación — Instrucciones para IDE (solo estos dos paneles)

---

## PROBLEMA 1 — El número grande no coincide con el final de la línea del gráfico

**Panel "ALTITUD GPS":** el valor grande dice `83 m`, pero la línea del gráfico termina (punto "ahora") prácticamente en `0 m`. El último punto de la línea **debe coincidir exactamente con el valor grande mostrado arriba** — son el mismo dato, solo que uno es el valor instantáneo y el otro es su histórico.

**Panel "DISTANCIA AL ORIGEN":** el valor grande dice `124 m`, pero la línea del gráfico se ve **plana, pegada arriba del todo (~200 m) durante todo el recorrido**, sin ninguna variación ni descenso — no refleja el valor actual ni ninguna tendencia real.

**Acción en el código:**
- El último punto (`ahora`) de cada serie de datos del gráfico debe ser **siempre igual** al valor grande mostrado en el encabezado del panel. Si son variables distintas en el estado, deben unificarse en una sola fuente de datos.
- Revisar la lógica que alimenta el gráfico de "Distancia al Origen": actualmente parece estar generando/clippeando todos los puntos al valor máximo del eje Y, en vez de usar la distancia real punto a punto. Debe recalcularse para que la línea suba y baje según la distancia real del CubeSat al punto de lanzamiento a lo largo del tiempo.

---

## PROBLEMA 2 — Escalas de eje Y mal ajustadas (desperdician espacio o cortan el dato)

**"ALTITUD GPS":** el eje Y llega hasta `500 m`, pero la línea nunca sube de `250 m` — más de la mitad del gráfico queda vacío, sin usarse.

**"DISTANCIA AL ORIGEN":** el eje Y llega hasta `200 m`, pero el valor real ronda `124 m` (y el "MÁX DIST." indicado es `123.7 m`) — la línea queda pegada arriba, sin margen ni variación visible.

**Acción en el código:**
- Cambiar el cálculo del rango del eje Y de **fijo** a **dinámico**, basado en los datos reales de la ventana de tiempo visible (ej. `min = 0`, `max = valor_máximo_de_la_serie * 1.15` para dejar un ~15% de margen superior).
- Esto aplica a ambos gráficos por igual.

---

## PROBLEMA 3 — El punto/marcador final se ve cortado (clipping) en el borde derecho del gráfico

En ambos paneles, el círculo blanco que marca el último dato ("ahora") aparece **cortado a la mitad** por el borde derecho del contenedor del gráfico — se ve como una media luna en vez de un círculo completo.

**Acción en el código:**
- Agregar **padding/margen interno a la derecha del área de dibujo del gráfico** (suficiente para que quepa el radio completo del punto sin tocar el borde del contenedor — por ejemplo, 8–12px de padding extra en el eje X al final de la serie).
- Verificar que el `overflow` del contenedor del gráfico no esté recortando elementos (`overflow: hidden` en el wrapper puede ser la causa si el punto se dibuja ligeramente fuera del `viewBox`/canvas).
- El mismo ajuste debe aplicarse a **cualquier otro gráfico de línea del dashboard** que use el mismo componente base, para no dejar el bug solo corregido en estos dos paneles.

---

## PROBLEMA 4 — Formato inconsistente en el campo "VELOCIDAD" del panel "Altitud GPS"

El panel "Altitud GPS" muestra `VELOCIDAD: Estable` (texto), mientras que el panel "Distancia al Origen" (mismo nivel, al lado) muestra `VELOCIDAD: 9.1 km/h` (valor numérico con unidad). Deben usar el mismo formato — actualmente uno es un dato real y el otro es un texto genérico, lo cual es inconsistente para el usuario y para el generador de datos.

**Acción en el código:**
- Cambiar `VELOCIDAD: Estable` (panel Altitud GPS) por un **valor numérico con signo y unidad**, consistente con el resto del dashboard (ej. `-1.3 m/s` o `-4.7 km/h`, según la unidad que se use en ese panel específico — negativo si está descendiendo, positivo si asciende).
- Esta velocidad debe representar la **velocidad vertical** (derivada de la altitud GPS en el tiempo), distinta de la velocidad horizontal que ya se muestra en "Distancia al Origen" (esa sí, correctamente en km/h).

---

## Resumen de cambios (solo estos 2 paneles, nada más del dashboard)

| # | Problema | Corrección |
|---|---|---|
| 1 | Valor grande ≠ último punto del gráfico | Unificar a una sola fuente de datos por panel |
| 1b | Línea de "Distancia al Origen" plana/clippeada arriba | Corregir generación de datos, no forzar al máximo del eje |
| 2 | Eje Y fijo, mal ajustado (vacío o saturado) | Escala dinámica basada en min/max real de la ventana visible + margen ~15% |
| 3 | Punto final cortado por el borde del gráfico | Agregar padding derecho al área de dibujo, revisar `overflow` del contenedor |
| 4 | "Velocidad: Estable" (texto) vs "9.1 km/h" (número) | Unificar formato: velocidad vertical numérica con signo y unidad |
