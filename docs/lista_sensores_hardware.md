# 🛰️ Lista Oficial de Sensores y Hardware — Nanosatélite CEMPAI

Esta es la lista oficial desglosada **1 por 1** de los 8 componentes de hardware de sensores y módulos que conforman la arquitectura real del Cubesat, junto con las variables físicas que miden y los campos JSON que envían vía MQTT.

---

## 1. BME280
* **Subsistema:** Ambiental
* **Parámetros que mide:** Presión barométrica, Temperatura ambiente y Humedad relativa.
* **Campos en el paquete JSON:** `presion_pa`, `temperatura_c`, `humedad_pct`
* **Tópico MQTT:** `cempai/cubesat/telemetry/ambiental`

---

## 2. MQ135
* **Subsistema:** Ambiental
* **Interfaz con ESP32:** ADC analógico (Pin 34 / `analogRead`) — **reemplaza al SCD-41 (I2C)**.
* **Parámetros que mide:** Concentración equivalente de CO₂ y calidad general del aire (detecta CO₂, NH₃, alcohol, humo y VOCs). El firmware ESP32 convierte el valor ADC a ppm mediante fórmula de calibración.
* **Campos en el paquete JSON:** `co2_ppm`
* **Tópico MQTT:** `cempai/cubesat/telemetry/ambiental`
* **⚠️ Nota:** A diferencia del SCD-41 (NDIR, específico de CO₂), el MQ135 es un sensor de resistencia variable — requiere periodo de calentamiento (~24h) y calibración manual en el firmware para obtener valores en ppm confiables. El campo JSON `co2_ppm` se mantiene igual.

---

## 3. GUVA-S12SD
* **Subsistema:** Ambiental
* **Parámetros que mide:** Índice de radiación Ultravioleta (UV).
* **Campos en el paquete JSON:** `radiacion_uv`
* **Tópico MQTT:** `cempai/cubesat/telemetry/ambiental`

---

## 4. u-blox NEO-7M
* **Subsistema:** Ubicación
* **Parámetros que mide:** Latitud, Longitud, Altitud GPS, Velocidad sobre el terreno, Cantidad de Satélites visibles y HDOP (Precisión).
* **Campos en el paquete JSON:** `latitud`, `longitud`, `altitud_gps`, `velocidad_kmh`, `satelites`, `hdop`
* **Tópico MQTT:** `cempai/cubesat/telemetry/ubicacion`

---

## 5. INA219
* **Subsistema:** Satélite (Sistema Eléctrico EPS)
* **Parámetros que mide:** Voltaje de batería LiPo, Corriente de consumo y Potencia consumida en Watts.
* **Campos en el paquete JSON:** `voltaje_v`, `corriente_ma`, `consumo_w`
* **Tópico MQTT:** `cempai/cubesat/telemetry/satelite`

---

## 6. MPU6050
* **Subsistema:** Orientación 3D (y consumido por Misión vía React/Props)
* **Parámetros que mide:** Aceleración en 3 ejes (X, Y, Z), Velocidad angular giroscópica (X, Y, Z), Ángulo de Cabeceo (Pitch), Ángulo de Balanceo (Roll) y Yaw integrado.
* **Campos en el paquete JSON:** `accel_x`, `accel_y`, `accel_z`, `gyro_x_dps`, `gyro_y_dps`, `gyro_z_dps`, `cabeceo_deg`, `balanceo_deg`, `giro_yaw_deg`
* **Tópico MQTT:** `cempai/cubesat/telemetry/orientacion3d` (Tópico único para evitar duplicaciones)

---

## 7. ESP32 (Microcontrolador OBC - Ordenador de a bordo)
* **Subsistema:** Satélite y Misión
* **Parámetros que mide/reporta:** Temperatura interna del procesador MCU, Tiempo continuo de encendido (Uptime), Conteo de sensores detectados y Fase de vuelo de la misión (calculada por firmware).
* **Campos en el paquete JSON:**
  * En tópico **satelite**: `temp_mcu`, `tiempo_encendido_seg`, `sensores_activos`
  * En tópico **mision**: `fase_cdr`, `fase_ui`
* **Tópicos MQTT:** `cempai/cubesat/telemetry/satelite` y `cempai/cubesat/telemetry/mision`

---

## 8. NRF24L01
* **Subsistema:** Comunicación Radiofrecuencia
* **Parámetros que mide/reporta:** Contador de paquetes enviados, recibidos y perdidos, Porcentaje de calidad de enlace RF (calculado) y Registro de logs de la trama.
* **Campos en el paquete JSON:** `paquetes_enviados`, `paquetes_recibidos`, `paquetes_perdidos`, `calidad_enlace_pct`, `log_entry`
* **Tópico MQTT:** `cempai/cubesat/telemetry/comunicacion`
