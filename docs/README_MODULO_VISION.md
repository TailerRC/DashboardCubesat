# INTEGRACIÓN — MÓDULO "VISIÓN" (Cámara USB + TensorFlow.js)
### Nuevo módulo del dashboard — 100% independiente, sin MQTT ni HiveMQ

---

## 0. IMPORTANTE — Entender qué es esto antes de integrarlo

Este módulo **no es telemetría del CubeSat** y **no debe tener ninguna conexión con MQTT/HiveMQ**. Es un panel de visión por computadora que corre completamente en el navegador:

- La **fuente física real** es la cámara FPV analógica del CubeSat (confirmada en el CDR, sección 3.4 "Cámara FPV con receptor") — esa señal de video va del receptor directo a una pantalla, nunca pasa por el ESP32 ni por MQTT.
- Tu código captura esa pantalla con la **webcam de la laptop** y la procesa con **TensorFlow.js (modelo COCO-SSD)**, todo **local, en el cliente**, sin ningún broker ni topic de por medio.
- Este módulo **no publica ni se suscribe a nada** — es un componente aislado, autocontenido, que no toca `mqttConfig.js` ni ningún hook (`useAmbientalMqtt`, `useUbicacionMqtt`, etc.).
- Los datos que genera (`% vegetación`, `personas`, `vehículos`) se calculan y se muestran **solo en este mismo componente**, no se envían a ningún otro lugar del sistema.

**Decisión de arquitectura:** sección nueva e independiente del sidebar (ej. `"Visión"`), completamente desacoplada de las 6 secciones de telemetría MQTT que ya existen.

---

## 1. QUÉ SE MANTIENE Y QUÉ SE CORRIGE DE TU CÓDIGO ORIGINAL

| Elemento de tu HTML original | Estado |
|---|---|
| Captura de video (`getUserMedia`) | ✅ Se mantiene igual |
| Modelo COCO-SSD (detección de personas/vehículos) | ✅ Se mantiene igual |
| Cálculo de "% vegetación" por conteo de píxeles verdes | ⚠️ Se mantiene, pero **aclarar en la UI que es una heurística simple (conteo de píxeles con predominancia de verde), no un índice de vegetación calibrado tipo NDVI** — para no sobre-representar la precisión del dato |
| Intervalo de `setInterval(..., 100)` (10 fps de análisis) | ⚠️ Revisar rendimiento — corriendo COCO-SSD cada 100ms puede ser pesado según el hardware; se sugiere subir a 300–500ms si se nota lag |
| Todo en un solo archivo HTML con `<script>` inline | 🔁 Se convierte a un **componente React** (`VisionPanel.jsx`) para integrarlo al resto del dashboard, que ya está en React |

---

## 2. COMPONENTE REACT — `src/components/VisionPanel.jsx`

```jsx
import { useEffect, useRef, useState } from 'react';
import * as tf from '@tensorflow/tfjs';
import * as cocoSsd from '@tensorflow-models/coco-ssd';

export default function VisionPanel() {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const modelRef = useRef(null);
  const intervalRef = useRef(null);

  const [modelStatus, setModelStatus] = useState('cargando'); // 'cargando' | 'listo' | 'error'
  const [stats, setStats] = useState({
    vegetacion_pct: 0,
    personas: 0,
    vehiculos: 0
  });

  // ── Cálculo heurístico de vegetación (conteo de píxeles verdes) ──────────
  // NOTA: esto NO es un índice NDVI calibrado, es una aproximación simple
  // basada en el canal de color dominante. Sirve como referencia visual,
  // no como dato científico de cobertura vegetal real.
  function calcularVegetacion(ctx, width, height) {
    const frame = ctx.getImageData(0, 0, width, height);
    const data = frame.data;
    let verdes = 0;
    const total = data.length / 4;

    for (let i = 0; i < data.length; i += 4) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      if (g > r && g > b && g > 100) verdes++;
    }
    return ((verdes / total) * 100).toFixed(2);
  }

  useEffect(() => {
    let stream;

    async function init() {
      try {
        // 1. Activar cámara (webcam de laptop recibiendo el feed FPV proyectado)
        stream = await navigator.mediaDevices.getUserMedia({ video: true });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }

        // 2. Cargar modelo COCO-SSD
        modelRef.current = await cocoSsd.load();
        setModelStatus('listo');

        // 3. Iniciar bucle de detección una vez el video tiene datos
        videoRef.current.onloadeddata = () => {
          intervalRef.current = setInterval(runDetection, 300); // 300ms en vez de 100ms — más liviano
        };
      } catch (err) {
        console.error('[VisionPanel] Error inicializando cámara/modelo:', err);
        setModelStatus('error');
      }
    }

    async function runDetection() {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      if (!video || !canvas || !modelRef.current) return;

      const ctx = canvas.getContext('2d');
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

      let personas = 0;
      let vehiculos = 0;

      const predictions = await modelRef.current.detect(video);

      predictions.forEach(pred => {
        const [x, y, w, h] = pred.bbox;

        if (pred.class === 'person') personas++;
        if (['car', 'truck', 'bus'].includes(pred.class)) vehiculos++;

        if (pred.class === 'person' || ['car', 'truck', 'bus'].includes(pred.class)) {
          ctx.strokeStyle = 'lime';
          ctx.lineWidth = 2;
          ctx.strokeRect(x, y, w, h);

          ctx.strokeStyle = 'red';
          ctx.strokeRect(x, y, w, h * 0.3);

          ctx.fillStyle = 'red';
          ctx.font = '14px monospace';
          ctx.fillText(pred.class, x, y - 5);
        }
      });

      const vegetacion = calcularVegetacion(ctx, canvas.width, canvas.height);

      setStats({
        vegetacion_pct: parseFloat(vegetacion),
        personas,
        vehiculos
      });
    }

    init();

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (stream) stream.getTracks().forEach(track => track.stop());
    };
  }, []);

  return (
    <div style={{ position: 'relative', width: 640, height: 480, margin: '0 auto' }}>
      <video
        ref={videoRef}
        width={640}
        height={480}
        autoPlay
        muted
        style={{ position: 'absolute', left: 0, top: 0 }}
      />
      <canvas
        ref={canvasRef}
        width={640}
        height={480}
        style={{ position: 'absolute', left: 0, top: 0 }}
      />
      <div
        style={{
          position: 'absolute',
          top: 10,
          left: 10,
          background: 'rgba(0,0,0,0.6)',
          color: 'white',
          padding: 10,
          borderRadius: 10,
          fontSize: 14,
          fontFamily: 'monospace',
          zIndex: 10
        }}
      >
        {modelStatus === 'cargando' && '⏳ Cargando modelo de visión...'}
        {modelStatus === 'error' && '⚠️ Error: no se pudo acceder a la cámara'}
        {modelStatus === 'listo' && (
          <>
            🌿 Vegetación (estimada): {stats.vegetacion_pct}% <br />
            👤 Personas detectadas: {stats.personas} <br />
            🚗 Vehículos detectados: {stats.vehiculos}
          </>
        )}
      </div>
    </div>
  );
}
```

---

## 3. INSTALACIÓN DE DEPENDENCIAS

```bash
npm install @tensorflow/tfjs @tensorflow-models/coco-ssd
```

(Reemplaza los `<script src="cdn...">` de tu HTML original — en React se importan como paquetes npm, no como scripts globales.)

---

## 4. CÓMO AGREGARLO AL SIDEBAR DEL DASHBOARD

Siguiendo el mismo patrón visual que las otras secciones (Vista general, Ambiental, Ubicación, Satélite, Misión, Comunicación, Orientación 3D):

1. Agregar una nueva entrada al menú lateral: **`Visión`** (ícono sugerido: cámara/ojo).
2. Crear la ruta/vista que renderiza `<VisionPanel />` a pantalla completa o centrado, igual que las demás secciones.
3. **No** agregar esta sección al header superior fijo (Altitud/Voltaje/Latitud/etc.) — esos datos vienen del pipeline MQTT y no tienen relación con este módulo.
4. **`VisionPanel.jsx` no debe importar `mqttConfig.js` ni ningún hook `useXMqtt`** — es un componente 100% autocontenido, solo usa `useState`/`useRef`/`useEffect` de React y las librerías de TensorFlow. No debe tener ninguna dependencia del resto del sistema de telemetría.

---

## 5. LIMITACIONES A TENER EN CUENTA (para no sobre-prometer en el dashboard)

- El **"% de vegetación"** es un conteo simple de píxeles con predominancia del canal verde — se ve afectado por iluminación, balance de blancos de la cámara, y no distingue vegetación real de cualquier objeto/superficie verde (ropa, plástico, etc.). Debe presentarse en la UI como **estimación aproximada**, no como medición certificada.
- La detección de personas/vehículos con COCO-SSD es un modelo genérico pre-entrenado (no entrenado específicamente con vistas aéreas/FPV) — su precisión puede ser menor que en fotos normales a nivel de calle, especialmente si la cámara del CubeSat mira hacia abajo desde altura.
- Este módulo depende de que la **webcam de la laptop esté literalmente apuntando a la pantalla/monitor** donde se proyecta el video FPV — es una solución de "captura de pantalla física", no una integración digital directa de la señal de video. Cualquier reflejo, ángulo o brillo de la pantalla afecta la calidad de la detección.
