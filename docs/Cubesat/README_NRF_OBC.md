# 🛰️ Guía de Conexión de la Antena NRF24L01 — ESP32 OBC

Este documento sirve como manual rápido para la conexión física y el diagnóstico del transceptor de radiofrecuencia **NRF24L01** en el ordenador de a bordo (**ESP32 OBC**) del nanosatélite CEMPAI.

---

## 📌 Asignación de Pines (Pinout)

En el **ESP32 OBC**, la comunicación con la antena se realiza a través del bus de hardware **SPI HSPI**. Esto permite que la antena opere a alta velocidad sin interferir con el bus de sensores I2C.

### Tabla de Cableado

| Pin NRF24L01 | Pin ESP32 (GPIO) | Color sugerido | Descripción |
| :---: | :---: | :---: | :--- |
| **GND** | **GND** | Negro 🖤 | Tierra de alimentación común |
| **VCC** | **3.3V** | Rojo ❤️ | Alimentación positiva (¡No conectar a 5V!) |
| **CE** | **GPIO 25** | Naranja 🧡 | Chip Enable (Control de TX/RX) |
| **CSN** | **GPIO 26** | Amarillo 💛 | Chip Select Not (Habilitación SPI) |
| **SCK** | **GPIO 14** | Verde 💚 | Serial Clock (Bus SPI HSPI) |
| **MOSI** | **GPIO 13** | Azul 💙 | Master Out Slave In (Bus SPI HSPI) |
| **MISO** | **GPIO 12** | Violeta 💜 | Master In Slave Out (Bus SPI HSPI) |
| **IRQ** | *No Conectar* | - | Pin de Interrupción (dejado al aire) |

---

## 🗺️ Diagrama Visual de Conexiones

### 1. Pinout del Módulo NRF24L01 (Vista trasera / soldaduras)
```
      +-----------------+
      |  (1) GND   (2) VCC   |   <-- ¡VCC es 3.3V máximo!
      |  (3) CE    (4) CSN   |
      |  (5) SCK   (6) MOSI  |
      |  (7) MISO  (8) IRQ   |
      +---------[ ]-----+
                |_| (Antena integrada en PCB)
```

### 2. Mapa en el ESP32 (Distribución en placa)
```
                       ESP32 OBC Pinout
                     +-----------------+
                     |       ...       |
                 GND | [ ]         [ ] | GND <------- NRF24 GND (1)
     NRF24 SCK (5) ->| [14]        [ ] | 3.3V <------ NRF24 VCC (2)
    NRF24 MISO (7) ->| [12]        [ ] | ...
    NRF24 MOSI (6) ->| [13]        [26]| <----------- NRF24 CSN (4)
                     |       ...   [25]| <----------- NRF24 CE (3)
                     +-----------------+
```

---

## ⚡ Estabilidad Eléctrica (Muy Importante)

> [!WARNING]
> **Sensibilidad al voltaje:** El NRF24L01 consume picos de energía significativos al transmitir. El regulador interno del ESP32 a veces no puede suministrar esta corriente con suficiente rapidez, lo que causa caídas de voltaje de microsegundos que cuelgan la antena o hacen que el ESP32 no la detecte.

### Soluciones recomendadas:
1. **Condensador Electrolítico (Recomendado):**
   Soldar un condensador electrolítico de **10 µF a 100 µF** (con voltajes superiores a 6.3V) directamente entre los pines de alimentación **VCC (2) y GND (1)** de la antena. Colócalo lo más cerca posible del chip de radio para estabilizar la alimentación.
2. **Placa de Adaptador con Regulador YL-105 (Alternativa):**
   Si utilizas la placa adaptadora de 8 pines que incluye un chip regulador AMS1117 de 3.3V, puedes alimentar el conjunto con la línea de **5V** del ESP32 directamente al pin VCC de la placa adaptadora. El adaptador regulará el voltaje a 3.3V estables de forma automática.

---

## 🔍 Pasos de Diagnóstico en Software

Al encender el satélite OBC con la consola serial abierta a **115200 baudios**:

* **Inicialización Exitosa:**
  ```text
  [OK] NRF24L01 listo — Modo TRANSMISOR
  ```
* **Fallo de Conexión:**
  ```text
  [ERROR] NRF24L01 no encontrado. Revisa cableado SPI HSPI.
  ```
  *(Si aparece este mensaje, el ESP32 detendrá la ejecución por seguridad hasta que se resuelva la conexión SPI para evitar lecturas de datos fantasma en el satélite).*
