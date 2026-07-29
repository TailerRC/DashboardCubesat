# 🛰️ Dashboard Cubesat - Panel de Operaciones Satelitales (CEMPAI)

Este proyecto es una interfaz de control y monitoreo en tiempo real para las operaciones y telemetría de un nanosatélite Cubesat desarrollado por **CEMPAI Space Systems**. Consume y visualiza datos dinámicos a través de un protocolo de pub-sub utilizando **MQTT**, proporcionando una consola interactiva de diagnóstico para operadores de estaciones terrenas.

---

## 🚀 Características Principales

1. **Monitoreo en Tiempo Real**: Visualización inmediata de telemetría proveniente de 5 flujos clave de datos MQTT (ambiental, ubicación, satélite, misión, y comunicación).
2. **Marquesina de Telemetría Continua**: Una barra superior dinámica (`TopBar`) que muestra todas las variables críticas (voltaje, corriente, consumo, altitud, coordenadas, etc.) de forma fluida.
3. **Monitoreo Ambiental Avanzado**: 
   - Gráficos históricos interactivos por variable.
   - Indicadores analógicos tipo Gauge con umbrales de alerta personalizables.
   - Algoritmo de detección de descompresión rápida en tiempo real midiendo la tasa de cambio de presión barométrica en pascales por segundo ($\text{Pa/s}$).
4. **Estado de Misión y Orientación 3D**:
   - Seguimiento del check-list de fases oficiales de vuelo (Inicialización, Ascenso, Descenso, Proximidad, Aterrizado).
   - Visualizador de orientación 3D y simulador de cabeceo/balanceo (Pitch & Roll) con indicador de deriva estimada de Yaw.
5. **Diagnóstico MQTT en Footer**:
   - Monitoreo del estado del broker MQTT con animación de pulso de enlace.
   - Conteo en tiempo real de sensores detectados por el computador de a bordo (OBC).
   - Estado de calidad del enlace RF y porcentaje de pérdida de paquetes.

---

## 📂 Estructura del Proyecto

```bash
src/
├── assets/         # Recursos estáticos (estilos de FontAwesome, etc.)
├── components/     # Componentes compartidos del sistema
│   ├── 3d/         # Visualizadores 3D de orientación
│   ├── Charts/     # Configuración y renderizado de gráficos (SensorChart)
│   └── Layout/     # Estructura del panel (TopBar, Sidebar, BottomBar)
├── mqtt/           # Lógica del cliente MQTT y flujos de simulación
│   ├── config/     # Configuración de conexión y Broker (MqttService)
│   ├── paquete_mqtt/ # Hooks de React para suscribirse a topics específicos
│   └── simulacion/ # Publicadores mock en memoria para desarrollo local
└── pages/          # Vistas principales del dashboard
    ├── VistaGeneral/ # Estado de seguridad y KPI principales
    ├── Ambiental/   # Sensores ambientales, gráficos de historial y gauges
    ├── Ubicacion/   # Datos de posición GPS, altitud y distancia al origen
    ├── Satelite/    # Diagnóstico eléctrico, consumo y aceleración MCU
    ├── Mision/      # Fases de vuelo, orientación Pitch/Roll y estado de hardware
    └── Comunicacion/# Logs de enlace, tasa de transferencia y calidad de señal
```

---

## 📡 Flujos de Telemetría (Topics MQTT)

El sistema procesa tramas JSON publicadas en los siguientes tópicos:

*   **Ambiental (`cempai/cubesat/telemetry/ambiental`)**:
    *   `co2_ppm`: Concentración de dióxido de carbono ($CO_2$).
    *   `temperatura_c`: Temperatura ambiente.
    *   `humedad_pct`: Porcentaje de humedad relativa.
    *   `presion_pa`: Presión barométrica.
    *   `radiacion_uv`: Índice de radiación ultravioleta.
*   **Satélite (`cempai/cubesat/telemetry/satelite`)**:
    *   `voltaje_v` / `corriente_ma` / `consumo_w`: Estado eléctrico de las baterías.
    *   `temp_mcu`: Temperatura interna del microcontrolador OBC (ESP32).
    *   `sensores_activos`: Cantidad de sensores reportando correctamente.
    *   `accel_x` / `accel_y` / `accel_z`: Aceleraciones en ejes.
*   **Misión (`cempai/cubesat/telemetry/mision`)**:
    *   `fase_cdr` / `fase_ui`: Fase de vuelo oficial según la computadora de a bordo.
    *   `cabeceo_deg` / `balanceo_deg` / `giro_yaw_deg`: Ángulos de rotación y estabilidad.
*   **Comunicación (`cempai/cubesat/telemetry/comunicacion`)**:
    *   `calidad_enlace_pct`: Calidad de la señal de radio RF.
    *   `paquetes_enviados` / `paquetes_recibidos` / `paquetes_perdidos`: Contadores acumulativos de tramas.

---

## 🛠️ Configuración y Uso

### Ejecutar Localmente

1.  Instala las dependencias del proyecto:
    ```bash
    npm install
    ```
2.  Inicia el servidor de desarrollo local de Vite:
    ```bash
    npm run dev
    ```
3.  Abre tu navegador en la dirección indicada por la consola (usualmente `http://localhost:5173/`).

### Conexión a un Broker Real (ej. HiveMQ / EMQX)

Por defecto, en desarrollo el dashboard utiliza publicadores simulados locales (en memoria). Para conectarlo a un broker de producción sobre WebSockets:

1.  Abre el archivo [mqttConfig.js](file:///c:/Users/rodri/OneDrive/Escritorio/VisualStudioCode_Projects/DashboardCubesat/src/mqtt/config/mqttConfig.js).
2.  Cambia la constante `USE_REAL_MQTT` a `true`:
    ```javascript
    const USE_REAL_MQTT = true;
    ```
3.  Configura la URL de tu broker (por ejemplo, HiveMQ WebSockets):
    ```javascript
    const REAL_MQTT_BROKER_URL = 'wss://broker.hivemq.com:8884/mqtt';
    ```
4.  Si utilizas un broker real, asegúrate de instalar la dependencia del cliente MQTT (`npm install mqtt`). En caso contrario, el servicio mostrará una advertencia y volverá automáticamente a la simulación.

