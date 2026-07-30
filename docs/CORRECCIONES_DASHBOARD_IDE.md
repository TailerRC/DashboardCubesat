# CORRECCIONES DE DASHBOARD — CEMPAI SPACE SYSTEMS
### Instrucciones para aplicar automáticamente en el código del frontend

**Contexto:** Estas correcciones son **solo de diseño/etiquetado de campos** — ningún sensor nuevo, ningún cambio de hardware. El objetivo es que el dashboard solo muestre datos que el hardware real (BME280, **MQ135**, GUVA-S12SD, MPU6050, NEO-6M, INA219, NRF24L01) puede efectivamente producir, eliminando campos "fantasma" que no tienen sensor detrás o que muestran constantes físicamente incorrectas. *(Nota: el SCD-41 fue reemplazado por el MQ135 — el campo JSON `co2_ppm` se mantiene igual.)*

No se agrega hardware. Todo se resuelve con: (a) eliminar un campo, (b) renombrar/re-etiquetar un campo, o (c) recalcular un campo a partir de datos que YA se generan en otro punto del sistema.

---

## CORRECCIÓN 1 — Eliminar "Campo Magnético" (sección Orientación 3D)

**Problema:** El panel muestra `CAMPO MAGNÉTICO X / Y / Z`. No existe magnetómetro en el sistema — el MPU6050 solo tiene acelerómetro + giroscopio (sin magnetómetro), a diferencia del MPU9250/ICM-20948 que sí lo tienen pero fueron descartados por costo (ver matriz de decisión 4.1 del CDR). Este dato no tiene sensor real detrás.

**Acción en el código:**
- Buscar el bloque/componente que renderiza `"CAMPO MAGNÉTICO"` (probablemente junto a `"ACELERÓMETRO"` y `"FUERZA INERCIAL"` en la sección Orientación 3D).
- **Eliminar completamente** ese bloque de la UI.
- **Eliminar** cualquier campo `magX`, `magY`, `magZ` (o nombres similares) del modelo de datos / generador mock.
- Los otros dos bloques de esa misma sección (`ACELERÓMETRO` y `FUERZA INERCIAL`) **sí se mantienen** — ambos son derivables del MPU6050 (acelerómetro real; "fuerza inercial" puede quedar como una re-etiqueta del mismo acelerómetro si es una duplicación, revisar si son el mismo dato mostrado dos veces).

**Antes:**
```
EULER ANGLES / DATOS DE MOVIMIENTO
  ACELERÓMETRO:      X / Y / Z
  CAMPO MAGNÉTICO:   X / Y / Z   ← ELIMINAR
  FUERZA INERCIAL:   X / Y / Z
```

**Después:**
```
EULER ANGLES / DATOS DE MOVIMIENTO
  ACELERÓMETRO:      X / Y / Z
  FUERZA INERCIAL:   X / Y / Z
```

---

## CORRECCIÓN 2 — Corregir frecuencia de RF: 433 MHz → 2.4 GHz

**Problema:** La sección "Comunicación" muestra `Frecuencia TX: 433 MHz` y `Frecuencia: 433.0 MHz`. El transceptor real es el **NRF24L01**, que opera en la banda **2.4 GHz** (2.400–2.525 GHz ISM), nunca en 433 MHz (esa banda es de otro tipo de módulos, no del NRF24L01). Es un valor constante mal puesto en el código, no un dato de sensor.

**Acción en el código:**
- Buscar el string/constante `"433"` o `"433 MHz"` o `"433.0 MHz"` en los componentes de la sección Comunicación (tarjeta "FRECUENCIA TX" y bloque "ENLACE ACTIVO" → "FRECUENCIA:").
- Reemplazar por un valor dentro del rango real del NRF24L01, seleccionable por canal: **2.400 – 2.525 GHz**.
- Sugerencia de valor por defecto para el mock: `2.401 GHz` (canal 1) o generar dinámicamente `2400 + canal_MHz` según el canal configurado (0–125).

**Antes:**
```
FRECUENCIA TX: 433 MHz
FRECUENCIA:    433.0 MHz
```

**Después:**
```
FRECUENCIA TX: 2.401 GHz   (o el canal NRF24L01 configurado, 2.400–2.525 GHz)
FRECUENCIA:    2.401 GHz
```

---

## CORRECCIÓN 3 — Reemplazar "RSSI / SNR" por "Calidad de Enlace (estimada)"

**Problema:** El NRF24L01 básico **no expone un valor continuo de RSSI ni SNR** por hardware/librería estándar (solo tiene detección binaria de portadora, no una métrica de intensidad de señal medible). Mostrar `RSSI: -72 dBm` y `SNR: 8.4 dB` implica un sensor que no existe en la arquitectura.

**Acción en el código:**
- Buscar los campos `RSSI:` y `SNR:` en la sección "Comunicación" (bloque "ENLACE ACTIVO").
- **Eliminar ambos campos individuales** y reemplazarlos por **un único campo derivado**: `CALIDAD DE ENLACE`, calculado a partir de datos que el sistema **ya genera**: el ratio de paquetes recibidos vs. enviados en una ventana móvil (por ejemplo, últimos 20–50 paquetes).
- Fórmula sugerida para el mock/backend:
  ```
  calidad_enlace (%) = (paquetes_recibidos_ventana / paquetes_esperados_ventana) * 100
  ```
- Clasificar visualmente igual que otros indicadores del dashboard (verde/amarillo/rojo):
  - `>= 95%` → Excelente
  - `85–94%` → Buena
  - `70–84%` → Regular
  - `< 70%` → Débil / Enlace inestable

**Antes:**
```
RSSI:  -72 dBm
SNR:   8.4 dB
```

**Después:**
```
CALIDAD DE ENLACE:  94%  (Buena)
```

> Nota: esta métrica reutiliza el mismo conteo de `PAQUETES ENVIADOS / RECIBIDOS / PERDIDOS` que ya existe en la misma vista — no requiere ningún dato nuevo.

---

## CORRECCIÓN 4 — Aclarar que "Giro" (yaw) es estimado con deriva, no absoluto

**Problema:** Sin magnetómetro, el ángulo de "Giro"/yaw solo puede obtenerse integrando `GYRO_Z` en el tiempo. Esto **acumula error (drift)** — no es un heading absoluto y confiable como lo sería con magnetómetro. Mostrarlo igual que Cabeceo/Balanceo (que sí son estables, derivados de acelerómetro) es engañoso.

**Acción en el código:**
- En los paneles "Orientación 3D" (Euler Angles) y "Misión" (Cabeceo/Balanceo/Giro), agregar un indicador visual o tooltip junto al campo `Giro:` que aclare: **"Estimado — sujeto a deriva acumulativa"**.
- En el generador mock: simular `GYRO_Z` integrado con un **drift creciente pequeño** a lo largo del tiempo de vuelo (no un valor perfectamente estable), para que el comportamiento sea realista.

**Antes:**
```
Giro: 180°
```

**Después:**
```
Giro: 180° (estimado, deriva acumulada)
```

---

## CORRECCIÓN 5 — Unificar las fases de misión: 5 estados (UI) ↔ 7 fases (CDR Tabla 3)

**Problema:** La sección "Misión" muestra 5 estados (`INICIALIZACIÓN`, `ASCENSO/LANZAMIENTO`, `DESCENSO`, `PROXIMIDAD AL SUELO`, `ATERRIZADO`), pero el CDR define 7 fases oficiales (Tabla 3: Preparación en Tierra, Integración y Acoplamiento, Despegue y Ascenso, Altura Máxima y Desacople, Descenso Controlado, Aterrizaje, Recuperación). Hay que fijar un mapeo único para que el generador de datos y la UI no diverjan.

**Acción en el código:** usar este mapeo fijo (agrupa las 7 fases del CDR en los 5 estados visuales existentes, sin tener que rediseñar la UI):

| Estado UI (5) | Fases CDR agrupadas (7) |
|---|---|
| `INICIALIZACIÓN` | Preparación en Tierra + Integración y Acoplamiento |
| `ASCENSO / LANZAMIENTO` | Despegue y Ascenso |
| `DESCENSO` | Altura Máxima y Desacople + Descenso Controlado |
| `PROXIMIDAD AL SUELO` | Sub-estado dentro de Descenso Controlado, activado cuando altitud ≤ 20 m (umbral de desacople del paracaídas) |
| `ATERRIZADO` | Aterrizaje + Recuperación |

- En el generador mock, usar la máquina de estados de 7 fases internamente (para lógica física de altitud/velocidad), y mapear a los 5 estados visuales solo para lo que se muestra en pantalla.

---

## CORRECCIÓN 6 — Renombrar panel "Aceleración en tiempo real" (Misión) → "Orientación en tiempo real"

**Problema:** En la sección "Misión", el panel titulado `ACELERACIÓN EN TIEMPO REAL` muestra `Cabeceo`, `Balanceo`, `Giro` **en grados (°)** — eso es orientación (ROLL/PITCH/YAW), no aceleración. Es un error de nombre de componente, no de datos (el panel correcto de aceleración en m/s² ya existe y está bien en la sección "Satélite").

**Acción en el código:**
- Buscar el título `"ACELERACIÓN EN TIEMPO REAL"` dentro del componente de la sección Misión (el que contiene el círculo con Cabeceo/Balanceo/Giro en grados).
- Renombrar el título a `"ORIENTACIÓN EN TIEMPO REAL"`.
- No tocar el otro panel de "Aceleración" (X/Y/Z en m/s², sección Satélite) — ese está correcto.

**Antes:**
```
ACELERACIÓN EN TIEMPO REAL
  Cabeceo: +2.3°   Balanceo: -0.8°   Giro: 180°
```

**Después:**
```
ORIENTACIÓN EN TIEMPO REAL
  Cabeceo: +2.3°   Balanceo: -0.8°   Giro: 180°
```

---

## CORRECCIÓN 7 — Campo "SD Card" (Estado del Sistema): marcar como no confirmado

**Problema:** El panel "Estado del Sistema" muestra `SD Card: OK`. En el CDR, la tarjeta SD **solo aparece como propuesta de mitigación de riesgo** (riesgo #7, tabla de riesgos 3.5) — no está en ninguna tabla de presupuesto/componentes confirmados (1.3 o 3.4). No se puede confirmar que exista físicamente en el CubeSat actual.

**Acción en el código:**
- Cambiar el valor por defecto del campo `SD Card` de `"OK"` a `"N/A"` o `"No instalada"`, salvo que confirmes que sí la agregaron físicamente.
- Si más adelante se confirma la SD física, revertir esta corrección y volver a mostrar el estado real (`OK` / `ERROR` / `NO DETECTADA`).

**Antes:**
```
SD Card: OK
```

**Después (hasta confirmar hardware):**
```
SD Card: N/A (no confirmada en CDR)
```

---

## CORRECCIÓN 8 — Aclarar "Baudios: 9600" (Comunicación)

**Problema:** El valor `9600` corresponde casi seguro a la velocidad del puerto serial USB de depuración (típico en proyectos ESP32), **no** a la tasa de aire del NRF24L01 (que se configura en 250 kbps / 1 Mbps / 2 Mbps). Mostrarlo en la sección de comunicación RF sin aclarar a cuál se refiere genera confusión.

**Acción en el código:**
- Renombrar la etiqueta de `"BAUDIOS:"` a `"BAUDIOS (Puerto Serial Debug):"` si es el valor del USB/serial, **o**
- Si se quiere mostrar la tasa de aire real del NRF24L01, cambiar el valor a una de sus 3 tasas válidas: `250 kbps`, `1 Mbps` o `2 Mbps` (según cómo esté configurado el módulo en firmware).
- Decidir cuál de las dos cosas se quiere mostrar y dejar solo una, correctamente etiquetada.

---

## Resumen para el generador de datos mock (impacto en el JSON/paquete simulado)

Campos que **NO deben generarse** en el mock (no tienen sensor real):
- ❌ `magX`, `magY`, `magZ` (campo magnético)
- ❌ `rssi`, `snr` (reemplazados por `calidad_enlace`)

Campos que deben **corregirse en su lógica de generación**:
- ✅ `frecuencia_tx` → generar dentro de 2400–2525 MHz, no 433 MHz
- ✅ `giro` / `yaw` → integrar `gyro_z` en el tiempo con deriva acumulativa creciente, no un valor estable aleatorio
- ✅ `calidad_enlace` → derivar de `paquetes_recibidos / paquetes_esperados` en ventana móvil, no generar un dBm aleatorio
- ✅ `fase_mision` → usar máquina de estados de 7 fases internamente, mapear a 5 estados solo en la capa de presentación
- ✅ `sd_card_status` → fijo en `"N/A"` hasta confirmación de hardware

Campos que se mantienen sin cambios (ya correctos y con sensor real confirmado):
- ✅ CO2 eq. (MQ135 — ADC analógico, calibrado en firmware), Temperatura/Humedad/Presión (BME280), UV (GUVA-S12SD)
- ✅ Latitud/Longitud/Altitud GPS/Velocidad/Satélites visibles/HDOP (NEO-6M)
- ✅ Voltaje/Corriente/Consumo (INA219)
- ✅ Aceleración X/Y/Z, Roll, Pitch (MPU6050)
- ✅ Paquetes enviados/recibidos/perdidos, log de paquetes, CRC (NRF24L01 + lógica OBC)
