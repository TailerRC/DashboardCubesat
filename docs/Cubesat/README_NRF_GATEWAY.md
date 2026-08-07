# 🛰️ Guía de Conexión de la Antena NRF24L01 — Estación Terrena (Gateway)

Este documento detalla la conexión física, el direccionamiento y la verificación del transceptor **NRF24L01** en el **ESP32 Gateway (Estación Terrena)** encargado de recibir los paquetes RF y publicarlos en el Broker MQTT (HiveMQ) a través de WiFi.

---

## 📌 Asignación de Pines (Pinout)

La Estación Terrena comparte el **mismo bus físico de pines SPI (HSPI)** que el satélite OBC. Esto facilita el desarrollo y el reemplazo rápido de hardware si fuera necesario.

### Tabla de Cableado

| Pin NRF24L01 | Pin ESP32 (GPIO) | Color sugerido | Descripción |
| :---: | :---: | :---: | :--- |
| **GND** | **GND** | Negro 🖤 | Tierra de alimentación común |
| **VCC** | **3.3V** | Rojo ❤️ | Alimentación positiva (¡No conectar a 5V!) |
| **CE** | **GPIO 25** | Naranja 🧡 | Chip Enable (Control de recepción activa) |
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

### 2. Mapa en el ESP32 Gateway
```
                     ESP32 Gateway Pinout
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

## ⚡ Estabilidad Eléctrica en Recepción

Aunque la Estación Terrena no realiza transmisiones continuas de alta potencia (se mantiene en modo escucha RX mayormente), **un voltaje estable sigue siendo crítico**. Si el chip sufre fluctuaciones de corriente, la antena dejará de capturar paquetes de radio del OBC.

### Recomendaciones en Tierra:
* Soldar un condensador electrolítico de **10 µF a 100 µF** directamente entre los pines **VCC (2) y GND (1)** del NRF24L01.
* Si el Gateway está conectado a una PC mediante USB, asegúrate de conectarlo a un puerto USB 3.0 (puerto azul) o usar un concentrador USB con alimentación externa para evitar ruidos de línea provenientes de la fuente de alimentación de la PC.

---

## 📡 Configuración del Enlace RF en Código

El firmware en [gateway_terrena.md](file:///c:/Users/rodri/OneDrive/Escritorio/VisualStudioCode_Projects/DashboardCubesat/docs/Cubesat/gateway_terrena.md) establece los siguientes parámetros de RF que deben coincidir exactamente con el OBC:
1. **Canal RF:** Canal 1 (Frecuencia de 2.401 GHz) -> `radio.setChannel(1);`
2. **Velocidad de Datos (Data Rate):** 2 Mbps -> `radio.setDataRate(RF24_2MBPS);` (Esto reduce el tiempo en el aire del paquete para evitar colisiones).
3. **Dirección de Enlace (Pipe):** Dirección compartida `"CEMPA"` -> `radio.openReadingPipe(1, RF_ADDRESS);`

---

## 🔍 Pasos de Diagnóstico en la Estación Terrena

Al encender la Estación Terrena con la consola serial a **115200 baudios**:

1. **Confirmación Inicial:**
   ```text
   [OK] NRF24L01 listo — Modo RECEPTOR
   [WiFi] Conectando a Redmi Note 14... Conectado. IP: 192.168.X.X
   [CEMPAI] Gateway listo. Esperando paquetes del OBC...
   ```
2. **Recepción exitosa del Satélite:**
   Cada vez que pase un paquete por radio del OBC, se imprimirá:
   ```text
   [RF] Paquete type=1 recibido
   [MQTT→AMB] pkt#1001 T=24.5 H=55.2 UV=1.2
   ```
   Esto confirma que la estación intermedia está decodificando el struct binario y publicándolo correctamente en HiveMQ.
