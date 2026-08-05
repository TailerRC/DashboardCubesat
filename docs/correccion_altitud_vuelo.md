# Corrección de Altitud de Vuelo — CubeSat (NEO-7M)

## 1. Problema identificado

El módulo GPS **NEO-7M** entrega **altitud MSL** (Mean Sea Level — altura sobre el nivel del mar), no la altura respecto al punto de despegue. Por eso, al encender el CubeSat sobre la mesa, el sensor marca ~177.6 m (la elevación real de Lima sobre el nivel del mar), en lugar de 0 m.

Como la competencia evalúa el vuelo en base a **100 m de altura relativa al lanzamiento**, es necesario transformar esa altitud absoluta (MSL) en una **altitud relativa al punto de encendido (AGL — Above Ground Level)**.

## 2. Dónde debe implementarse la corrección: ESP32, no el Dashboard

La corrección **debe hacerse en el firmware del ESP32**, antes de enviar el dato por MQTT. No en el dashboard ni en MongoDB. Razones:

- **Dato crudo vs. dato procesado**: El ESP32 es el único punto donde existe el contexto físico real (el momento exacto del encendido y el primer fix GPS válido). El dashboard solo recibe streams de datos; no tiene forma confiable de saber "en qué momento se encendió el CubeSat" salvo que se lo digas explícitamente.
- **Consistencia de datos históricos**: Si guardas en MongoDB la altitud ya corregida, cualquier análisis posterior (gráficas, reportes, replay de vuelo) usa un dato limpio y consistente. Si corriges en el dashboard, cada vez que alguien consulte la base de datos directamente (sin pasar por el dashboard) verá el dato "sucio" (MSL) y tendría que volver a aplicar la corrección manualmente.
- **Redundancia y trazabilidad para la competencia**: Muchas competencias de CubeSat piden mostrar la lógica de procesamiento de sensores en el propio firmware, como evidencia de diseño del sistema embebido. Corregir en el dashboard sería más bien un "parche visual" y no una solución de ingeniería del sistema.
- **Simplicidad del stack**: El dashboard debe encargarse de **visualizar**, no de procesar telemetría crítica de vuelo. Mezclar lógica de calibración de sensores en la capa de presentación complica el mantenimiento y puede introducir inconsistencias si en el futuro cambias de dashboard o agregas otro consumidor de los datos (por ejemplo, un sistema de recuperación o un segundo panel de control).

### Recomendación de arquitectura de datos

Para no perder el dato original (útil para debug o auditoría), se recomienda enviar **ambos valores** por MQTT y guardarlos en MongoDB:

| Campo | Descripción |
|---|---|
| `altitud_gps_msl` | Dato crudo del NEO-7M (sobre nivel del mar) — para debug/trazabilidad |
| `altitud_vuelo` | Dato corregido, relativo al punto de encendido — el que se usa en la competencia |

Así el dashboard simplemente **lee y muestra** `altitud_vuelo` sin necesidad de aplicar ninguna lógica adicional, y el dato crudo queda disponible por si se necesita revisar algo después del vuelo.

## 3. Cambio de nombre del parámetro

- **Antes:** `Altitud GPS` → sugiere altitud absoluta (MSL), lo cual genera confusión.
- **Ahora:** `Altitud de Vuelo` → deja claro que es la altura relativa al despegue, que es el dato relevante para la misión y la competencia.

Esto aplica tanto en:
- El payload MQTT (nombre del campo/topic).
- El esquema de MongoDB (nombre del campo en la colección).
- La UI del dashboard (label que se muestra al usuario, como en tu captura: "DATOS GPS REALES (ESP32)").

## 4. Resumen de la lógica de corrección (a nivel conceptual)

1. El ESP32 espera a tener un **fix GPS válido** (suficientes satélites y HDOP aceptable) antes de tomar cualquier referencia. Un HDOP de 99.9 (como en tu captura) indica fix pobre/no confiable, y no debe usarse para calibrar.
2. Una vez alcanzado un fix confiable, se toma un **promedio de varias lecturas** (por ejemplo 10) de altitud MSL como **altitud de referencia** (el "nivel 0" del CubeSat en su punto de lanzamiento).
3. A partir de ese momento, cada nueva lectura de altitud se transforma como:

   `altitud_vuelo = altitud_msl_actual - altitud_referencia`

4. Solo `altitud_vuelo` (ya corregida) se envía por MQTT como el parámetro oficial de la misión, junto al dato crudo `altitud_gps_msl` para trazabilidad.
5. El sistema debe distinguir claramente tres estados: **esperando fix**, **calibrando referencia**, **operativo** — para evitar enviar datos de altitud de vuelo antes de tener una referencia confiable.

## 5. Conclusión

- ✅ La corrección se hace en el **ESP32** (firmware), no en el dashboard.
- ✅ Se envían y almacenan **dos campos**: `altitud_gps_msl` (crudo) y `altitud_vuelo` (corregido).
- ✅ El parámetro que ve el usuario en el dashboard pasa a llamarse **"Altitud de Vuelo"**.
- ✅ El dashboard solo se limita a **mostrar** el dato ya corregido, sin lógica adicional.
