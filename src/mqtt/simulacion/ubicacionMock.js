// ── Mock Publisher for GPS / Ubicación Telemetry ──────────────────────────────
// Generates simulated GPS telemetry packets conforming to the exact layout schema.
// Publishes to MqttService on topic 'cempai/cubesat/telemetry/ubicacion' every 0.5s - 1.0s.

import { MqttService } from '../config/mqttConfig';

const TOPIC = 'cempai/cubesat/telemetry/ubicacion';

// Launch/Landing constants (San Miguel, Lima, Peru)
const LAUNCH_LAT = -12.0850;
const LAUNCH_LON = -77.0900;
const LAND_LAT = -12.0780;
const LAND_LON = -77.0850;

// Running states
let packetId = 2000;
let timerId = null;
let simulatedTimeSecs = 0;

export function getUbicacionValueAtTime(secondsElapsed) {
  const cycleTime = secondsElapsed % 65; // 65-second total flight cycle

  let altitud = 0;
  let velocidad_vertical = 0;

  if (cycleTime < 3) {
    // 0-3s: Stage 1 - INICIALIZACIÓN (Ground Launchpad at 0m)
    altitud = 0.0;
    velocidad_vertical = 0.0;
  } else if (cycleTime < 18) {
    // 3-18s: Stage 2 - ASCENSO (Gradually climbs from 0m to 100m over 15s)
    const progress = (cycleTime - 3) / 15;
    altitud = progress * 100.0;
    velocidad_vertical = 6.67;
  } else if (cycleTime < 30) {
    // 18-30s: Stage 3 - DESCENSO (Gradually drops from 100m down to 30m)
    const progress = (cycleTime - 18) / 12;
    altitud = 100.0 - progress * 70.0;
    velocidad_vertical = -5.83;
  } else if (cycleTime < 36) {
    // 30-36s: Stage 4 - PROXIMIDAD AL SUELO (Drops from 30m down to 5m)
    const progress = (cycleTime - 30) / 6;
    altitud = 30.0 - progress * 25.0;
    velocidad_vertical = -4.17;
  } else if (cycleTime < 42) {
    // 36-42s: Stage 5 - ATERRIZADO Touchdown (Drops from 5m down to 0m)
    const progress = (cycleTime - 36) / 6;
    altitud = Math.max(0.0, 5.0 - progress * 5.0);
    velocidad_vertical = -0.83;
  } else {
    // 42-65s: ATERRIZADO Hold (Maintains 0m after landing)
    altitud = 0.0;
    velocidad_vertical = 0.0;
  }

  // Hard clamp altitude between 0m and 100m max
  altitud = Math.min(100.0, Math.max(0.0, altitud));

  // Constants for relative conversion
  const cosLat0 = Math.cos(LAUNCH_LAT * Math.PI / 180);
  const Y_METERS_PER_DEG = 110540;
  const X_METERS_PER_DEG = 111320 * cosLat0;

  const x_land = (LAND_LON - LAUNCH_LON) * X_METERS_PER_DEG;
  const y_land = (LAND_LAT - LAUNCH_LAT) * Y_METERS_PER_DEG;

  // Cartesian coordinates relative to launch (0,0) in meters
  const latJitter = (Math.random() - 0.5) * 0.3;
  const lonJitter = (Math.random() - 0.5) * 0.3;

  let currentX = 0;
  let currentY = 0;

  if (cycleTime < 18) {
    currentX = lonJitter;
    currentY = latJitter;
  } else {
    const descentRatio = Math.min(1, (cycleTime - 18) / 24);
    const waveX = Math.sin(descentRatio * Math.PI * 3) * 45.0 * descentRatio * (1 - descentRatio);
    const waveY = Math.sin(descentRatio * Math.PI * 2) * 120.0 * descentRatio * (1 - descentRatio);
    currentX = descentRatio * x_land + waveX + lonJitter;
    currentY = descentRatio * y_land + waveY + latJitter;
  }

  // Convert back to absolute GPS degrees
  const lat = LAUNCH_LAT + currentY / Y_METERS_PER_DEG;
  const lon = LAUNCH_LON + currentX / X_METERS_PER_DEG;
  const distancia = Math.sqrt(currentX * currentX + currentY * currentY);

  // Velocidad
  let velocidad = 0.0;
  if (cycleTime >= 3 && cycleTime < 18) {
    velocidad = 22.0 + Math.sin(cycleTime * 0.2) * 3.0;
  } else if (cycleTime >= 18 && cycleTime < 42) {
    velocidad = 15.0 + Math.cos(cycleTime * 0.1) * 2.0;
  } else {
    velocidad = 0.0;
  }

  const distClamped = Math.max(0, distancia);
  const satelites = Math.floor(8 + Math.random() * 3);
  const calidad = Math.floor(7 + Math.random() * 4);

  return {
    latitud: parseFloat(lat.toFixed(6)),
    longitud: parseFloat(lon.toFixed(6)),
    altitud: parseFloat(altitud.toFixed(1)),
    velocidad: parseFloat(velocidad.toFixed(1)),
    distancia: parseFloat(distClamped.toFixed(1)),
    velocidad_vertical: parseFloat(velocidad_vertical.toFixed(1)),
    satelites,
    calidad
  };
}

function publishNextPacket() {
  packetId++;

  const rand = Math.random();
  let received = true;
  let crcValido = true;
  let data = null;

  if (rand < 0.08) {
    received = false;
    crcValido = null;
  } else if (rand < 0.10) {
    crcValido = false;
  }

  if (received) {
    const values = getUbicacionValueAtTime(simulatedTimeSecs);
    const now = new Date();

    const dateStr = now.toISOString().split('T')[0];
    const timeStr = now.toISOString().split('T')[1].substring(0, 8);

    data = {
      latitud: { v: values.latitud, hace_seg: 0.0 },
      longitud: { v: values.longitud, hace_seg: 0.0 },
      altitud_gps: { v: values.altitud, hace_seg: 0.0 },
      velocidad_kmh: { v: values.velocidad, hace_seg: 0.0 },
      velocidad_vertical: { v: values.velocidad_vertical, hace_seg: 0.0 },
      satelites: { v: values.satelites, hace_seg: 0.0 },
      hdop: { v: 0.8, hace_seg: 0.0 },
      calidad_senal: { v: values.calidad, hace_seg: 0.0 },
      distancia_origen: { v: values.distancia, hace_seg: 0.0 },
      fecha_utc: dateStr,
      hora_utc: timeStr,
      coordenadas_aterrizaje: { lat: LAND_LAT, lon: LAND_LON }
    };
  }

  const packet = {
    topic: TOPIC,
    packet_id: packetId,
    received,
    crc_valido: crcValido,
    data
  };

  MqttService.publish(TOPIC, packet);
}

export function startUbicacionMockPublisher() {
  if (timerId) return;

  console.log('[MOCK PUBLISHER] Starting telemetry broadcasts to cempai/cubesat/telemetry/ubicacion...');

  const loop = () => {
    const nextDelay = 500 + Math.random() * 500;
    simulatedTimeSecs += nextDelay / 1000.0;

    publishNextPacket();

    timerId = setTimeout(loop, nextDelay);
  };

  loop();
}

export function stopUbicacionMockPublisher() {
  if (timerId) {
    clearTimeout(timerId);
    timerId = null;
    console.log('[MOCK PUBLISHER] Stopped GPS simulation.');
  }
}

if (import.meta.hot) {
  import.meta.hot.dispose(() => {
    stopUbicacionMockPublisher();
  });
}
