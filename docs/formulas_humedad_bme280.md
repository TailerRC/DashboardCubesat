# Cálculo de Humedad Relativa a partir de Temperatura y Presión (BME280)

## Datos de entrada necesarios

| Símbolo | Descripción | Fuente |
|---|---|---|
| `T0` | Temperatura en tierra, antes del lanzamiento | Sensor BME280 |
| `P0` | Presión en tierra, antes del lanzamiento | Sensor BME280 |
| `RH0` | Humedad relativa en tierra, antes del lanzamiento | Higrómetro externo / estación meteorológica |
| `T(t)` | Temperatura durante el vuelo, en cada instante | Sensor BME280 |
| `P(t)` | Presión durante el vuelo, en cada instante | Sensor BME280 |

---

## Paso 1 — Presión de vapor de saturación

Se usa dos veces: una con los datos de tierra (`T0`, `P0`) y otra con los datos de vuelo (`T(t)`, `P(t)`).

$$
e_s(T, P) = 6.1121 \cdot e^{\left(18.678 - \frac{T}{234.5}\right)\frac{T}{257.14 + T}}
$$

*(la corrección por presión es menor a 0.1% en este rango de altitud y puede omitirse)*

---

## Paso 2 — Mixing ratio de referencia (se calcula una sola vez, con datos de tierra)

$$
e_0 = \frac{RH_0}{100} \cdot e_s(T_0, P_0)
$$

$$
w = 0.622 \cdot \frac{e_0}{P_0 - e_0}
$$

**Usa:** `T0`, `P0`, `RH0` → resultado: `w` (constante durante todo el vuelo)

---

## Paso 3 — Humedad relativa en cada instante del vuelo

$$
e(t) = \frac{w \cdot P(t)}{0.622 + w}
$$

$$
RH(t) = 100 \cdot \frac{e(t)}{e_s\big(T(t), P(t)\big)}
$$

**Usa:** `P(t)`, `T(t)` (datos reales del BME280 en vuelo) + `w` (del Paso 2)

**Resultado:** `RH(t)` — humedad relativa estimada, en %

---

## Resumen del flujo

```
T0, P0, RH0  →  [Paso 1 + Paso 2]  →  w (constante)
                                        │
T(t), P(t)   →  [Paso 1 + Paso 3]  →  RH(t)  para cada fila del vuelo
```
